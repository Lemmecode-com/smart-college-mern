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
      studentFee ? "FOUND" : "NOT FOUND"
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
        "FEE_RECORD_NOT_FOUND"
      );
    }

    // ✅ Step 3: Find the specific installment
    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING"
    );

    console.log(
      "🟢 Installment lookup result:",
      installment ? "FOUND" : "NOT FOUND"
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
        }))
      );
    }

    if (!installment) {
      throw new AppError(
        "Invalid or already paid installment",
        404,
        "INSTALLMENT_NOT_FOUND"
      );
    }

    // 🔒 RECOVERY: Check if there's already an active order for this installment
    if (installment.razorpayOrderId) {
      try {
        const razorpay = await getRazorpayInstance(collegeId);
        const existingOrder = await razorpay.orders.fetch(
          installment.razorpayOrderId
        );

        if (existingOrder.status === "created") {
          // Order still active, return existing order
          console.log(
            "🟡 Found existing Razorpay order (status: created), reusing"
          );
          return res.json({
            orderId: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            isExisting: true,
          });
        } else if (existingOrder.status === "paid") {
          // Order was completed but installment still shows PENDING
          console.log(
            "🟡 Order already completed, but installment still shows PENDING"
          );
          installment.status = "PAID";
          installment.transactionId = existingOrder.receipt;
          installment.paidAt = new Date();
          await studentFee.save();

          return res.json({
            orderId: existingOrder.id,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            alreadyPaid: true,
          });
        }
      } catch (error) {
        // Order not found or expired, continue with new order
        console.log(
          "🟡 Creating new order - previous one expired or invalid"
        );
      }
    }

    // ✅ Step 4: Get college-specific Razorpay instance
    const razorpay = await getRazorpayInstance(collegeId);

    // ✅ Step 5: Create Razorpay order
    const order = await razorpay.orders.create({
      amount: installment.amount * 100, // Amount in paise
      currency: "INR",
      receipt: `fee_${installment._id}_${Date.now()}`,
      notes: {
        studentId: student._id.toString(),
        collegeId: collegeId.toString(),
        installmentName: installment.name,
        studentFeeId: studentFee._id.toString(),
        installmentId: installment._id.toString(),
      },
    });

    // 🔒 RECOVERY: Store order ID for tracking
    installment.razorpayOrderId = order.id;
    installment.paymentAttemptAt = new Date();
    await studentFee.save();

    console.log(`✅ Razorpay order created: ${order.id}`);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: (await getCollegeRazorpayConfig(collegeId)).config.credentials
        .keyId,
    });
  } catch (error) {
    // Handle Razorpay-specific errors
    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "RAZORPAY_NOT_CONFIGURED"
        )
      );
    }
    if (error.code === "DECRYPTION_FAILED") {
      return next(
        new AppError(
          "Payment configuration error. Please contact support.",
          500,
          "PAYMENT_CONFIG_ERROR"
        )
      );
    }
    if (error.code === "RAZORPAY_INIT_FAILED") {
      return next(
        new AppError(
          "Failed to initialize payment gateway. Please try again later.",
          500,
          "PAYMENT_INIT_FAILED"
        )
      );
    }
    next(error);
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    console.log("🔵 [Razorpay Payment] Verifying payment");
    console.log("   - order_id:", razorpay_order_id);
    console.log("   - payment_id:", razorpay_payment_id);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        "Missing required payment parameters",
        400,
        "MISSING_PAYMENT_PARAMS"
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
        "INVALID_SIGNATURE"
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

    // Find student fee record
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    // Find installment by Razorpay order ID
    const installment = studentFee.installments.find(
      (i) => i.razorpayOrderId === razorpay_order_id
    );

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    // 🔥 If already paid → just return existing data
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

    /* =========================
       UPDATE PAYMENT STATUS
    ========================== */

    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.transactionId = razorpay_payment_id;
    installment.paymentGateway = "RAZORPAY";
    installment.razorpayOrderId = razorpay_order_id;

    /* =========================
       Recalculate paid amount
    ========================== */

    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    console.log(`✅ Payment verified and recorded for ${student.email}`);

    // 📧 Send payment confirmation email (non-blocking)
    (async () => {
      try {
        const college = await College.findById(student.college_id).select(
          "name email"
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
          emailError.message
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
    // Handle Razorpay-specific errors
    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "RAZORPAY_NOT_CONFIGURED"
        )
      );
    }
    if (error.code === "DECRYPTION_FAILED") {
      return next(
        new AppError(
          "Payment configuration error. Please contact support.",
          500,
          "PAYMENT_CONFIG_ERROR"
        )
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
      (i) => i.razorpayOrderId === razorpay_order_id
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
        console.log(
          `✅ Payment failure email sent to ${student.email}`
        );
      } catch (emailError) {
        console.error(
          "❌ Failed to send payment failure email:",
          emailError.message
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
