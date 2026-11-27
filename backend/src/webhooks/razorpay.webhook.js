const crypto = require("crypto");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const emailService = require("../services/email.service");
const { decryptRazorpayKey, decrypt } = require("../utils/encryption.util");
const logger = require("../utils/logger");

/**
 * Get Razorpay instance and webhook secret for a specific college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{webhookSecret: string, config: Object}>}
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

  // Decrypt webhook secret
  const webhookSecret = config.credentials?.webhookSecret
    ? decrypt(config.credentials.webhookSecret)
    : null;

  return {
    webhookSecret,
    config,
  };
}

/**
 * Atomically claim receipt email sending permission for an installment.
 * Prevents concurrent webhooks/requests from sending duplicate receipt emails.
 * @param {string|ObjectId} studentFeeId
 * @param {string|ObjectId} installmentId
 * @returns {Promise<Document|null>}
 */
async function claimReceiptEmail(studentFeeId, installmentId) {
  return await StudentFee.findOneAndUpdate(
    {
      _id: studentFeeId,
      installments: {
        $elemMatch: {
          _id: installmentId,
          $or: [
            { receiptEmailSentAt: null },
            { receiptEmailSentAt: { $exists: false } },
          ],
        },
      },
    },
    {
      $set: {
        "installments.$.receiptEmailSentAt": new Date(),
      },
    },
    { new: true },
  );
}

/**
 * Recalculate paidAmount from all PAID installments and persist to DB (source of truth).
 * @param {string|ObjectId} studentFeeId
 * @returns {Promise<Document|null>}
 */
async function recalculateAndPersistPaidAmount(studentFeeId) {
  const fee = await StudentFee.findById(studentFeeId);
  if (!fee) return null;
  const paidAmount = fee.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);
  fee.paidAmount = paidAmount;
  await fee.save();
  return fee;
}

/**
 * Multi-tenant Razorpay Webhook Handler
 *
 * This handler:
 * 1. Extracts college ID from order/payment metadata or resolves from student fee
 * 2. Fetches college-specific Razorpay configuration
 * 3. Verifies webhook signature using timing-safe HMAC comparison with college's secret
 * 4. Processes the event idempotently
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

  if (!signature) {
    logger.logError("Missing Razorpay signature header", { ip: req.ip });
    return res.status(400).json({ error: "Missing signature" });
  }

  // Handle raw body (captured via express.json verify callback as req.rawBody)
  let rawBody;
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    rawBody = req.rawBody;
  } else if (Buffer.isBuffer(req.body)) {
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
    rawBody = Buffer.from(JSON.stringify(req.body || {}));
  }

  event = req.body;

  try {
    // ✅ Step 1: Extract college ID from order/payment metadata
    if (event.payload?.order?.entity?.notes?.collegeId) {
      collegeId = event.payload.order.entity.notes.collegeId;
      logger.logInfo("College ID extracted from order metadata", { collegeId });
    } else if (event.payload?.payment?.entity?.notes?.collegeId) {
      collegeId = event.payload.payment.entity.notes.collegeId;
      logger.logInfo("College ID extracted from payment notes", { collegeId });
    } else if (event.payload?.payment?.entity?.order_id) {
      const orderId = event.payload.payment.entity.order_id;
      const studentFee = await StudentFee.findOne({
        "installments.razorpayOrderId": orderId,
      });

      if (studentFee) {
        if (studentFee.college_id) {
          collegeId = studentFee.college_id.toString();
        } else {
          const student = await Student.findById(studentFee.student_id);
          if (student) {
            collegeId = student.college_id.toString();
          }
        }
        logger.logInfo("College ID resolved from fee/student record", {
          collegeId,
        });
      }
    }

    if (!collegeId) {
      logger.logError("Cannot determine college ID from webhook event");
      return res.status(400).json({ error: "College ID not found" });
    }

    // ✅ Step 2: Get college-specific webhook secret
    const { webhookSecret } = await getCollegeRazorpayWebhookConfig(collegeId);

    if (!webhookSecret) {
      logger.logError("Webhook secret not configured for college", { collegeId });
      return res.status(400).json({
        error:
          "Webhook secret not configured for this college. Please configure webhook secret in college admin dashboard.",
      });
    }

    // ✅ Step 3: Verify webhook signature using timing-safe comparison
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expectedSignature, "utf8");

    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
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
 * 1. Scope query by college_id
 * 2. Validate amount and currency (INR)
 * 3. Layer 1: Check if installment status is already PAID -> recalculate paidAmount, claim & send receipt email if unsent
 * 4. Layer 2: Check if razorpayPaymentId was already processed
 * 5. Layer 3: Check if transactionId matches
 * 6. Atomic update with status: PENDING condition
 * 7. Recalculate paidAmount from all PAID installments (source of truth)
 * 8. Atomic claim and dispatch for receipt email
 */
async function handlePaymentCaptured(payload, collegeId) {
  const { payment, order } = payload;

  logger.logInfo("[Webhook] payment.captured", {
    paymentId: payment.entity.id,
    orderId: order.entity.id,
    amount: payment.entity.amount,
    currency: payment.entity.currency,
    status: payment.entity.status,
    collegeId,
  });

  // Find student fee record by Razorpay order ID scoped by college_id
  const studentFee = await StudentFee.findOne({
    college_id: collegeId,
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: order.entity.id,
      collegeId,
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

  // Validate payment amount (paise) and currency
  const expectedAmountInPaise = Math.round(installment.amount * 100);
  if (
    payment.entity.amount !== expectedAmountInPaise ||
    payment.entity.currency !== "INR"
  ) {
    logger.logError("Payment amount or currency mismatch", {
      expectedAmount: expectedAmountInPaise,
      actualAmount: payment.entity.amount,
      expectedCurrency: "INR",
      actualCurrency: payment.entity.currency,
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

    // Recalculate and persist paidAmount from all PAID installments to ensure consistency
    const updatedFee = await recalculateAndPersistPaidAmount(studentFee._id);

    // 📧 WEBHOOK PRIMARY: Ensure receipt email is sent atomically (even if already paid)
    const claimed = await claimReceiptEmail(studentFee._id, installment._id);
    if (claimed) {
      try {
        const student = await Student.findById(studentFee.student_id).select(
          "email fullName",
        );
        const college = await College.findById(collegeId).select(
          "name email gstin state",
        );

        if (student) {
          await emailService.sendPaymentReceiptEmail({
            to: student.email,
            studentName: student.fullName,
            installment: {
              name: installment.name,
              amount: installment.amount,
              baseAmount:
                installment.baseAmount !== undefined
                  ? installment.baseAmount
                  : installment.taxBreakdown?.taxableBase || installment.amount,
              gstAmount:
                installment.gstAmount !== undefined
                  ? installment.gstAmount
                  : installment.taxBreakdown?.totalTax || 0,
              taxBreakdown: installment.taxBreakdown || null,
              paidAt: installment.paidAt,
              transactionId: installment.transactionId || payment.entity.id,
            },
            totalFee: updatedFee?.totalFee ?? studentFee.totalFee,
            paidAmount: updatedFee?.paidAmount ?? studentFee.paidAmount,
            remainingAmount:
              (updatedFee?.totalFee ?? studentFee.totalFee) -
              (updatedFee?.paidAmount ?? studentFee.paidAmount),
            collegeId,
            collegeGstin: college?.gstin || null,
          });

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
      logger.logInfo("ℹ️ Receipt email already sent/claimed - skipping", {
        installmentId: installment._id,
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
    await recalculateAndPersistPaidAmount(studentFee._id);
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
    await recalculateAndPersistPaidAmount(studentFee._id);
    return;
  }

  // 🔒 IDEMPOTENCY: Atomic update to prevent race conditions
  // Only update if status is still PENDING (handles concurrent webhook calls)
  const updateResult = await StudentFee.updateOne(
    {
      _id: studentFee._id,
      college_id: collegeId,
      "installments._id": installment._id,
      "installments.status": "PENDING", // ← Atomic condition
      "installments.razorpayPaymentId": { $ne: payment.entity.id },
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

  // If no documents matched, another webhook or verify request already processed this
  if (updateResult.matchedCount === 0) {
    logger.logWarning("⚠️ Webhook race condition prevented", {
      installmentId: installment._id,
      orderId: order.entity.id,
      paymentId: payment.entity.id,
    });
    await recalculateAndPersistPaidAmount(studentFee._id);
    return; // Exit silently - already processed
  }

  // 🔒 Recalculate paidAmount from all PAID installments (source of truth)
  const updatedFee = await recalculateAndPersistPaidAmount(studentFee._id);

  logger.logInfo("✅ Payment recorded atomically via webhook", {
    installmentId: installment._id,
    orderId: order.entity.id,
    paymentId: payment.entity.id,
    paidAmount: updatedFee?.paidAmount,
  });

  // 📧 WEBHOOK PRIMARY: Atomically claim and send receipt email (source of truth)
  const claimed = await claimReceiptEmail(studentFee._id, installment._id);
  if (claimed) {
    try {
      const student = await Student.findById(studentFee.student_id).select(
        "email fullName",
      );
      const college = await College.findById(collegeId).select(
        "name email gstin state",
      );

      if (student) {
        await emailService.sendPaymentReceiptEmail({
          to: student.email,
          studentName: student.fullName,
          installment: {
            name: installment.name,
            amount: installment.amount,
            baseAmount:
              installment.baseAmount !== undefined
                ? installment.baseAmount
                : installment.taxBreakdown?.taxableBase || installment.amount,
            gstAmount:
              installment.gstAmount !== undefined
                ? installment.gstAmount
                : installment.taxBreakdown?.totalTax || 0,
            taxBreakdown: installment.taxBreakdown || null,
            paidAt: new Date(),
            transactionId: payment.entity.id,
          },
          totalFee: updatedFee?.totalFee ?? studentFee.totalFee,
          paidAmount: updatedFee?.paidAmount ?? studentFee.paidAmount,
          remainingAmount:
            (updatedFee?.totalFee ?? studentFee.totalFee) -
            (updatedFee?.paidAmount ?? studentFee.paidAmount),
          collegeId,
          collegeGstin: college?.gstin || null,
        });

        logger.logInfo("✅ Receipt email sent by webhook (primary)", {
          to: student.email,
          installmentId: installment._id,
        });
      }
    } catch (emailError) {
      logger.logError("⚠️ Failed to send receipt email", {
        error: emailError.message,
        installmentId: installment._id,
      });
      // Don't fail the webhook if email fails - payment is already recorded
    }
  } else {
    logger.logInfo("ℹ️ Receipt email already claimed/sent - skipping", {
      installmentId: installment._id,
    });
  }
}

/**
 * Handle order.paid event
 *
 * NOTE: This event typically fires after payment.captured.
 * We process it with idempotency guards and atomic email claim.
 */
async function handleOrderPaid(payload, collegeId) {
  const { order } = payload;

  logger.logInfo("[Webhook] order.paid", {
    orderId: order.entity.id,
    status: order.entity.status,
    collegeId,
  });

  // Find student fee record scoped by college_id
  const studentFee = await StudentFee.findOne({
    college_id: collegeId,
    "installments.razorpayOrderId": order.entity.id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: order.entity.id,
      collegeId,
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
    logger.logWarning("Installment already paid - checking receipt email", {
      installmentId: installment._id,
      orderId: order.entity.id,
    });

    // Recalculate paidAmount to ensure consistency
    const updatedFee = await recalculateAndPersistPaidAmount(studentFee._id);

    // Attempt atomic email claim and send if not yet sent
    const claimed = await claimReceiptEmail(studentFee._id, installment._id);
    if (claimed) {
      try {
        const student = await Student.findById(studentFee.student_id).select(
          "email fullName",
        );
        const college = await College.findById(collegeId).select(
          "name email gstin state",
        );

        if (student) {
          await emailService.sendPaymentReceiptEmail({
            to: student.email,
            studentName: student.fullName,
            installment: {
              name: installment.name,
              amount: installment.amount,
              baseAmount:
                installment.baseAmount !== undefined
                  ? installment.baseAmount
                  : installment.taxBreakdown?.taxableBase || installment.amount,
              gstAmount:
                installment.gstAmount !== undefined
                  ? installment.gstAmount
                  : installment.taxBreakdown?.totalTax || 0,
              taxBreakdown: installment.taxBreakdown || null,
              paidAt: installment.paidAt,
              transactionId: installment.transactionId,
            },
            totalFee: updatedFee?.totalFee ?? studentFee.totalFee,
            paidAmount: updatedFee?.paidAmount ?? studentFee.paidAmount,
            remainingAmount:
              (updatedFee?.totalFee ?? studentFee.totalFee) -
              (updatedFee?.paidAmount ?? studentFee.paidAmount),
            collegeId,
            collegeGstin: college?.gstin || null,
          });
          logger.logInfo("✅ Receipt email sent successfully (order.paid already paid)", {
            to: student.email,
            installmentId: installment._id,
          });
        }
      } catch (emailError) {
        logger.logError("Failed to send receipt email (order.paid already paid)", {
          error: emailError.message,
          installmentId: installment._id,
        });
      }
    }
    return;
  }

  const paymentId =
    order.entity.payments && order.entity.payments.length > 0
      ? order.entity.payments[0].id
      : null;

  if (
    paymentId &&
    (installment.razorpayPaymentId === paymentId ||
      installment.transactionId === paymentId)
  ) {
    logger.logWarning(
      "Webhook already processed (duplicate razorpayPaymentId/transactionId) - skipping",
      {
        installmentId: installment._id,
        paymentId,
      },
    );
    await recalculateAndPersistPaidAmount(studentFee._id);
    return;
  }

  // Atomic update
  const updateQuery = {
    _id: studentFee._id,
    college_id: collegeId,
    "installments._id": installment._id,
    "installments.status": "PENDING",
  };
  if (paymentId) {
    updateQuery["installments.razorpayPaymentId"] = { $ne: paymentId };
  }

  const updateSet = {
    "installments.$.status": "PAID",
    "installments.$.paidAt": order.entity.paid_at
      ? new Date(order.entity.paid_at * 1000)
      : new Date(),
    "installments.$.paymentGateway": "RAZORPAY",
    "installments.$.razorpayOrderId": order.entity.id,
  };
  if (paymentId) {
    updateSet["installments.$.transactionId"] = paymentId;
    updateSet["installments.$.razorpayPaymentId"] = paymentId;
  }

  const updateResult = await StudentFee.updateOne(updateQuery, {
    $set: updateSet,
  });

  if (updateResult.matchedCount === 0) {
    logger.logWarning("⚠️ Webhook race condition prevented (order.paid)", {
      installmentId: installment._id,
      orderId: order.entity.id,
    });
    await recalculateAndPersistPaidAmount(studentFee._id);
    return;
  }

  // Recalculate paidAmount
  const updatedFee = await recalculateAndPersistPaidAmount(studentFee._id);

  logger.logInfo("Payment recorded successfully (order.paid)", {
    installmentId: installment._id,
    orderId: order.entity.id,
    paidAmount: updatedFee?.paidAmount,
    remainingAmount:
      (updatedFee?.totalFee ?? studentFee.totalFee) -
      (updatedFee?.paidAmount ?? studentFee.paidAmount),
  });

  // 📧 Send receipt email with atomic claim
  const claimed = await claimReceiptEmail(studentFee._id, installment._id);
  if (claimed) {
    try {
      const student = await Student.findById(studentFee.student_id).select(
        "email fullName",
      );
      const college = await College.findById(collegeId).select(
        "name email gstin state",
      );

      if (student) {
        await emailService.sendPaymentReceiptEmail({
          to: student.email,
          studentName: student.fullName,
          installment: {
            name: installment.name,
            amount: installment.amount,
            baseAmount:
              installment.baseAmount !== undefined
                ? installment.baseAmount
                : installment.taxBreakdown?.taxableBase || installment.amount,
            gstAmount:
              installment.gstAmount !== undefined
                ? installment.gstAmount
                : installment.taxBreakdown?.totalTax || 0,
            taxBreakdown: installment.taxBreakdown || null,
            paidAt: new Date(),
            transactionId: paymentId || order.entity.id,
          },
          totalFee: updatedFee?.totalFee ?? studentFee.totalFee,
          paidAmount: updatedFee?.paidAmount ?? studentFee.paidAmount,
          remainingAmount:
            (updatedFee?.totalFee ?? studentFee.totalFee) -
            (updatedFee?.paidAmount ?? studentFee.paidAmount),
          collegeId,
          collegeGstin: college?.gstin || null,
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
    }
  }
}

/**
 * Handle payment.failed event
 *
 * Records failure information and keeps status as PENDING for retry.
 * Prevents reverting an installment that is already PAID.
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

  // Find student fee record scoped by college_id
  const studentFee = await StudentFee.findOne({
    college_id: collegeId,
    "installments.razorpayOrderId": payment.entity.order_id,
  });

  if (!studentFee) {
    logger.logError("StudentFee not found for order", {
      orderId: payment.entity.order_id,
      collegeId,
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

  // 🔒 CRITICAL: Prevent reverting an installment that is already PAID
  if (installment.status === "PAID") {
    logger.logWarning(
      "⚠️ Payment failed event received for already PAID installment - ignoring",
      {
        orderId: payment.entity.order_id,
        paymentId: payment.entity.id,
      },
    );
    return;
  }

  // Atomic update: only update if status is NOT PAID
  const updateResult = await StudentFee.updateOne(
    {
      _id: studentFee._id,
      college_id: collegeId,
      "installments._id": installment._id,
      "installments.status": { $ne: "PAID" },
    },
    {
      $set: {
        "installments.$.status": "PENDING",
        "installments.$.paymentFailureReason": `${payment.entity.error_code}: ${payment.entity.error_description}`,
        "installments.$.paymentAttemptAt": new Date(),
        "installments.$.paymentGateway": "RAZORPAY",
        "installments.$.razorpayOrderId": payment.entity.order_id,
      },
    },
  );

  if (updateResult.matchedCount === 0) {
    logger.logWarning(
      "⚠️ Installment status was already PAID or not matched - skipping failure update",
      {
        orderId: payment.entity.order_id,
        paymentId: payment.entity.id,
      },
    );
    return;
  }

  logger.logInfo("Payment failure recorded", {
    installmentId: installment._id,
    orderId: payment.entity.order_id,
    paymentId: payment.entity.id,
    reason: `${payment.entity.error_code}: ${payment.entity.error_description}`,
  });

  // 📧 Send failure notification email
  try {
    const student = await Student.findById(studentFee.student_id).select(
      "email fullName",
    );

    if (student) {
      await emailService.sendPaymentReceiptEmail({
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
  }
}