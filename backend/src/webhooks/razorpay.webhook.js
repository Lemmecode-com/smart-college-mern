const crypto = require("crypto");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { decryptRazorpayKey, decrypt } = require("../utils/encryption.util");
const logger = require("../utils/logger");

/**
 * Get Razorpay instance and webhook secret for a specific college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{razorpay: Object, webhookSecret: string}>}
 */
async function getCollegeRazorpayWebhookConfig(collegeId) {
  const config = await CollegePaymentConfig.findOne({
    collegeId,
    gatewayCode: "razorpay",
    isActive: true,
  });

  if (!config) {
    throw new Error(`Razorpay config not found for college ${collegeId}`);
  }

  // Decrypt secret key and webhook secret
  const keySecret = decryptRazorpayKey(config.credentials.keySecret);
  const webhookSecret = config.credentials.webhookSecret
    ? decrypt(config.credentials.webhookSecret)
    : null;

  return {
    webhookSecret,
    config,
  };
}

/**
 * Extract college ID from Razorpay order metadata
 * @param {Object} order - Razorpay order
 * @returns {string} College ID
 */
function extractCollegeIdFromOrder(order) {
  // Try to get college ID from notes
  if (order.notes?.collegeId) {
    return order.notes.collegeId;
  }

  // Fallback: Look up from student record
  if (order.notes?.studentId) {
    return null; // Will be resolved later
  }

  throw new Error("Cannot determine college ID from order");
}

/**
 * Multi-tenant Razorpay Webhook Handler
 *
 * This handler:
 * 1. Extracts college ID from order metadata
 * 2. Fetches college-specific Razorpay configuration
 * 3. Verifies webhook signature using college's webhook secret
 * 4. Processes the event
 *
 * Supported events:
 * - payment.captured
 * - order.paid
 * - payment.failed
 */
exports.handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  let event;
  let collegeId = null;

  console.log("📍 [Multi-Tenant Razorpay Webhook] Webhook received");
  console.log("  - Signature:", signature ? "Present" : "Missing");

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

  event = req.body;

  try {
    // ✅ Step 1: Extract college ID from order
    if (event.payload?.order?.entity?.notes?.collegeId) {
      collegeId = event.payload.order.entity.notes.collegeId;
      console.log("  - College ID from order metadata:", collegeId);
    } else if (event.payload?.payment?.entity?.order_id) {
      // If collegeId not in notes, look up from order
      const orderId = event.payload.payment.entity.order_id;
      const studentFee = await StudentFee.findOne({
        "installments.razorpayOrderId": orderId,
      });

      if (studentFee) {
        const student = await Student.findById(studentFee.student_id);
        if (student) {
          collegeId = student.college_id.toString();
          console.log("  - College ID from student record:", collegeId);
        }
      }
    }

    if (!collegeId) {
      console.error("❌ Cannot determine college ID from webhook event");
      return res.status(400).json({ error: "College ID not found" });
    }

    // ✅ Step 2: Get college-specific webhook secret
    const { webhookSecret } = await getCollegeRazorpayWebhookConfig(collegeId);

    // ✅ Step 3: Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Webhook signature verification failed");
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log("✅ Webhook signature verified");

    // ✅ Step 4: Process event based on type
    switch (event.event) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload, collegeId);
        break;

      case "order.paid":
        await handleOrderPaid(event.payload, collegeId);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload, collegeId);
        break;

      default:
        console.log(`⚪ Event type not handled: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error.message);

    // Check if it's a config error (college may have deleted Razorpay)
    if (error.message.includes("config not found")) {
      console.error(
        "⚠️ Razorpay config not found for college - webhook ignored"
      );
      return res.status(200).json({ received: true });
    }

    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payload, collegeId) {
  const { payment, order } = payload;

  console.log("🟢 [Webhook] payment.captured");
  console.log("  - Payment ID:", payment.entity.id);
  console.log("  - Order ID:", order.entity.id);
  console.log("  - Amount:", payment.entity.amount);
  console.log("  - Status:", payment.entity.status);

  // Find student fee record by Razorpay order ID
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    console.error("❌ StudentFee not found for order:", order.entity.id);
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === order.entity.id
  );

  if (!installment) {
    console.error("❌ Installment not found for order:", order.entity.id);
    return;
  }

  // 🔥 If already paid → skip (idempotency)
  if (installment.status === "PAID") {
    console.log("🟡 Installment already paid - skipping duplicate webhook");
    return;
  }

  // Update installment status
  installment.status = "PAID";
  installment.paidAt = new Date();
  installment.transactionId = payment.entity.id;
  installment.paymentGateway = "RAZORPAY";
  installment.razorpayOrderId = order.entity.id;

  // Recalculate paid amount
  studentFee.paidAmount = studentFee.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);

  await studentFee.save();

  console.log(`✅ Payment recorded for installment ${installment._id}`);

  // 📧 Send receipt email
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName"
    );

    if (student) {
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
      console.log(`✅ Receipt email sent to ${student.email}`);
    }
  } catch (emailError) {
    console.error("❌ Failed to send receipt email:", emailError.message);
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(payload, collegeId) {
  const { order } = payload;

  console.log("🟢 [Webhook] order.paid");
  console.log("  - Order ID:", order.entity.id);
  console.log("  - Status:", order.entity.status);

  // Find student fee record
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    console.error("❌ StudentFee not found for order:", order.entity.id);
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === order.entity.id
  );

  if (!installment) {
    console.error("❌ Installment not found for order:", order.entity.id);
    return;
  }

  // If already paid, skip
  if (installment.status === "PAID") {
    console.log("🟡 Installment already paid - skipping duplicate webhook");
    return;
  }

  // Note: payment.captured usually fires before order.paid
  // We'll let payment.captured handle the actual update
  console.log("⚪ order.paid received - waiting for payment.captured");
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload, collegeId) {
  const { payment } = payload;

  console.log("🔴 [Webhook] payment.failed");
  console.log("  - Payment ID:", payment.entity.id);
  console.log("  - Order ID:", payment.entity.order_id);
  console.log("  - Reason:", payment.entity.error_description);
  console.log("  - Error Code:", payment.entity.error_code);

  // Find student fee record
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": payment.entity.order_id,
  });

  if (!studentFee) {
    console.error(
      "❌ StudentFee not found for order:",
      payment.entity.order_id
    );
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === payment.entity.order_id
  );

  if (!installment) {
    console.error(
      "❌ Installment not found for order:",
      payment.entity.order_id
    );
    return;
  }

  // Update failure information (keep status as PENDING for retry)
  installment.paymentFailureReason = `${payment.entity.error_code}: ${payment.entity.error_description}`;
  installment.paymentAttemptAt = new Date();
  installment.status = "PENDING"; // Allow retry

  await studentFee.save();

  console.log(
    `✅ Payment failure recorded for installment ${installment._id}`
  );

  // 📧 Send failure notification email
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName"
    );

    if (student) {
      await sendPaymentReceiptEmail({
        to: student.email,
        studentName: student.fullName,
        installment: {
          name: installment.name,
          amount: installment.amount,
        },
        failure: {
          errorCode: payment.entity.error_code,
          errorDescription: payment.entity.error_description,
        },
      });
      console.log(
        `⚠️ Payment failure notification sent to ${student.email}`
      );
    }
  } catch (emailError) {
    console.error(
      "❌ Failed to send failure notification email:",
      emailError.message
    );
  }
}
