const {
  getRazorpayInstance,
  getCollegeRazorpayConfig,
} = require("../services/collegeRazorpay.service");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Course = require("../models/course.model");
const {
  sendPaymentReceiptEmail,
  sendPaymentFailureEmail,
} = require("../services/email.service");
const AppError = require("../utils/AppError");
const crypto = require("crypto");

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
    // 🔥 If already paid → just return existing data (Layer 1)
    if (installment.status === "PAID") {
      console.log("🟡 Installment already paid");
      return res.json({
        valid: true,
        alreadyPaid: true,
        installment: {
          _id: installment._id,
          name: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId,
          status: installment.status,
        },
      });
    }

    // 🔥 Additional duplicate protection: check if this exact payment was already processed (Layer 2)
    if (
      installment.razorpayPaymentId === razorpay_payment_id ||
      installment.transactionId === razorpay_payment_id
    ) {
      console.log("🟡 Payment already processed (duplicate payment ID)");
      return res.json({
        valid: true,
        alreadyPaid: true,
        installment: {
          _id: installment._id,
          name: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId,
          status: "PAID",
        },
      });
    }

    /* =========================
       UPDATE PAYMENT STATUS
    ========================== */

    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.transactionId = razorpay_payment_id;
    installment.paymentGateway = "RAZORPAY";
    installment.razorpayOrderId = razorpay_order_id;
    installment.razorpayPaymentId = razorpay_payment_id;

    /* =========================
       Recalculate paid amount
    ========================== */

    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    console.log(`✅ Payment verified and recorded for ${student.email}`);
    console.log("🔵 [processPaymentVerification] StudentFee values:", {
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remaining: studentFee.totalFee - studentFee.paidAmount,
      installmentsCount: studentFee.installments.length,
      paidInstallments: studentFee.installments
        .filter((i) => i.status === "PAID")
        .map((i) => i.name),
    });
    console.log("🔵 [processPaymentVerification] Sending response:", {
      valid: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      installment: {
        _id: installment._id,
        name: installment.name,
        amount: installment.amount,
      },
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });

    // 📧 Send payment confirmation email (non-blocking)
    (async () => {
      try {
        const college = await College.findById(student.college_id).select(
          "name email",
        );
        const course = await Course.findById(student.course_id).select("name");

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
        console.log(`✅ Payment receipt email sent to ${student.email}`);
      } catch (emailError) {
        console.error(
          "❌ Failed to send payment receipt email:",
          emailError.message,
        );
      }
    })();

    res.json({
      valid: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      installment: {
        _id: installment._id,
        name: installment.name,
        amount: installment.amount,
        paidAt: installment.paidAt,
        transactionId: installment.transactionId,
        status: installment.status,
      },
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });
  } catch (error) {
    console.error("❌ [processPaymentVerification] Error:", error);
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

    console.log("🔵 [Razorpay Payment] Creating order");
    console.log("   - userId from JWT:", userId);
    console.log("   - collegeId:", collegeId);
    console.log("   - installmentName:", installmentName);

    // ✅ VALIDATION: Ensure collegeId is present
    if (!collegeId) {
      console.error(
        "❌ [createRazorpayOrder] collegeId is missing from request!",
      );
      console.error("   - req.user:", req.user);
      console.error("   - req.college:", req.college);
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

    console.log("🟢 Student lookup result:", student ? "FOUND" : "NOT FOUND");
    if (student) {
      console.log("   - student._id:", student._id);
      console.log("   - student.fullName:", student.fullName);
    }

    if (!student) {
      console.error("❌ Student not found for user_id:", userId);
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ Step 2: Find student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

    console.log(
      "🟢 StudentFee lookup result:",
      studentFee ? "FOUND" : "NOT FOUND",
    );
    if (studentFee) {
      console.log("   - totalFee:", studentFee.totalFee);
      console.log("   - installments count:", studentFee.installments.length);
    }

    if (!studentFee) {
      console.error("❌ StudentFee not found for student._id:", student._id);
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

    console.log(
      "🟢 Installment lookup result:",
      installment ? "FOUND" : "NOT FOUND",
    );
    if (installment) {
      console.log("   - name:", installment.name);
      console.log("   - amount:", installment.amount);
      console.log("   - status:", installment.status);
    } else {
      console.error("❌ Installment not found. Name:", installmentName);
      console.error(
        "   - Available installments:",
        studentFee.installments.map((i) => ({
          name: i.name,
          status: i.status,
        })),
      );
    }

    if (!installment) {
      throw new AppError(
        "Invalid or already paid installment",
        404,
        "INSTALLMENT_NOT_FOUND",
      );
    }

    // 🔒 RECOVERY: Check if there's already an active order for this installment
    // ⚠️ IMPORTANT: Get config FIRST to ensure we have keyId for all response paths
    let keyId;
    try {
      const razorpayConfig = await getCollegeRazorpayConfig(collegeId);
      keyId = razorpayConfig.config.credentials.keyId;
      console.log(
        "✅ [createRazorpayOrder] Razorpay config obtained, keyId:",
        keyId,
      );
    } catch (configError) {
      console.error(
        "❌ [createRazorpayOrder] Failed to get Razorpay configuration:",
        configError,
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
        const razorpay = await getRazorpayInstance(collegeId);
        const existingOrder = await razorpay.orders.fetch(
          installment.razorpayOrderId,
        );

        if (existingOrder.status === "created") {
          // Order still active, return existing order WITH keyId
          console.log(
            "🟡 Found existing Razorpay order (status: created), reusing",
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
          console.log(
            "🟡 Order already completed, but installment still shows PENDING",
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
        console.log("🟡 Creating new order - previous one expired or invalid");
      }
    }

    // ✅ Step 5: Get Razorpay instance using the config
    // (keyId already obtained above)
    console.log("🔵 [createRazorpayOrder] About to get Razorpay instance");
    let razorpay;
    try {
      razorpay = await getRazorpayInstance(collegeId);
      console.log("✅ [createRazorpayOrder] Razorpay instance obtained");
    } catch (razorpayInitError) {
      console.error(
        "❌ [createRazorpayOrder] Failed to get Razorpay instance:",
        razorpayInitError,
      );
      console.error("   - error.name:", razorpayInitError.name);
      console.error("   - error.message:", razorpayInitError.message);
      console.error("   - error.code:", razorpayInitError.code);
      console.error("   - error.statusCode:", razorpayInitError.statusCode);

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
    console.log(
      "🔵 [createRazorpayOrder] Creating Razorpay order with amount:",
      installment.amount * 100,
    );
    console.log("   - installment._id:", installment._id);
    console.log("   - installment.name:", installment.name);
    console.log("   - installment.amount:", installment.amount);
    console.log("   - collegeId:", collegeId.toString());
    console.log("   - studentId:", student._id.toString());

    // Validate amount before creating order
    if (!installment.amount || installment.amount <= 0) {
      console.error(
        "❌ [createRazorpayOrder] Invalid installment amount:",
        installment.amount,
      );
      throw new AppError("Invalid payment amount", 400, "INVALID_AMOUNT");
    }

    let order;
    try {
      // Generate short receipt ID (max 40 chars for Razorpay limit)
      // Format: fee_<timestamp>_<shortId> = ~35 chars
      const shortReceipt = `fee_${Date.now()}_${installment._id.toString().slice(-8)}`;

      console.log(
        "🔵 [createRazorpayOrder] Receipt ID:",
        shortReceipt,
        `(length: ${shortReceipt.length})`,
      );

      order = await razorpay.orders.create({
        amount: installment.amount * 100, // Amount in paise
        currency: "INR",
        receipt: shortReceipt,
        notes: {
          studentId: student._id.toString(),
          collegeId: collegeId.toString(),
          installmentName: installment.name,
          studentFeeId: studentFee._id.toString(),
          installmentId: installment._id.toString(),
        },
      });
      console.log("✅ [createRazorpayOrder] Razorpay order created:", order.id);
    } catch (orderCreateError) {
      console.error(
        "❌ [createRazorpayOrder] Failed to create Razorpay order:",
        orderCreateError,
      );
      console.error("   - error.name:", orderCreateError.name);
      console.error("   - error.message:", orderCreateError.message);
      console.error("   - error.code:", orderCreateError.code);
      console.error("   - error.statusCode:", orderCreateError.statusCode);
      console.error("   - error.response:", orderCreateError.response?.data);
      console.error(
        "   - Full error:",
        JSON.stringify(orderCreateError, null, 2),
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
    console.log(
      "🔵 [createRazorpayOrder] Saving razorpayOrderId to database:",
      order.id,
    );
    console.log(
      "   - studentFee._id:",
      studentFee._id.toString(),
      "installment._id:",
      installment._id.toString(),
    );

    try {
      // Method 1: Use save() - most reliable for nested documents
      const installmentToUpdate = studentFee.installments.id(installment._id);
      if (installmentToUpdate) {
        installmentToUpdate.razorpayOrderId = order.id;
        installmentToUpdate.paymentAttemptAt = new Date();

        await studentFee.save();
        console.log(
          "✅ [createRazorpayOrder] razorpayOrderId saved via save():",
          order.id,
        );

        // Verify the save worked
        const verification = await StudentFee.findById(studentFee._id);
        const verifiedInstallment = verification.installments.id(
          installment._id,
        );
        console.log(
          "🔍 [createRazorpayOrder] Verification - razorpayOrderId in DB:",
          verifiedInstallment?.razorpayOrderId || "NOT FOUND",
        );

        if (verifiedInstallment?.razorpayOrderId !== order.id) {
          console.error(
            "❌ [createRazorpayOrder] VERIFICATION FAILED! Order ID not saved!",
          );
          throw new AppError(
            "Failed to save payment order. Please try again.",
            500,
            "ORDER_SAVE_FAILED",
          );
        }
      } else {
        console.error(
          "❌ [createRazorpayOrder] Installment not found in array!",
        );
        throw new AppError(
          "Installment not found in fee record",
          500,
          "INSTALLMENT_NOT_IN_ARRAY",
        );
      }
    } catch (saveError) {
      console.error(
        "❌ [createRazorpayOrder] Failed to save razorpayOrderId:",
        saveError.message,
      );
      throw new AppError(
        "Failed to save payment order. Please try again.",
        500,
        "ORDER_SAVE_FAILED",
      );
    }

    console.log(`✅ Razorpay order ID saved and verified: ${order.id}`);

    // ✅ Validate keyId before sending response
    if (!keyId) {
      console.error(
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
    console.error("❌ [createRazorpayOrder] Error caught:", error);
    console.error("   - error.name:", error.name);
    console.error("   - error.message:", error.message);
    console.error("   - error.code:", error.code);
    console.error("   - error.statusCode:", error.statusCode);

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

    console.log("🔵 [Razorpay Payment] Verifying payment");
    console.log("   - order_id:", razorpay_order_id);
    console.log("   - payment_id:", razorpay_payment_id);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        "Missing required payment parameters",
        400,
        "MISSING_PAYMENT_PARAMS",
      );
    }

    // Get college config for signature verification
    const { keySecret } = await getCollegeRazorpayConfig(collegeId);

    // ✅ Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", keySecret)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.error("❌ Payment signature verification failed");
      throw new AppError(
        "Payment verification failed. Invalid signature.",
        400,
        "INVALID_SIGNATURE",
      );
    }

    console.log("✅ Payment signature verified successfully");

    // Find student by user_id
    const student = await Student.findOne({
      user_id: userId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ OPTIMIZED: Directly query for installment with razorpayOrderId
    // This is more efficient than loading all installments and filtering in JS
    console.log(
      "🔍 [verifyRazorpayPayment] Querying for installment with razorpayOrderId:",
      razorpay_order_id,
    );

    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      "installments.razorpayOrderId": razorpay_order_id,
    });

    if (!studentFee) {
      console.error(
        "❌ [verifyRazorpayPayment] No fee record found with razorpayOrderId:",
        razorpay_order_id,
      );
      console.error("   - student._id:", student._id.toString());
      console.error("   - Searched razorpayOrderId:", razorpay_order_id);

      // 🔵 FALLBACK: Try to find by installment name using Razorpay notes
      console.log(
        "🔵 [verifyRazorpayPayment] FALLBACK: Fetching order from Razorpay to get notes...",
      );

      try {
        const razorpay = await getRazorpayInstance(collegeId);
        const orderDetails = await razorpay.orders.fetch(razorpay_order_id);

        console.log(
          "🟢 [verifyRazorpayPayment] Order fetched from Razorpay:",
          orderDetails.id,
        );
        console.log("   - notes:", orderDetails.notes);

        if (orderDetails.notes && orderDetails.notes.installmentName) {
          const installmentName = orderDetails.notes.installmentName;
          console.log(
            "🔵 [verifyRazorpayPayment] FALLBACK: Looking for installment by name:",
            installmentName,
          );

          // Try to find fee record with matching installment name
          const fallbackFee = await StudentFee.findOne({
            student_id: student._id,
            "installments.name": installmentName,
          });

          if (fallbackFee) {
            console.log(
              "🟢 [verifyRazorpayPayment] FALLBACK SUCCESS: Found fee record",
            );

            // Find the specific installment
            const fallbackInstallment = fallbackFee.installments.find(
              (i) => i.name === installmentName && i.status === "PENDING",
            );

            if (fallbackInstallment) {
              console.log(
                "🟢 [verifyRazorpayPayment] FALLBACK: Found installment, updating razorpayOrderId...",
              );

              // Update the razorpayOrderId for future reference
              const installmentToUpdate = fallbackFee.installments.id(
                fallbackInstallment._id,
              );
              if (installmentToUpdate) {
                installmentToUpdate.razorpayOrderId = razorpay_order_id;
                installmentToUpdate.paymentAttemptAt = new Date();
                await fallbackFee.save();
                console.log(
                  "✅ [verifyRazorpayPayment] FALLBACK: razorpayOrderId saved for future",
                );
              }

              // Continue with this installment
              console.log(
                "🟢 [verifyRazorpayPayment] FALLBACK: Proceeding with payment verification",
              );
              return processPaymentVerification(
                fallbackFee,
                fallbackInstallment,
                razorpay_order_id,
                razorpay_payment_id,
                student,
                res,
                next,
              );
            } else {
              console.error(
                "❌ [verifyRazorpayPayment] FALLBACK: Installment not found or not PENDING",
              );
            }
          } else {
            console.error(
              "❌ [verifyRazorpayPayment] FALLBACK: No fee record found with installment name",
            );
          }
        } else {
          console.error(
            "❌ [verifyRazorpayPayment] FALLBACK: No installmentName in order notes",
          );
        }
      } catch (fallbackError) {
        console.error(
          "❌ [verifyRazorpayPayment] FALLBACK failed:",
          fallbackError.message,
        );
        console.error("   - Stack:", fallbackError.stack);
        // Continue to error handling below
      }

      // Debug: Check if student has any fee record
      const anyFee = await StudentFee.findOne({ student_id: student._id });
      if (!anyFee) {
        console.error(
          "❌ [verifyRazorpayPayment] Student has NO fee record at all!",
        );
        throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
      }

      // Debug: Show all installments for this student
      console.log(
        "📋 [verifyRazorpayPayment] Student has",
        anyFee.installments.length,
        "installments:",
      );
      anyFee.installments.forEach((inst, idx) => {
        console.log(
          `   [${idx}] "${inst.name}": status=${inst.status}, razorpayOrderId=${inst.razorpayOrderId || "NOT SET"}`,
        );
      });

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
      console.error(
        "❌ [verifyRazorpayPayment] CRITICAL: Query found fee but installment not in array!",
      );
      throw new AppError(
        "Installment not found",
        500,
        "INSTALLMENT_NOT_IN_ARRAY",
      );
    }

    console.log(
      "✅ [verifyRazorpayPayment] Installment found:",
      installment.name,
      "- status:",
      installment.status,
    );

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
    const { razorpay_order_id, error_code, error_description } = req.body;

    console.log("🔴 [Razorpay Payment] Payment failure");
    console.log("   - order_id:", razorpay_order_id);
    console.log("   - error_code:", error_code);
    console.log("   - error_description:", error_description);

    // Find student
    const student = await Student.findOne({
      user_id: userId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee record
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

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
    installment.paymentFailureReason = `${error_code}: ${error_description}`;
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
        console.log(`✅ Payment failure email sent to ${student.email}`);
      } catch (emailError) {
        console.error(
          "❌ Failed to send payment failure email:",
          emailError.message,
        );
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
