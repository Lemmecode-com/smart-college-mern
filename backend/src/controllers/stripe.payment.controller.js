const {
  getStripeInstance,
  getCollegeStripeConfig,
} = require("../services/collegeStripe.service");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Course = require("../models/course.model");
const {
  sendPaymentReceiptEmail,
  sendPaymentFailureEmail,
} = require("../services/email.service");
const AppError = require("../utils/AppError");

/**
 * Create Stripe checkout session using college-specific Stripe configuration
 * @route POST /api/stripe/create-checkout-session
 * @access Private (Student)
 */
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user.id; // User._id from JWT token
    const collegeId = req.college_id;
    const { installmentName } = req.body;

    console.log("🔵 [Stripe Payment] Creating checkout session");
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

    // 🔒 RECOVERY: Check if there's already an active session for this installment
    // NOTE: Stripe doesn't return the checkout URL when retrieving existing sessions,
    // so we always create a new session instead of trying to reuse old ones.
    // This prevents the "checkoutUrl: null" bug.
    if (installment.stripeSessionId) {
      try {
        // Retrieve existing session to check its status
        const existingSession = await stripe.checkout.sessions.retrieve(
          installment.stripeSessionId,
        );

        if (existingSession.status === "open") {
          // Session still active but we can't get the URL, so we'll create a new one
          console.log(
            "🟡 Found existing session (status: open) but creating new one (URL not available on retrieve)",
          );
        } else if (existingSession.status === "complete") {
          // Session was completed - this shouldn't happen for PENDING installments
          console.log(
            "🟡 Session already completed, but installment still shows PENDING - will create new session",
          );
        }
      } catch (error) {
        // Session not found or expired, continue with new session
        console.log(
          "🟡 Creating new session - previous one expired or invalid",
        );
      }
    }

    // ✅ Step 4: Get college-specific Stripe instance
    const stripe = await getStripeInstance(collegeId);

    // ✅ Step 4.5: Validate FRONTEND_URL for payment redirects
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error(
        "FRONTEND_URL is required for Stripe payment redirects. " +
          "Set it in your .env file before processing payments.",
      );
    }

    // ✅ Step 5: Create Stripe checkout session with college's Stripe account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `College Fee - ${installment.name}`,
            },
            unit_amount: installment.amount * 100, // Amount in paise
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/student/payment-cancel`,
      metadata: {
        studentId: student._id.toString(),
        collegeId: collegeId.toString(),
        installmentName,
        studentFeeId: studentFee._id.toString(),
        installmentId: installment._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // Session expires in 1 hour
    });

    // 🔒 RECOVERY: Store session ID for tracking
    installment.stripeSessionId = session.id;
    installment.paymentAttemptAt = new Date();
    await studentFee.save();

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000),
    });
  } catch (error) {
    // Handle Stripe-specific errors
    if (error.code === "STRIPE_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "STRIPE_NOT_CONFIGURED",
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
    if (error.code === "STRIPE_INIT_FAILED") {
      return next(
        new AppError(
          "Failed to initialize payment gateway. Please try again later.",
          500,
          "PAYMENT_INIT_FAILED",
        ),
      );
    }
    next(error);
  }
};

/**
 * Confirm Stripe payment after redirect from Stripe
 * @route POST /api/stripe/confirm-payment
 * @access Private (Student)
 */
exports.confirmStripePayment = async (req, res, next) => {
  try {
    const userId = req.user.id; // This is User._id
    const collegeId = req.college_id;
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400, "SESSION_ID_REQUIRED");
    }

    // Get college-specific Stripe instance
    const stripe = await getStripeInstance(collegeId);

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new AppError("Payment not completed", 400, "PAYMENT_NOT_COMPLETED");
    }

    const { installmentName, studentFeeId } = session.metadata;

    // ✅ Find student by user_id (don't filter by college_id)
    const student = await Student.findOne({
      user_id: userId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    // 🔥 If already paid → just return existing data
    if (installment.status === "PAID") {
      return res.json({
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
    }

    /* =========================
       STRIPE TRANSACTION DATA
    ========================== */

    const paymentIntentId = session.payment_intent; // ✅ main transaction id

    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.transactionId = paymentIntentId; // ✅ Store Stripe PaymentIntent
    installment.paymentGateway = "STRIPE";
    installment.stripeSessionId = sessionId; // optional but good practice

    /* =========================
       Recalculate paid amount
    ========================== */

    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

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

    return res.json({
      installment: {
        _id: installment._id,
        name: installment.name,
        amount: installment.amount,
        paidAt: installment.paidAt,
        transactionId: installment.transactionId, // ✅ RETURN IT
        status: installment.status,
      },
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });
  } catch (error) {
    // Handle Stripe-specific errors
    if (error.code === "STRIPE_NOT_CONFIGURED") {
      return next(
        new AppError(
          "Payment gateway is not configured for your college. Please contact the college administrator.",
          400,
          "STRIPE_NOT_CONFIGURED",
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
