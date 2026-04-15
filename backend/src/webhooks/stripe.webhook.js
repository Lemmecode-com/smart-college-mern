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

    // ✅ Step 1: Validate college ID is present (multi-tenant requirement)
    if (!collegeId) {
      logger.logError("Webhook rejected - cannot determine college ID", {
        eventType: req.body?.type,
        ip: req.ip,
      });
      return res
        .status(400)
        .send(
          "Missing college ID in webhook payload. Each college must configure their own Stripe webhook.",
        );
    }

    // ✅ Step 2: Get college-specific Stripe config
    const { stripe, webhookSecret } =
      await getCollegeStripeWebhookConfig(collegeId);

    // ✅ Step 3: Validate webhook secret is configured
    if (!webhookSecret) {
      logger.logError("Webhook secret not configured for college", {
        collegeId,
      });
      return res
        .status(400)
        .send(
          "Webhook secret not configured for this college. Please configure webhook secret in college admin dashboard.",
        );
    }

    // ✅ Step 4: Verify webhook signature using college-specific secret
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      logger.logInfo("Webhook signature verified (college-specific)", {
        collegeId,
        eventType: event.type,
      });
    } catch (err) {
      logger.logError("Webhook signature verification failed", {
        error: err.message,
        collegeId,
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
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

        // 🔒 IDEMPOTENCY: Check if already paid (DUPLICATE EVENT PROTECTION - Layer 1)
        if (installment.status === "PAID") {
          logger.logWarning(
            "⚠️ Installment already paid - checking if receipt email was sent",
            {
              studentId,
              installmentName,
              sessionId: session.id,
            },
          );

          // 📧 WEBHOOK PRIMARY: Always ensure receipt email is sent (even if already paid)
          // This handles case where confirm-payment endpoint processed first but didn't send email
          try {
            const student = await Student.findById(studentId).populate(
              "college_id",
              "name email",
            );

            if (student && !installment.receiptEmailSentAt) {
              await sendPaymentReceiptEmail({
                to: student.email,
                studentName: student.fullName,
                installment: {
                  name: installment.name,
                  amount: installment.amount,
                  paidAt: installment.paidAt,
                  transactionId: installment.transactionId,
                },
                totalFee: studentFee.totalFee,
                paidAmount: studentFee.paidAmount,
                remainingAmount: studentFee.totalFee - studentFee.paidAmount,
              });

              // Mark email as sent
              await StudentFee.updateOne(
                {
                  _id: studentFee._id,
                  "installments._id": installment._id,
                },
                {
                  $set: {
                    "installments.$.receiptEmailSentAt": new Date(),
                  },
                },
              );

              logger.logInfo("✅ Receipt email sent (already paid case)", {
                studentId,
                to: student.email,
              });
            } else if (installment.receiptEmailSentAt) {
              logger.logInfo("ℹ️ Receipt email already sent - skipping", {
                studentId,
                emailSentAt: installment.receiptEmailSentAt,
              });
            }
          } catch (emailErr) {
            logger.logWarning(
              "⚠️ Failed to send receipt email (already paid case)",
              {
                error: emailErr.message,
                studentId,
              },
            );
            // Don't fail the webhook if email fails
          }

          return res.send("Already paid (email checked)");
        }

        // 🔒 IDEMPOTENCY: Check if stripeSessionId already matches (Layer 2)
        if (installment.stripeSessionId === session.id) {
          logger.logWarning(
            "⚠️ Webhook already processed (duplicate session ID)",
            {
              studentId,
              stripeSessionId: session.id,
            },
          );
          return res.send("Already processed");
        }

        // 🔒 IDEMPOTENCY: Atomic update to prevent race conditions
        // Only update if status is still PENDING (handles concurrent webhook calls)
        const updateResult = await StudentFee.updateOne(
          {
            _id: studentFee._id,
            "installments._id": installment._id,
            "installments.status": "PENDING", // ← Atomic condition
            "installments.stripeSessionId": { $ne: session.id }, // ← Prevent duplicate session processing
          },
          {
            $set: {
              "installments.$.status": "PAID",
              "installments.$.paidAt": new Date(),
              "installments.$.transactionId": session.payment_intent,
              "installments.$.paymentGateway": "STRIPE",
              "installments.$.stripeSessionId": session.id,
            },
          },
        );

        logger.logInfo("🔒 Atomic webhook update completed", {
          studentId,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          sessionId: session.id,
        });

        // If no documents matched, another webhook already processed this
        if (updateResult.matchedCount === 0) {
          logger.logWarning("⚠️ Webhook race condition prevented", {
            studentId,
            installmentName,
            sessionId: session.id,
          });
          return res.send("Already processed (race condition prevented)");
        }

        logger.logInfo("✅ Payment recorded atomically via webhook", {
          studentId,
          sessionId: session.id,
          paymentIntent: session.payment_intent,
        });

        // 📧 WEBHOOK PRIMARY: Send receipt email (source of truth)
        try {
          const student = await Student.findById(studentId).populate(
            "college_id",
            "name email",
          );
          if (student) {
            await sendPaymentReceiptEmail({
              to: student.email,
              studentName: student.fullName,
              installment: {
                name: installment.name,
                amount: installment.amount,
                paidAt: new Date(),
                transactionId: session.payment_intent,
              },
              totalFee: studentFee.totalFee,
              paidAmount: studentFee.paidAmount,
              remainingAmount: studentFee.totalFee - studentFee.paidAmount,
            });

            // Mark email as sent in database (tracks that webhook sent it)
            await StudentFee.updateOne(
              {
                _id: studentFee._id,
                "installments._id": installment._id,
              },
              {
                $set: {
                  "installments.$.receiptEmailSentAt": new Date(),
                },
              },
            );

            logger.logInfo("✅ Receipt email sent by webhook (primary)", {
              studentId,
              to: student.email,
            });
          }
        } catch (emailErr) {
          logger.logWarning("⚠️ Failed to send receipt email", {
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
