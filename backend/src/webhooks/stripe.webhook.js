const Stripe = require("stripe");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { decryptStripeKey, decrypt } = require("../utils/encryption.util");

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
      console.error("❌ Failed to parse webhook body:", parseError.message);
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
          console.log("  - Resolved collegeId from student:", collegeId);
        }
      }
    }

    console.log(
      "  - College ID:",
      collegeId || "Not determined (using fallback)",
    );

    // ✅ Step 1: Verify webhook signature
    if (collegeId) {
      // Get college-specific Stripe config
      const { stripe, webhookSecret } =
        await getCollegeStripeWebhookConfig(collegeId);

      if (webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          console.log("✅ Webhook signature verified (college-specific)");
        } catch (err) {
          console.error(
            "❌ Webhook signature verification failed:",
            err.message,
          );
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        console.log(
          "⚠️  No webhook secret configured for this college, skipping verification",
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
          console.log("✅ Webhook signature verified (global fallback)");
        } catch (err) {
          console.error(
            "❌ Global webhook signature verification failed:",
            err.message,
          );
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        // No signature verification (for testing)
        console.log(
          "⚠️  Skipping signature verification (no secret configured)",
        );
        event = req.body;
      }
    }

    // ✅ Step 2: Handle the event
    console.log(`📍 Event received: ${event.type}`);

    switch (event.type) {
      /* ========================================
         CHECKOUT SESSION COMPLETED
         Student completed payment on Stripe
      ======================================== */
      case "checkout.session.completed": {
        console.log("💰 Processing checkout.session.completed");

        const session = event.data.object;
        console.log("  - Session ID:", session.id);
        console.log("  - Payment Status:", session.payment_status);
        console.log("  - Amount:", session.amount_total / 100);
        console.log("  - Currency:", session.currency);

        // Extract metadata
        const {
          studentId,
          installmentName,
          collegeId: metadataCollegeId,
        } = session.metadata;
        console.log("  - Student ID:", studentId);
        console.log("  - Installment:", installmentName);
        console.log("  - College ID (from metadata):", metadataCollegeId);

        if (!studentId || !installmentName) {
          console.error("❌ Missing metadata in session");
          return res.status(400).send("Missing metadata");
        }

        // Find student fee record
        const studentFee = await StudentFee.findOne({
          student_id: studentId,
        });

        if (!studentFee) {
          console.error("❌ Fee record not found for student:", studentId);
          return res.status(404).send("Fee record not found");
        }

        console.log("✅ Fee record found");

        // Find the specific installment
        const installment = studentFee.installments.find(
          (i) => i.name === installmentName,
        );

        if (!installment) {
          console.error("❌ Installment not found:", installmentName);
          return res.status(404).send("Installment not found");
        }

        console.log("✅ Installment found:", installment.name);

        // Check if already paid
        if (installment.status === "PAID") {
          console.log("⏭️  Installment already paid");
          return res.send("Already paid");
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

        console.log("✅ Payment recorded in database");
        console.log("  - Paid Amount:", studentFee.paidAmount);
        console.log(
          "  - Remaining:",
          studentFee.totalFee - studentFee.paidAmount,
        );

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
            console.log("✅ Receipt email sent to:", student.email);
          }
        } catch (emailErr) {
          console.error("⚠️  Failed to send receipt email:", emailErr.message);
          // Don't fail the webhook if email fails
        }

        break;
      }

      /* ========================================
         PAYMENT INTENT SUCCEEDED
         Payment confirmed by Stripe
      ======================================== */
      case "payment_intent.succeeded": {
        console.log("💰 Processing payment_intent.succeeded");

        const paymentIntent = event.data.object;
        console.log("  - Payment Intent ID:", paymentIntent.id);
        console.log("  - Amount:", paymentIntent.amount / 100);

        // Optional: Additional handling if needed
        // Usually checkout.session.completed is enough

        break;
      }

      /* ========================================
         PAYMENT INTENT PAYMENT FAILED
         Payment failed
      ======================================== */
      case "payment_intent.payment_failed": {
        console.log("❌ Processing payment_intent.payment_failed");

        const paymentIntent = event.data.object;
        console.log("  - Payment Intent ID:", paymentIntent.id);
        console.log(
          "  - Failure Message:",
          paymentIntent.last_payment_error?.message,
        );

        // Optional: Update installment status to FAILED
        // This requires extracting studentId from metadata

        break;
      }

      /* ========================================
         OTHER EVENTS
         Add more handlers as needed
      ======================================== */
      default:
        console.log(`⏭️  Unhandled event type: ${event.type}`);
    }

    // ✅ Step 3: Acknowledge receipt
    console.log("✅ Webhook processed successfully");
    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler error:", error.message);
    console.error(error.stack);

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

  console.log("📍 [Legacy Webhook] Webhook received");

  if (endpointSecret && sig) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("✅ Webhook signature verified");
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    console.log("⚠️  Skipping signature verification");
    event = req.body;
  }

  // Process event (same logic as above)
  console.log(`📍 Event received: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { studentId, installmentName } = session.metadata;

    if (!studentId || !installmentName) {
      return res.status(400).send("Missing metadata");
    }

    const studentFee = await StudentFee.findOne({
      student_id: studentId,
    });

    if (!studentFee) {
      return res.status(404).send("Fee record not found");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment || installment.status === "PAID") {
      return res.send(installment ? "Already paid" : "Installment not found");
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
    }
  }

  res.json({ received: true });
};
