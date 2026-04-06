const Stripe = require("stripe");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { decryptStripeKey } = require("../utils/encryption.util");
const logger = require("../utils/logger");

/**
 * Get Stripe instance and webhook secret for a specific college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{stripe: Stripe, webhookSecret: string}>}
 */
async function getCollegeStripeWebhookConfig(collegeId) {
  const config = await CollegePaymentConfig.findOne({
    collegeId,
    gatewayCode: "stripe",
    isActive: true,
  });

  if (!config) {
    throw new Error(`Stripe config not found for college ${collegeId}`);
  }

  // Decrypt secrets
  const secretKey = decryptStripeKey(config.credentials.keySecret);
  const webhookSecret = config.credentials.webhookSecret
    ? decryptStripeKey(config.credentials.webhookSecret)
    : null;

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });

  return {
    stripe,
    webhookSecret,
    config,
  };
}

/**
 * Multi-tenant Stripe Webhook Handler
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  let collegeId = null;

  logger.logInfo("Webhook received", {
    hasSignature: !!sig,
    ip: req.ip,
  });

  // Handle raw body from express.raw() middleware
  let rawBody;
  if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
    try {
      req.body = JSON.parse(rawBody.toString("utf8"));
    } catch (parseError) {
      logger.logError("Failed to parse webhook body", {
        error: parseError.message,
        ip: req.ip,
      });
      return res.status(400).send("Invalid JSON body");
    }
  } else {
    rawBody = Buffer.from(JSON.stringify(req.body));
  }

  try {
    // First, try to extract college ID from the payload
    if (req.body && req.body.type === "checkout.session.completed") {
      const session = req.body.data?.object;
      collegeId = session?.metadata?.collegeId;

      // If no collegeId in metadata, try to resolve from studentId
      if (!collegeId && session?.metadata?.studentId) {
        const student = await Student.findById(session.metadata.studentId);
        if (student) {
          collegeId = student.college_id?.toString();
        }
      }
    }

    // ✅ Step 1: Verify webhook signature
    if (collegeId) {
      // Get college-specific Stripe config
      const { stripe, webhookSecret } =
        await getCollegeStripeWebhookConfig(collegeId);

      if (webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          logger.logInfo("Webhook signature verified (college-specific)", {
            collegeId,
          });
        } catch (err) {
          logger.logError("Webhook signature verification failed", {
            error: err.message,
            collegeId,
          });
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        logger.logError("No webhook secret configured for college", {
          collegeId,
        });
        return res
          .status(400)
          .send("Webhook secret not configured for this college");
      }
    } else {
      // Fallback: Try to verify with global webhook secret (for backward compatibility)
      const globalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (globalWebhookSecret && sig) {
        const globalStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: "2023-10-16",
        });

        try {
          event = globalStripe.webhooks.constructEvent(
            rawBody,
            sig,
            globalWebhookSecret,
          );
          logger.logInfo("Webhook signature verified (global fallback)");
        } catch (err) {
          logger.logError("Global webhook signature verification failed", {
            error: err.message,
          });
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        logger.logError(
          "No webhook secret configured — cannot verify signature",
        );
        return res.status(400).send("Webhook secret not configured");
      }
    }

    // ✅ Step 2: Handle the event
    logger.logInfo(`Event received: ${event.type}`);

    switch (event.type) {
      /* ========================================
         CHECKOUT SESSION COMPLETED
         Student completed payment on Stripe
      ======================================== */
      case "checkout.session.completed": {
        logger.logInfo("Processing checkout.session.completed", {
          sessionId: event.data.object?.id,
          studentId: event.data.object?.metadata?.studentId,
        });

        const session = event.data.object;
        const { studentId, installmentName } = session.metadata;

        if (!studentId || !installmentName) {
          logger.logError("Missing metadata in session", {
            studentId,
            installmentName,
          });
          return res.status(400).send("Missing metadata");
        }

        // Find student fee record
        const studentFee = await StudentFee.findOne({
          student_id: studentId,
        });

        if (!studentFee) {
          logger.logError("Fee record not found for student", { studentId });
          return res.status(404).send("Fee record not found");
        }

        // Find the specific installment
        const installment = studentFee.installments.find(
          (i) => i.name === installmentName,
        );

        if (!installment) {
          logger.logError("Installment not found", { installmentName });
          return res.status(404).send("Installment not found");
        }

        // Check if already paid (DUPLICATE EVENT PROTECTION)
        if (installment.status === "PAID") {
          logger.logWarning("Installment already paid (duplicate webhook)", {
            studentId,
            installmentName,
          });
          return res.send("Already paid");
        }

        // Additional duplicate protection: check if stripeSessionId already matches
        if (installment.stripeSessionId === session.id) {
          logger.logWarning(
            "Webhook already processed (duplicate session ID)",
            {
              studentId,
              stripeSessionId: session.id,
            },
          );
          return res.send("Already processed");
        }

        // ✅ Mark installment as PAID
        installment.status = "PAID";
        installment.paidAt = new Date();
        installment.transactionId = session.payment_intent;
        installment.paymentGateway = "STRIPE";
        installment.stripeSessionId = session.id;

        // Recalculate total paid amount
        studentFee.paidAmount = studentFee.installments
          .filter((i) => i.status === "PAID")
          .reduce((sum, i) => sum + i.amount, 0);

        await studentFee.save();

        logger.logInfo("Payment recorded in database", {
          studentId,
          paidAmount: studentFee.paidAmount,
          remaining: studentFee.totalFee - studentFee.paidAmount,
        });

        // ✅ Send receipt email to student
        try {
          const student = await Student.findById(studentId).populate(
            "college_id",
            "name email",
          );
          if (student) {
            await sendPaymentReceiptEmail({
              to: student.email,
              studentName: student.fullName,
              installment,
              totalFee: studentFee.totalFee,
              paidAmount: studentFee.paidAmount,
              remainingAmount: studentFee.totalFee - studentFee.paidAmount,
            });
            logger.logInfo("Receipt email sent", { to: student.email });
          }
        } catch (emailErr) {
          logger.logWarning("Failed to send receipt email", {
            error: emailErr.message,
            studentId,
          });
          // Don't fail the webhook if email fails
        }

        break;
      }

      /* ========================================
         PAYMENT INTENT SUCCEEDED
         Payment confirmed by Stripe
      ======================================== */
      case "payment_intent.succeeded": {
        logger.logInfo("Processing payment_intent.succeeded", {
          paymentIntentId: event.data.object?.id,
        });
        break;
      }

      /* ========================================
         PAYMENT INTENT PAYMENT FAILED
         Payment failed - Update installment status
      ======================================== */
      case "payment_intent.payment_failed": {
        logger.logError("Processing payment_intent.payment_failed", {
          paymentIntentId: event.data.object?.id,
        });

        const paymentIntent = event.data.object;
        const { studentId, installmentName } = paymentIntent.metadata;

        // Update installment status to FAILED if we have metadata
        if (studentId && installmentName) {
          try {
            const studentFee = await StudentFee.findOne({
              student_id: studentId,
            });

            if (!studentFee) break;

            const installment = studentFee.installments.find(
              (i) => i.name === installmentName,
            );

            if (installment && installment.status !== "PAID") {
              installment.status = "FAILED";
              installment.failureReason =
                paymentIntent.last_payment_error?.message;
              installment.failedAt = new Date();
              await studentFee.save();

              logger.logInfo("Installment marked as FAILED", {
                studentId,
                installmentName,
              });
            }
          } catch (error) {
            logger.logError("Error updating failed payment", {
              error: error.message,
              studentId,
            });
          }
        }

        break;
      }

      default:
        logger.logWarning(`Unhandled event type: ${event.type}`);
    }

    // ✅ Step 3: Acknowledge receipt
    logger.logInfo("Webhook processed successfully");
    res.json({ received: true });
  } catch (error) {
    logger.logError("Webhook handler error", {
      error: error.message,
    });
    // Return 500 to Stripe so they retry
    return res.status(500).send("Webhook handler failed");
  }
};
