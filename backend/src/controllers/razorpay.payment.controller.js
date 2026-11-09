const mongoose = require("mongoose");
const collegeRazorpayService = require("../services/collegeRazorpay.service");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Course = require("../models/course.model");
const emailService = require("../services/email.service");
const { getActiveStudentFee } = require("../services/studentFee.service");
const AppError = require("../utils/AppError");
const crypto = require("crypto");
const logger = require("../utils/logger");

/**
 * Process payment verification after installment is found
 * Helper function to avoid code duplication
 */
async function processPaymentVerification(
  studentFee,
  installment,
  razorpay_order_id,
  razorpay_payment_id,
  student,
  res,
  next,
) {
  try {
    const installmentId = installment._id;
    const installmentObjId = new mongoose.Types.ObjectId(installmentId);

    // 🔥 If already paid or duplicate payment ID -> return existing data idempotently (Layer 1 & 2)
    if (
      installment.status === "PAID" ||
      installment.razorpayPaymentId === razorpay_payment_id ||
      installment.transactionId === razorpay_payment_id
    ) {
      logger.logWarning("🟡 Installment already paid or duplicate payment ID", {
        studentFeeId: studentFee._id,
        installmentId: installment._id,
        paymentId: razorpay_payment_id,
      });

      const currentPaid =
        studentFee.paidAmount !== undefined && studentFee.paidAmount !== null
          ? studentFee.paidAmount
          : studentFee.installments
              .filter((i) => i.status === "PAID")
              .reduce((sum, i) => sum + i.amount, 0);

      return res.json({
        valid: true,
        alreadyPaid: true,
        installment: {
          _id: installment._id,
          installmentName: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId || razorpay_payment_id,
          status: "PAID",
          paymentGateway: installment.paymentGateway || "RAZORPAY",
        },
        totalFee: studentFee.totalFee,
        paidAmount: currentPaid,
        remainingAmount: studentFee.totalFee - currentPaid,
      });
    }

    /* =========================
       ATOMIC UPDATE PAYMENT STATUS (IDEMPOTENT & SINGLE ROUND-TRIP)
       Single findOneAndUpdate with aggregation pipeline conditioned on status PENDING.
       Recomputes installments, paidAmount, and paymentStatus atomically.
    ========================== */

    logger.logInfo("🔒 Performing atomic payment status update", {
      studentFeeId: studentFee._id,
      installmentId: installment._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });

    const updatedStudentFee = await StudentFee.findOneAndUpdate(
      {
        _id: studentFee._id,
        college_id: studentFee.college_id,
        installments: {
          $elemMatch: {
            _id: installmentObjId,
            status: "PENDING",
          },
        },
      },
      [
        {
          $set: {
            installments: {
              $map: {
                input: "$installments",
                as: "inst",
                in: {
                  $cond: [
                    { $eq: ["$$inst._id", installmentObjId] },
                    {
                      $mergeObjects: [
                        "$$inst",
                        {
                          status: "PAID",
                          paidAt: "$$NOW",
                          transactionId: razorpay_payment_id,
                          paymentGateway: "RAZORPAY",
                          razorpayOrderId: razorpay_order_id,
                          razorpayPaymentId: razorpay_payment_id,
                        },
                      ],
                    },
                    "$$inst",
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            paidAmount: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$installments",
                      as: "inst",
                      cond: { $eq: ["$$inst.status", "PAID"] },
                    },
                  },
                  as: "paidInst",
                  in: "$$paidInst.amount",
                },
              },
            },
          },
        },
        {
          $set: {
            paymentStatus: {
              $cond: [
                { $gte: ["$paidAmount", "$totalFee"] },
                "PAID",
                {
                  $cond: [
                    { $gt: ["$paidAmount", 0] },
                    "PARTIAL",
                    "PENDING",
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: true, updatePipeline: true },
    );

    // If update returned null, installment was already paid concurrently (race condition handled)
    if (!updatedStudentFee) {
      logger.logWarning(
        "⚠️ Payment update skipped - installment already paid or not found",
        {
          studentFeeId: studentFee._id,
          installmentId: installment._id,
        },
      );

      const latestFee = await StudentFee.findById(studentFee._id);
      const latestInst =
        latestFee?.installments.id(installment._id) || installment;
      const latestPaidAmount = latestFee?.paidAmount ?? studentFee.paidAmount;

      return res.json({
        valid: true,
        alreadyPaid: true,
        installment: {
          _id: latestInst._id,
          installmentName: latestInst.name,
          amount: latestInst.amount,
          paidAt: latestInst.paidAt,
          transactionId: latestInst.transactionId || razorpay_payment_id,
          status: latestInst.status || "PAID",
          paymentGateway: latestInst.paymentGateway || "RAZORPAY",
        },
        totalFee: latestFee?.totalFee ?? studentFee.totalFee,
        paidAmount: latestPaidAmount,
        remainingAmount:
          (latestFee?.totalFee ?? studentFee.totalFee) - latestPaidAmount,
      });
    }

    const updatedInstallment =
      updatedStudentFee.installments.id(installment._id) || installment;
    const paidAmount = updatedStudentFee.paidAmount;

    logger.logInfo("✅ Payment verified and recorded atomically in single query", {
      studentId: student._id,
      studentFeeId: updatedStudentFee._id,
      totalFee: updatedStudentFee.totalFee,
      paidAmount: paidAmount,
      paymentStatus: updatedStudentFee.paymentStatus,
      remaining: updatedStudentFee.totalFee - paidAmount,
    });

    // 📧 Send payment confirmation email (non-blocking in background)
    (async () => {
      try {
        const claimed = await StudentFee.findOneAndUpdate(
          {
            _id: updatedStudentFee._id,
            installments: {
              $elemMatch: {
                _id: installment._id,
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

        if (!claimed) {
          logger.logInfo("ℹ️ Receipt email already claimed/sent - skipping", {
            studentId: student._id,
            installmentId: installment._id,
          });
          return;
        }

        const college = await College.findById(student.college_id).select(
          "name email gstin state",
        );

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
            paidAt: updatedInstallment?.paidAt || new Date(),
            transactionId: razorpay_payment_id,
          },
          totalFee: updatedStudentFee.totalFee,
          paidAmount: paidAmount,
          remainingAmount: updatedStudentFee.totalFee - paidAmount,
          collegeId: student.college_id,
          collegeGstin: college?.gstin || null,
        });
        logger.logInfo("✅ Payment receipt email sent", {
          studentId: student._id,
          installmentId: installment._id,
        });
      } catch (emailError) {
        logger.logError("❌ Failed to send payment receipt email", {
          error: emailError.message,
          studentId: student._id,
        });
      }
    })();

    return res.json({
      valid: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      installment: {
        _id: installment._id,
        installmentName: installment.name,
        amount: installment.amount,
        paidAt: updatedInstallment?.paidAt || new Date(),
        transactionId: razorpay_payment_id,
        status: "PAID",
        paymentGateway: "RAZORPAY",
      },
      totalFee: updatedStudentFee.totalFee,
      paidAmount: paidAmount,
      remainingAmount: updatedStudentFee.totalFee - paidAmount,
    });
  } catch (error) {
    logger.logError("❌ [processPaymentVerification] Error", {
      error: error.message,
      errorCode: error.code,
    });
    return next(error);
  }
}

/**
 * Create Razorpay order using college-specific Razorpay configuration
 * @route POST /api/razorpay/create-order
 * @access Private (Student)
 */
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const userId = req.user.id; // User._id from JWT token
    const collegeId = req.college_id;
    const { installmentName } = req.body;

    logger.logInfo("🔵 [Razorpay Payment] Creating order", {
      userId,
      collegeId,
      installmentName,
    });

    // ✅ VALIDATION: Ensure collegeId is present
    if (!collegeId) {
      logger.logError(
        "❌ [createRazorpayOrder] collegeId is missing from request",
        {
          userId,
          hasReqCollege: !!req.college,
        },
      );
      throw new AppError(
        "College information missing. Please login again or contact support.",
        400,
        "COLLEGE_ID_MISSING",
      );
    }

    // ✅ Step 1: Find student by user_id
    const student = await Student.findOne({
      user_id: userId,
    });

    logger.logInfo("🟢 Student lookup result", {
      found: !!student,
      studentId: student?._id,
      studentName: student?.fullName,
    });

    if (!student) {
      logger.logError("❌ Student not found for user_id", { userId });
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ Step 2: Find active student fee record using student._id
    const studentFee = await getActiveStudentFee(student._id, collegeId, { student });

    logger.logInfo("🟢 StudentFee lookup result", {
      found: !!studentFee,
      totalFee: studentFee?.totalFee,
      installmentsCount: studentFee?.installments.length,
    });

    if (!studentFee) {
      logger.logError("❌ StudentFee not found", { studentId: student._id });
      throw new AppError(
        "Student fee record not found",
        404,
        "FEE_RECORD_NOT_FOUND",
      );
    }

    // ✅ Step 3: Find the specific installment
    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING",
    );

    logger.logInfo("🟢 Installment lookup result", {
      found: !!installment,
      name: installment?.name,
      amount: installment?.amount,
      status: installment?.status,
    });
    if (!installment) {
      logger.logError("❌ Installment not found", {
        installmentName,
        availableInstallments: studentFee.installments.map((i) => ({
          name: i.name,
          status: i.status,
        })),
      });
    }

    if (!installment) {
      throw new AppError(
        "Invalid or already paid installment",
        404,
        "INSTALLMENT_NOT_FOUND",
      );
    }

    // Validate installment order: Previous installments must be paid
    const installmentOrder = installment.order || 0;
    if (installmentOrder > 1) {
      const unpaidPrevious = studentFee.installments.some(
        (i) => i.order < installmentOrder && i.status !== "PAID",
      );
      if (unpaidPrevious) {
        throw new AppError(
          "Cannot pay this installment. Previous installments are still pending.",
          400,
          "PREVIOUS_INSTALLMENTS_PENDING",
        );
      }
    }

    // 🔒 RECOVERY: Check if there's already an active order for this installment
    // ⚠️ IMPORTANT: Get config FIRST to ensure we have keyId for all response paths
    let keyId;
    try {
      const razorpayConfig = await collegeRazorpayService.getCollegeRazorpayConfig(collegeId);
      keyId = razorpayConfig.config.credentials.keyId;
      logger.logInfo("✅ [createRazorpayOrder] Razorpay config obtained", {
        keyId,
      });
    } catch (configError) {
      logger.logError(
        "❌ [createRazorpayOrder] Failed to get Razorpay configuration",
        {
          error: configError.message,
          errorCode: configError.code,
        },
      );
      if (configError.code === "RAZORPAY_NOT_CONFIGURED") {
        throw new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "RAZORPAY_NOT_CONFIGURED",
        );
      }
      throw configError;
    }

    // Now check for existing order (with keyId available)
    if (installment.razorpayOrderId) {
      try {
        const razorpay = await collegeRazorpayService.getRazorpayInstance(collegeId);
        const existingOrder = await razorpay.orders.fetch(
          installment.razorpayOrderId,
        );

        if (existingOrder.status === "created") {
          // Order still active, return existing order WITH keyId
          logger.logWarning(
            "🟡 Found existing Razorpay order (status: created), reusing",
            {
              orderId: existingOrder.id,
            },
          );
          return res.json({
            orderId: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            keyId: keyId, // ← CRITICAL: Include keyId
            isExisting: true,
          });
        } else if (existingOrder.status === "paid") {
          // Order was completed but installment still shows PENDING
          logger.logWarning(
            "🟡 Order already completed, but installment still shows PENDING",
            {
              orderId: existingOrder.id,
              installmentId: installment._id,
            },
          );
          installment.status = "PAID";
          installment.transactionId = existingOrder.receipt;
          installment.paidAt = new Date();
          await studentFee.save();

          return res.json({
            orderId: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            keyId: keyId, // ← Include keyId
            alreadyPaid: true,
          });
        }
      } catch (error) {
        // Order not found or expired, continue with new order
        logger.logWarning(
          "🟡 Creating new order - previous one expired or invalid",
          {
            previousOrderId: installment.razorpayOrderId,
          },
        );
      }
    }

    // ✅ Step 5: Get Razorpay instance using the config
    // (keyId already obtained above)
    logger.logInfo("🔵 [createRazorpayOrder] Getting Razorpay instance");
    let razorpay;
    try {
      razorpay = await collegeRazorpayService.getRazorpayInstance(collegeId);
      logger.logInfo("✅ [createRazorpayOrder] Razorpay instance obtained");
    } catch (razorpayInitError) {
      logger.logError(
        "❌ [createRazorpayOrder] Failed to get Razorpay instance",
        {
          errorName: razorpayInitError.name,
          error: razorpayInitError.message,
          errorCode: razorpayInitError.code,
          statusCode: razorpayInitError.statusCode,
        },
      );

      if (razorpayInitError.code === "RAZORPAY_INIT_FAILED") {
        throw new AppError(
          "Failed to initialize payment gateway. Please try again later.",
          500,
          "PAYMENT_INIT_FAILED",
        );
      }

      // Re-throw with more context
      const wrappedError = new Error(
        `Failed to initialize Razorpay: ${razorpayInitError.message}`,
      );
      wrappedError.code = razorpayInitError.code || "RAZORPAY_INIT_FAILED";
      wrappedError.statusCode = razorpayInitError.statusCode || 500;
      wrappedError.cause = razorpayInitError;
      throw wrappedError;
    }

    // ✅ Step 5: Create Razorpay order
    logger.logInfo("🔵 [createRazorpayOrder] Creating Razorpay order", {
      amountInPaise: installment.amount * 100,
      installmentId: installment._id,
      installmentName: installment.name,
      amount: installment.amount,
      collegeId: collegeId.toString(),
      studentId: student._id.toString(),
    });

    // Validate amount before creating order
    if (!installment.amount || installment.amount <= 0) {
      logger.logError("❌ [createRazorpayOrder] Invalid installment amount", {
        amount: installment.amount,
        typeofAmount: typeof installment.amount,
      });
      throw new AppError("Invalid payment amount", 400, "INVALID_AMOUNT");
    }

    const amountInPaise = installment.amount * 100;

    // TEMP DIAGNOSTIC: Log complete order creation context before calling Razorpay API.
    // Remove after identifying BAD_REQUEST_ERROR reason.
    logger.logInfo("🔵 [createRazorpayOrder] Pre-flight diagnostics", {
      amount: installment.amount,
      typeofAmount: typeof installment.amount,
      amountInPaise,
      keyId,
      keyIdPrefix: keyId ? keyId.slice(0, 8) : undefined,
      isTestKey: keyId ? keyId.startsWith("rzp_test_") : undefined,
      isLiveKey: keyId ? keyId.startsWith("rzp_live_") : undefined,
      collegeId: collegeId.toString(),
    });

    let order;
    try {
      // 🔒 IDEMPOTENCY: Generate unique receipt ID to prevent duplicate orders
      // Format: fee_{studentId}_{installmentId}_{hourTimestamp}
      // Hour-based timestamp ensures new order each hour while preventing duplicates within same hour
      const hourTimestamp = Math.floor(Date.now() / (60 * 60 * 1000));
      const uniqueReceiptId = `fee_${student._id.toString().slice(-6)}_${installment._id.toString().slice(-6)}_${hourTimestamp}`;

      logger.logInfo("🔒 Generated idempotency key for Razorpay order", {
        receiptId: uniqueReceiptId,
        studentId: student._id,
        installmentId: installment._id,
        length: uniqueReceiptId.length,
      });

      order = await razorpay.orders.create({
        amount: installment.amount * 100, // Amount in paise
        currency: "INR",
        receipt: uniqueReceiptId, // ← Acts as idempotency key (Razorpay uses receipt for deduplication)
        notes: {
          studentId: student._id.toString(),
          collegeId: collegeId.toString(),
          installmentName: installment.name,
          studentFeeId: studentFee._id.toString(),
          installmentId: installment._id.toString(),
        },
      });
      logger.logInfo("✅ Razorpay order created with idempotency", {
        orderId: order.id,
        receiptId: uniqueReceiptId,
      });
    } catch (orderCreateError) {
      logger.logError(
        "❌ [createRazorpayOrder] Failed to create Razorpay order",
        {
          errorName: orderCreateError.name,
          error: orderCreateError.message,
          errorCode: orderCreateError.code,
          statusCode: orderCreateError.statusCode,
          responseData: orderCreateError.response?.data,
          fullError: JSON.stringify(orderCreateError, null, 2),
        },
      );

      const wrappedError = new Error(
        `Failed to create payment order: ${orderCreateError.error?.description || orderCreateError.message || "Unknown error"}`,
      );
      wrappedError.code =
        orderCreateError.code ||
        orderCreateError.error?.code ||
        "RAZORPAY_ORDER_CREATE_FAILED";
      wrappedError.statusCode = orderCreateError.statusCode || 500;
      wrappedError.cause = orderCreateError;
      throw wrappedError;
    }

    // 🔒 RECOVERY: Store order ID for tracking
    // CRITICAL FIX: Use findByIdAndUpdate with arrayFilters to ensure nested update persists
    logger.logInfo(
      "🔵 [createRazorpayOrder] Saving razorpayOrderId to database",
      {
        orderId: order.id,
        studentFeeId: studentFee._id.toString(),
        installmentId: installment._id.toString(),
      },
    );

    try {
      const installmentToUpdate = studentFee.installments.id(installment._id);
      if (installmentToUpdate) {
        installmentToUpdate.razorpayOrderId = order.id;
        installmentToUpdate.paymentAttemptAt = new Date();

        await studentFee.save();
        logger.logInfo(
          "✅ [createRazorpayOrder] razorpayOrderId saved via save()",
          {
            orderId: order.id,
          },
        );
      } else {
        logger.logError(
          "❌ [createRazorpayOrder] Installment not found in array!",
          {
            installmentId: installment._id.toString(),
          },
        );
        throw new AppError(
          "Installment not found in fee record",
          500,
          "INSTALLMENT_NOT_IN_ARRAY",
        );
      }
    } catch (saveError) {
      logger.logError(
        "❌ [createRazorpayOrder] Failed to save razorpayOrderId",
        {
          error: saveError.message,
        },
      );
      throw new AppError(
        "Failed to save payment order. Please try again.",
        500,
        "ORDER_SAVE_FAILED",
      );
    }

    logger.logInfo("✅ Razorpay order ID saved and verified", {
      orderId: order.id,
    });

    // ✅ Validate keyId before sending response
    if (!keyId) {
      logger.logError(
        "❌ [createRazorpayOrder] keyId is undefined after config fetch!",
      );
      throw new AppError(
        "Payment gateway configuration error. Please contact support.",
        500,
        "RAZORPAY_KEY_MISSING",
      );
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
    });
  } catch (error) {
    logger.logError("❌ [createRazorpayOrder] Error caught", {
      errorName: error.name,
      error: error.message,
      errorCode: error.code,
      statusCode: error.statusCode,
    });

    // Ensure we always have a proper error object
    const safeError =
      error instanceof Error
        ? error
        : new Error(String(error || "Unknown error"));
    const errorCode = error.code || safeError.code || "UNKNOWN_ERROR";
    const errorStatus = error.statusCode || safeError.statusCode || 500;

    // Handle Razorpay-specific errors
    if (errorCode === "RAZORPAY_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "RAZORPAY_NOT_CONFIGURED",
        ),
      );
    }
    if (errorCode === "DECRYPTION_FAILED") {
      return next(
        new AppError(
          "Payment configuration error. Please contact support.",
          500,
          "PAYMENT_CONFIG_ERROR",
        ),
      );
    }
    if (errorCode === "RAZORPAY_INIT_FAILED") {
      return next(
        new AppError(
          "Failed to initialize payment gateway. Please try again later.",
          500,
          "PAYMENT_INIT_FAILED",
        ),
      );
    }
    if (errorCode === "RAZORPAY_ORDER_CREATE_FAILED") {
      return next(
        new AppError(
          "Failed to create payment order. Please try again or contact support.",
          500,
          "RAZORPAY_ORDER_CREATE_FAILED",
        ),
      );
    }
    if (errorCode === "ORDER_SAVE_FAILED") {
      return next(
        new AppError(
          "Failed to save payment order. Please try again.",
          500,
          "ORDER_SAVE_FAILED",
        ),
      );
    }
    if (errorCode === "INSTALLMENT_NOT_IN_ARRAY") {
      return next(
        new AppError(
          "Installment configuration error. Please contact support.",
          500,
          "INSTALLMENT_NOT_IN_ARRAY",
        ),
      );
    }
    if (errorCode === "RAZORPAY_KEY_MISSING") {
      return next(
        new AppError(
          "Payment gateway configuration error. Please contact support.",
          500,
          "RAZORPAY_KEY_MISSING",
        ),
      );
    }
    if (errorCode === "RAZORPAY_CONFIG_ERROR") {
      return next(
        new AppError(
          "Payment configuration error. Please contact support.",
          500,
          "PAYMENT_CONFIG_ERROR",
        ),
      );
    }
    if (errorCode === "COLLEGE_ID_MISSING") {
      return next(
        new AppError(
          "College information missing. Please login again or contact support.",
          400,
          "COLLEGE_ID_MISSING",
        ),
      );
    }

    // Handle AppError instances - pass through directly
    if (error instanceof AppError) {
      return next(error);
    }

    // For all other errors, create a standardized AppError
    const appError = new AppError(
      error.message || "Failed to create payment order. Please try again.",
      errorStatus === 400 ? 400 : 500,
      errorCode,
    );
    return next(appError);
  }
};

/**
 * Verify Razorpay payment signature
 * @route POST /api/razorpay/verify-payment
 * @access Private (Student)
 */
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const collegeId = req.college_id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    logger.logInfo("🔵 [Razorpay Payment] Verifying payment", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        "Missing required payment parameters",
        400,
        "MISSING_PAYMENT_PARAMS",
      );
    }

    // Get college config for signature verification
    const { keySecret } = await collegeRazorpayService.getCollegeRazorpayConfig(collegeId);

    // ✅ Verify payment signature using timing-safe comparison
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", keySecret)
      .update(sign.toString())
      .digest("hex");

    const sigBuf = Buffer.from(razorpay_signature, "utf8");
    const expBuf = Buffer.from(expectedSign, "utf8");

    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      logger.logError("❌ Payment signature verification failed", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
      throw new AppError(
        "Payment verification failed. Invalid signature.",
        400,
        "INVALID_SIGNATURE",
      );
    }

    logger.logInfo("✅ Payment signature verified successfully", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    // Find student by user_id
    const student = await Student.findOne({
      user_id: userId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ OPTIMIZED: Directly query for installment with razorpayOrderId scoped by college_id
    logger.logInfo(
      "🔍 [verifyRazorpayPayment] Querying for installment with razorpayOrderId",
      {
        orderId: razorpay_order_id,
        studentId: student._id,
        collegeId,
      },
    );

    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      college_id: collegeId,
      "installments.razorpayOrderId": razorpay_order_id,
    });

    if (!studentFee) {
      logger.logError(
        "❌ [verifyRazorpayPayment] No fee record found with razorpayOrderId",
        {
          orderId: razorpay_order_id,
          studentId: student._id.toString(),
          collegeId,
        },
      );
      throw new AppError(
        "Installment not found. This may happen if the order expired or wasn't saved properly. Please try creating a new payment.",
        404,
        "INSTALLMENT_NOT_FOUND",
      );
    }

    // ✅ Find the specific installment in the array
    const installment = studentFee.installments.find(
      (i) => i.razorpayOrderId === razorpay_order_id,
    );

    if (!installment) {
      // This should never happen since we queried with razorpayOrderId
      logger.logError(
        "❌ [verifyRazorpayPayment] CRITICAL: Query found fee but installment not in array!",
        {
          orderId: razorpay_order_id,
        },
      );
      throw new AppError(
        "Installment not found",
        500,
        "INSTALLMENT_NOT_IN_ARRAY",
      );
    }

    logger.logInfo("✅ [verifyRazorpayPayment] Installment found", {
      installmentName: installment.name,
      status: installment.status,
    });

    // Validate optional client amount against DB installment record
    if (req.body.amount !== undefined) {
      const bodyAmount = Number(req.body.amount);
      const expectedRupees = installment.amount;
      const expectedPaise = Math.round(installment.amount * 100);
      if (bodyAmount !== expectedRupees && bodyAmount !== expectedPaise) {
        logger.logError(
          "❌ [verifyRazorpayPayment] Amount mismatch against DB installment",
          {
            bodyAmount,
            expectedRupees,
            expectedPaise,
          },
        );
        throw new AppError(
          "Payment verification failed. Amount mismatch.",
          400,
          "PAYMENT_AMOUNT_MISMATCH",
        );
      }
    }

    // Use helper function to process verification
    return processPaymentVerification(
      studentFee,
      installment,
      razorpay_order_id,
      razorpay_payment_id,
      student,
      res,
      next,
    );
  } catch (error) {
    // Handle Razorpay-specific errors
    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "RAZORPAY_NOT_CONFIGURED",
        ),
      );
    }
    if (error.code === "DECRYPTION_FAILED") {
      return next(
        new AppError(
          "Payment configuration error. Please contact support.",
          500,
          "PAYMENT_CONFIG_ERROR",
        ),
      );
    }
    next(error);
  }
};

/**
 * Handle Razorpay payment failure
 * @route POST /api/razorpay/payment-failed
 * @access Private (Student)
 */
exports.handleRazorpayPaymentFailure = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      error_code,
      error_description,
      error_reason,
      error_source,
      error_step,
      error_field,
      error_metadata,
    } = req.body;

    // TEMP DIAGNOSTIC: Log complete Razorpay error payload received from frontend
    logger.logInfo("🔴 [Razorpay Payment] Payment failure (diagnostic)", {
      orderId: razorpay_order_id,
      errorCode: error_code,
      errorDescription: error_description,
      errorReason: error_reason,
      errorSource: error_source,
      errorStep: error_step,
      errorField: error_field,
      errorMetadata: error_metadata,
      rawBody: req.body,
    });

    // Find student
    const student = await Student.findOne({
      user_id: userId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee record
    const studentFee =
      (await StudentFee.findOne({
        student_id: student._id,
        "installments.razorpayOrderId": razorpay_order_id,
      })) || (await getActiveStudentFee(student._id, collegeId, { student }));

    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    // Find installment by Razorpay order ID
    const installment = studentFee.installments.find(
      (i) => i.razorpayOrderId === razorpay_order_id,
    );

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    // Update installment with failure information
    installment.status = "PENDING"; // Keep as PENDING so student can retry
    installment.paymentFailureReason = [
      error_code,
      error_description,
      error_reason,
      error_source,
      error_step,
      error_field,
    ]
      .filter(Boolean)
      .join(" | ");
    installment.paymentAttemptAt = new Date();

    await studentFee.save();

    // 📧 Send payment failure email (non-blocking)
    (async () => {
      try {
        await sendPaymentFailureEmail({
          to: student.email,
          studentName: student.fullName,
          installment: {
            name: installment.name,
            amount: installment.amount,
          },
          errorCode: error_code,
          errorDescription: error_description,
        });
        logger.logInfo("✅ Payment failure email sent", {
          studentId: student._id,
          installmentId: installment._id,
        });
      } catch (emailError) {
        logger.logError("❌ Failed to send payment failure email", {
          error: emailError.message,
          studentId: student._id,
        });
      }
    })();

    res.json({
      success: true,
      message: "Payment failure recorded",
    });
  } catch (error) {
    next(error);
  }
};
