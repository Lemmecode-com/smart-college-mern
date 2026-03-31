const Stripe = require("stripe");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { decryptStripeKey, decrypt } = require("../utils/encryption.util");
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

  // Decrypt secret key and webhook secret
  const secretKey = decryptStripeKey(config.credentials.keySecret);
  const webhookSecret = config.credentials.webhookSecret
    ? decrypt(config.credentials.webhookSecret)
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
 * Extract college ID from Stripe session metadata
 * @param {Object} session - Stripe checkout session
 * @returns {string} College ID
 */
function extractCollegeIdFromSession(session) {
  // Try to get college ID from metadata
  if (session.metadata?.collegeId) {
    return session.metadata.collegeId;
  }

  // Fallback: Look up from student record
  if (session.metadata?.studentId) {
    return null; // Will be resolved later
  }

  throw new Error("Cannot determine college ID from session");
}

/**
 * Multi-tenant Stripe Webhook Handler
 *
 * This handler:
 * 1. Extracts college ID from session metadata
 * 2. Fetches college-specific Stripe configuration
 * 3. Verifies webhook signature using college's webhook secret
 * 4. Processes the event using college's Stripe instance
 *
 * Supported events:
 * - checkout.session.completed
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  let collegeId = null;

  console.log("📍 [Multi-Tenant Webhook] Webhook received");
  console.log("  - Signature:", sig ? "Present" : "Missing");

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
    // First, try to extract college ID from the payload to get the right config
    // We need to parse the body to get metadata, but we haven't verified signature yet
    // This is safe because we're just reading metadata, not trusting the data

    if (req.body && req.body.type === "checkout.session.completed") {
      const session = req.body.data?.object;
      collegeId = session?.metadata?.collegeId;

      // If no collegeId in metadata, try to resolve from studentId
      if (!collegeId && session?.metadata?.studentId) {
        const student = await Student.findById(session.metadata.studentId);
        if (student) {
          collegeId = student.college_id?.toString();
          logger.logInfo("Resolved collegeId from student", { collegeId });
        }
      }
    }

    logger.logInfo("Webhook college identification", {
      collegeId: collegeId || "Not determined (using fallback)",
    });

    // ✅ Step 1: Verify webhook signature
    if (collegeId) {
      // Get college-specific Stripe config
      const { stripe, webhookSecret } =
        await getCollegeStripeWebhookConfig(collegeId);

      if (webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          logger.logInfo("Webhook signature verified (college-specific)");
        } catch (err) {
          logger.logError("Webhook signature verification failed", {
            error: err.message,
            collegeId,
          });
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        logger.logWarning(
          "No webhook secret configured for this college, skipping verification",
        );
        event = req.body;
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
        // No signature verification (for testing)
        logger.logWarning(
          "Skipping signature verification (no secret configured)",
        );
        event = req.body;
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
        logger.logInfo("Session details", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          amount: session.amount_total / 100,
          currency: session.currency,
        });

        // Extract metadata
        const {
          studentId,
          installmentName,
          collegeId: metadataCollegeId,
        } = session.metadata;
        logger.logInfo("Session metadata", {
          studentId,
          installmentName,
          metadataCollegeId,
        });

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

        logger.logInfo("Fee record found", { studentId });

        // Find the specific installment
        const installment = studentFee.installments.find(
          (i) => i.name === installmentName,
        );

        if (!installment) {
          logger.logError("Installment not found", { installmentName });
          return res.status(404).send("Installment not found");
        }

        logger.logInfo("Installment found", { name: installment.name });

        // Check if already paid (DUPLICATE EVENT PROTECTION)
        if (installment.status === "PAID") {
          logger.logWarning("Installment already paid (duplicate webhook)", {
            studentId,
            installmentName,
            stripeSessionId: installment.stripeSessionId,
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
          amount: event.data.object?.amount / 100,
        });

        const paymentIntent = event.data.object;
        logger.logInfo("Payment intent details", {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
        });

        // Optional: Additional handling if needed
        // Usually checkout.session.completed is enough

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

        logger.logInfo("Payment failure details", {
          paymentIntentId: paymentIntent.id,
          failureMessage: paymentIntent.last_payment_error?.message,
          studentId,
          installmentName,
        });

        // Update installment status to FAILED if we have metadata
        if (studentId && installmentName) {
          try {
            const studentFee = await StudentFee.findOne({
              student_id: studentId,
            });

            if (!studentFee) {
              logger.logWarning("Fee record not found for failed payment", {
                studentId,
              });
              break;
            }

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
                failureReason: paymentIntent.last_payment_error?.message,
              });
            }
          } catch (error) {
            logger.logError("Error updating failed payment", {
              error: error.message,
              studentId,
              installmentName,
            });
          }
        } else {
          logger.logWarning("Cannot update failed payment - missing metadata", {
            studentId,
            installmentName,
          });
        }

        break;
      }

      /* ========================================
         OTHER EVENTS
         Add more handlers as needed
      ======================================== */
      default:
        logger.logWarning(`Unhandled event type: ${event.type}`);
    }

    // ✅ Step 3: Acknowledge receipt
    logger.logInfo("Webhook processed successfully");
    res.json({ received: true });
  } catch (error) {
    logger.logError("Webhook handler error", {
      error: error.message,
      stack: error.stack,
    });

    // Return 500 to Stripe so they retry
    return res.status(500).send("Webhook handler failed");
  }
};

/**
 * Legacy single-tenant webhook handler (for backward compatibility)
 * @deprecated Use handleStripeWebhook instead
 */
exports.handleLegacyWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  logger.logInfo("[Legacy Webhook] Webhook received");

  if (endpointSecret && sig) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      logger.logInfo("Webhook signature verified");
    } catch (err) {
      logger.logError("Webhook signature verification failed", {
        error: err.message,
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    logger.logWarning("Skipping signature verification");
    event = req.body;
  }

  // Process event (same logic as above)
  logger.logInfo(`Event received: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { studentId, installmentName } = session.metadata;

    if (!studentId || !installmentName) {
      logger.logError("Missing metadata in session", {
        studentId,
        installmentName,
      });
      return res.status(400).send("Missing metadata");
    }

    const studentFee = await StudentFee.findOne({
      student_id: studentId,
    });

    if (!studentFee) {
      logger.logError("Fee record not found for student", { studentId });
      return res.status(404).send("Fee record not found");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment || installment.status === "PAID") {
      logger.logWarning("Installment already paid or not found", {
        studentId,
        installmentName,
        status: installment?.status,
      });
      return res.send(installment ? "Already paid" : "Installment not found");
    }

    // Check for duplicate processing
    if (installment.stripeSessionId === session.id) {
      logger.logWarning("Duplicate webhook session ID", {
        studentId,
        stripeSessionId: session.id,
      });
      return res.send("Already processed");
    }

    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.transactionId = session.payment_intent;
    installment.paymentGateway = "STRIPE";
    installment.stripeSessionId = session.id;

    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    logger.logInfo("Payment recorded in database (legacy webhook)", {
      studentId,
      paidAmount: studentFee.paidAmount,
    });

    const student = await Student.findById(studentId);
    if (student) {
      await sendPaymentReceiptEmail({
        to: student.email,
        studentName: student.fullName,
        installment,
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      });
      logger.logInfo("Receipt email sent (legacy webhook)", {
        to: student.email,
      });
    }
  }

  logger.logInfo("Legacy webhook processed successfully");
  res.json({ received: true });
};
