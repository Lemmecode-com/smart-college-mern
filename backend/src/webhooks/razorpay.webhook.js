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

  logger.logInfo("[Multi-Tenant Razorpay Webhook] Webhook received", {
    hasSignature: !!signature,
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

  event = req.body;

  try {
    // ✅ Step 1: Extract college ID from order
    if (event.payload?.order?.entity?.notes?.collegeId) {
      collegeId = event.payload.order.entity.notes.collegeId;
      logger.logInfo("College ID extracted from order metadata", { collegeId });
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
          logger.logInfo("College ID resolved from student record", {
            collegeId,
          });
        }
      }
    }

    if (!collegeId) {
      logger.logError("Cannot determine college ID from webhook event");
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
      logger.logError("Webhook signature verification failed", {
        providedSignature: signature,
        expectedSignature: expectedSignature,
      });
      return res.status(400).json({ error: "Invalid signature" });
    }

    logger.logInfo("Webhook signature verified successfully", { collegeId });

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
        logger.logWarning(`Event type not handled: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.logError("Webhook processing error", {
      error: error.message,
      stack: error.stack,
      collegeId,
    });

    // Check if it's a config error (college may have deleted Razorpay)
    if (error.message.includes("config not found")) {
      logger.logWarning(
        "Razorpay config not found for college - webhook ignored",
        {
          collegeId,
        },
      );
      return res.status(200).json({ received: true });
    }

    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle payment.captured event
 *
 * DUPLICATE PROTECTION LAYERS:
 * 1. Check if installment status is already PAID
 * 2. Check if razorpayPaymentId was already processed (explicit duplicate check)
 * 3. Check if transactionId matches (legacy fallback)
 * 4. Recalculate paidAmount from all PAID installments (source of truth)
 */
async function handlePaymentCaptured(payload, collegeId) {
  const { payment, order } = payload;

  logger.logInfo("[Webhook] payment.captured", {
    paymentId: payment.entity.id,
    orderId: order.entity.id,
    amount: payment.entity.amount,
    status: payment.entity.status,
    collegeId,
  });

  // Find student fee record by Razorpay order ID
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: order.entity.id,
    });
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === order.entity.id,
  );

  if (!installment) {
    logger.logError("Installment not found for order", {
      orderId: order.entity.id,
    });
    return;
  }

  // 🔒 IDEMPOTENCY: Layer 1 - Check if already marked PAID
  if (installment.status === "PAID") {
    logger.logWarning(
      "⚠️ Installment already paid - checking if receipt email was sent",
      {
        installmentId: installment._id,
        orderId: order.entity.id,
        paymentId: payment.entity.id,
      },
    );

    // 📧 WEBHOOK PRIMARY: Ensure receipt email is sent (even if already paid)
    if (!installment.receiptEmailSentAt) {
      try {
        const student = await Student.findById(studentFee.student_id).select(
          "email fullName",
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
            collegeId,
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
            to: student.email,
            installmentId: installment._id,
          });
        }
      } catch (emailError) {
        logger.logWarning(
          "⚠️ Failed to send receipt email (already paid case)",
          {
            error: emailError.message,
            installmentId: installment._id,
          },
        );
      }
    } else {
      logger.logInfo("ℹ️ Receipt email already sent - skipping", {
        installmentId: installment._id,
        emailSentAt: installment.receiptEmailSentAt,
      });
    }

    return;
  }

  // 🔒 IDEMPOTENCY: Layer 2 - Check if this exact Razorpay payment was already processed
  if (installment.razorpayPaymentId === payment.entity.id) {
    logger.logWarning(
      "⚠️ Webhook already processed (duplicate razorpayPaymentId) - skipping",
      {
        installmentId: installment._id,
        razorpayPaymentId: payment.entity.id,
      },
    );
    return;
  }

  // 🔒 IDEMPOTENCY: Layer 3 - Legacy fallback - check transactionId
  if (installment.transactionId === payment.entity.id) {
    logger.logWarning(
      "⚠️ Webhook already processed (duplicate transactionId) - skipping",
      {
        installmentId: installment._id,
        transactionId: payment.entity.id,
      },
    );
    return;
  }

  // 🔒 IDEMPOTENCY: Atomic update to prevent race conditions
  // Only update if status is still PENDING (handles concurrent webhook calls)
  const updateResult = await StudentFee.updateOne(
    {
      _id: studentFee._id,
      "installments._id": installment._id,
      "installments.status": "PENDING", // ← Atomic condition
      "installments.razorpayPaymentId": { $ne: payment.entity.id }, // ← Prevent duplicate payment ID
    },
    {
      $set: {
        "installments.$.status": "PAID",
        "installments.$.paidAt": new Date(),
        "installments.$.transactionId": payment.entity.id,
        "installments.$.paymentGateway": "RAZORPAY",
        "installments.$.razorpayOrderId": order.entity.id,
        "installments.$.razorpayPaymentId": payment.entity.id,
      },
    },
  );

  logger.logInfo("🔒 Atomic webhook update completed", {
    installmentId: installment._id,
    orderId: order.entity.id,
    paymentId: payment.entity.id,
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount,
  });

  // If no documents matched, another webhook already processed this
  if (updateResult.matchedCount === 0) {
    logger.logWarning("⚠️ Webhook race condition prevented", {
      installmentId: installment._id,
      orderId: order.entity.id,
      paymentId: payment.entity.id,
    });
    return; // Exit silently - already processed
  }

  logger.logInfo("✅ Payment recorded atomically via webhook", {
    installmentId: installment._id,
    orderId: order.entity.id,
    paymentId: payment.entity.id,
  });

  // 📧 WEBHOOK PRIMARY: Send receipt email (source of truth)
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName",
    );

    if (student && !installment.receiptEmailSentAt) {
      await sendPaymentReceiptEmail({
        to: student.email,
        studentName: student.fullName,
        installment: {
          name: installment.name,
          amount: installment.amount,
          paidAt: new Date(),
          transactionId: payment.entity.id,
        },
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
        collegeId,
      });

      // Mark email as sent in database
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
        to: student.email,
        installmentId: installment._id,
      });
    } else if (installment.receiptEmailSentAt) {
      logger.logInfo("ℹ️ Receipt email already sent - skipping", {
        installmentId: installment._id,
        emailSentAt: installment.receiptEmailSentAt,
      });
    }
  } catch (emailError) {
    logger.logError("⚠️ Failed to send receipt email", {
      error: emailError.message,
      installmentId: installment._id,
    });
    // Don't fail the webhook if email fails - payment is already recorded
  }
}

/**
 * Handle order.paid event
 *
 * NOTE: This event typically fires after payment.captured.
 * We process it the same way to ensure idempotency.
 *
 * DUPLICATE PROTECTION LAYERS:
 * 1. Check if installment status is already PAID
 * 2. Check if razorpayPaymentId was already processed
 * 3. Recalculate paidAmount from all PAID installments
 */
async function handleOrderPaid(payload, collegeId) {
  const { order } = payload;

  logger.logInfo("[Webhook] order.paid", {
    orderId: order.entity.id,
    status: order.entity.status,
    collegeId,
  });

  // Find student fee record
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: order.entity.id,
    });
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === order.entity.id,
  );

  if (!installment) {
    logger.logError("Installment not found for order", {
      orderId: order.entity.id,
    });
    return;
  }

  // 🔒 DUPLICATE PROTECTION - Layer 1: Check if already marked PAID
  if (installment.status === "PAID") {
    logger.logWarning("Installment already paid - skipping duplicate webhook", {
      installmentId: installment._id,
      orderId: order.entity.id,
    });
    return;
  }

  // 🔒 DUPLICATE PROTECTION - Layer 2: Check if this exact Razorpay payment was already processed
  // order.paid event may include payment information - check for duplicate
  if (order.entity.payments && order.entity.payments.length > 0) {
    const paymentId = order.entity.payments[0].id;

    if (installment.razorpayPaymentId === paymentId) {
      logger.logWarning(
        "Webhook already processed (duplicate razorpayPaymentId) - skipping",
        {
          installmentId: installment._id,
          razorpayPaymentId: paymentId,
        },
      );
      return;
    }

    if (installment.transactionId === paymentId) {
      logger.logWarning(
        "Webhook already processed (duplicate transactionId) - skipping",
        {
          installmentId: installment._id,
          transactionId: paymentId,
        },
      );
      return;
    }

    // ✅ Update installment with payment info from order
    installment.status = "PAID";
    installment.paidAt = new Date(order.entity.paid_at);
    installment.transactionId = paymentId;
    installment.paymentGateway = "RAZORPAY";
    installment.razorpayOrderId = order.entity.id;
    installment.razorpayPaymentId = paymentId;
  } else {
    // Fallback: Mark as paid without specific payment ID
    // This is rare - usually payment.captured fires first with full payment details
    logger.logWarning(
      "order.paid received without payment details - marking as PAID",
      {
        orderId: order.entity.id,
      },
    );
    installment.status = "PAID";
    installment.paidAt = new Date(order.entity.paid_at);
    installment.paymentGateway = "RAZORPAY";
    installment.razorpayOrderId = order.entity.id;
  }

  // 🔒 Recalculate paidAmount from all PAID installments (source of truth)
  studentFee.paidAmount = studentFee.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);

  await studentFee.save();

  logger.logInfo("Payment recorded successfully (order.paid)", {
    installmentId: installment._id,
    orderId: order.entity.id,
    paidAmount: studentFee.paidAmount,
    remainingAmount: studentFee.totalFee - studentFee.paidAmount,
  });

  // 📧 Send receipt email
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName",
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
        collegeId,
      });
      logger.logInfo("Receipt email sent successfully (order.paid)", {
        to: student.email,
        installmentId: installment._id,
      });
    }
  } catch (emailError) {
    logger.logError("Failed to send receipt email (order.paid)", {
      error: emailError.message,
      installmentId: installment._id,
    });
    // Don't fail the webhook if email fails
  }
}

/**
 * Handle payment.failed event
 *
 * Records failure information and keeps status as PENDING for retry.
 */
async function handlePaymentFailed(payload, collegeId) {
  const { payment } = payload;

  logger.logError("[Webhook] payment.failed", {
    paymentId: payment.entity.id,
    orderId: payment.entity.order_id,
    errorCode: payment.entity.error_code,
    errorDescription: payment.entity.error_description,
    collegeId,
  });

  // Find student fee record
  const studentFee = await StudentFee.findOne({
    "installments.razorpayOrderId": payment.entity.order_id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: payment.entity.order_id,
    });
    return;
  }

  const installment = studentFee.installments.find(
    (i) => i.razorpayOrderId === payment.entity.order_id,
  );

  if (!installment) {
    logger.logError("Installment not found for order", {
      orderId: payment.entity.order_id,
    });
    return;
  }

  // Update failure information (keep status as PENDING for retry)
  installment.status = "PENDING"; // Allow retry
  installment.paymentFailureReason = `${payment.entity.error_code}: ${payment.entity.error_description}`;
  installment.paymentAttemptAt = new Date();
  installment.paymentGateway = "RAZORPAY";
  installment.razorpayOrderId = payment.entity.order_id;

  await studentFee.save();

  logger.logInfo("Payment failure recorded", {
    installmentId: installment._id,
    orderId: payment.entity.order_id,
    paymentId: payment.entity.id,
    reason: installment.paymentFailureReason,
  });

  // 📧 Send failure notification email
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName",
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
        collegeId,
      });
      logger.logInfo("Payment failure notification sent", {
        to: student.email,
        installmentId: installment._id,
      });
    }
  } catch (emailError) {
    logger.logError("Failed to send failure notification email", {
      error: emailError.message,
      installmentId: installment._id,
    });
    // Don't fail the webhook if email fails
  }
}
