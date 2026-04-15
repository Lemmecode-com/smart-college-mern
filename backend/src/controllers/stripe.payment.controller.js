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
const logger = require("../utils/logger");

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

    logger.logInfo("🔵 [Stripe Payment] Creating checkout session", {
      userId,
      collegeId,
      installmentName,
    });

    // ✅ Step 1: Find student by user_id
    const student = await Student.findOne({
      user_id: userId,
    });

    logger.logInfo("🟢 Student lookup result", {
      found: !!student,
      studentId: student?._id,
      fullName: student?.fullName,
    });

    if (!student) {
      logger.logError("❌ Student not found", { userId });
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ Step 2: Find student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
    });

    logger.logInfo("🟢 StudentFee lookup result", {
      found: !!studentFee,
      totalFee: studentFee?.totalFee,
      installmentsCount: studentFee?.installments?.length,
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
          logger.logInfo(
            "🟡 Found existing session (status: open) but creating new one (URL not available on retrieve)",
            { sessionId: installment.stripeSessionId },
          );
        } else if (existingSession.status === "complete") {
          // Session was completed - this shouldn't happen for PENDING installments
          logger.logInfo(
            "🟡 Session already completed, but installment still shows PENDING - will create new session",
            { sessionId: installment.stripeSessionId },
          );
        }
      } catch (error) {
        // Session not found or expired, continue with new session
        logger.logInfo(
          "🟡 Creating new session - previous one expired or invalid",
          {
            previousSessionId: installment.stripeSessionId,
          },
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

    // 🔒 IDEMPOTENCY: Generate unique key to prevent duplicate sessions
    // Format: stripe_checkout_{studentId}_{installmentId}_{hourTimestamp}
    // Hour-based timestamp ensures new session each hour while preventing duplicates within same hour
    const hourTimestamp = Math.floor(Date.now() / (60 * 60 * 1000));
    const idempotencyKey = `stripe_checkout_${student._id}_${installment._id}_${hourTimestamp}`;

    logger.logInfo("🔒 Generated idempotency key for Stripe session", {
      studentId: student._id,
      installmentId: installment._id,
      idempotencyKey,
    });

    // ✅ Step 5: Create Stripe checkout session with college's Stripe account
    // IDEMPOTENCY: Pass idempotency key as second parameter to prevent duplicate charges
    const session = await stripe.checkout.sessions.create(
      {
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
      },
      {
        idempotencyKey: idempotencyKey, // ← Prevents duplicate session creation
      },
    );

    logger.logInfo("✅ Stripe checkout session created", {
      sessionId: session.id,
      idempotencyKey,
      studentId: student._id,
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
    const userId = req.user.id;
    const collegeId = req.college_id;
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400, "SESSION_ID_REQUIRED");
    }

    logger.logInfo("🔵 Confirming Stripe payment", {
      userId,
      collegeId,
      sessionId,
    });

    // Get college-specific Stripe instance
    const stripe = await getStripeInstance(collegeId);

    // ✅ Step 1: Retrieve and verify Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      logger.logWarning("⚠️ Payment not completed", {
        sessionId,
        paymentStatus: session.payment_status,
      });
      throw new AppError("Payment not completed", 400, "PAYMENT_NOT_COMPLETED");
    }

    // 🆕 Step 2: Verify PaymentIntent actually succeeded (additional security layer)
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent,
    );
    if (paymentIntent.status !== "succeeded") {
      logger.logWarning("⚠️ PaymentIntent not succeeded", {
        sessionId,
        paymentIntentId: session.payment_intent,
        paymentIntentStatus: paymentIntent.status,
      });
      throw new AppError("Payment intent not succeeded", 400, "PAYMENT_FAILED");
    }

    const { installmentName, studentId: metadataStudentId } = session.metadata;

    // 🆕 Step 3: Verify metadata matches authenticated student (prevent unauthorized access)
    const student = await Student.findOne({ user_id: userId });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    if (metadataStudentId !== student._id.toString()) {
      logger.logWarning(
        "⚠️ Session metadata mismatch - possible unauthorized access",
        {
          userId,
          metadataStudentId,
          actualStudentId: student._id,
        },
      );
      throw new AppError("Unauthorized", 403, "UNAUTHORIZED");
    }

    // Find student fee record
    const studentFee = await StudentFee.findOne({ student_id: student._id });

    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    // 🆕 Step 4: Check if already paid (webhook or another request processed it)
    if (installment.status === "PAID") {
      logger.logInfo(
        "✅ Installment already paid (processed by webhook or retry)",
        {
          studentId: student._id,
          sessionId,
          paidAt: installment.paidAt,
        },
      );

      return res.json({
        success: true,
        alreadyProcessed: true,
        processedBy: installment.receiptEmailSentAt ? "webhook" : "unknown",
        installment: {
          _id: installment._id,
          name: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId,
          paymentGateway: installment.paymentGateway,
          status: installment.status,
        },
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      });
    }

    // 🆕 Step 5: ATOMIC UPDATE (prevent race conditions with webhook)
    // Only update if status is still PENDING
    const updateResult = await StudentFee.updateOne(
      {
        _id: studentFee._id,
        "installments._id": installment._id,
        "installments.status": "PENDING",
        "installments.stripeSessionId": { $ne: sessionId },
      },
      {
        $set: {
          "installments.$.status": "PAID",
          "installments.$.paidAt": new Date(),
          "installments.$.transactionId": paymentIntent.id,
          "installments.$.paymentGateway": "STRIPE",
          "installments.$.stripeSessionId": sessionId,
        },
      },
    );

    logger.logInfo("🔒 Atomic confirm-payment update completed", {
      studentId: student._id,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      sessionId,
    });

    // If no documents matched, webhook already processed this
    if (updateResult.matchedCount === 0) {
      logger.logInfo(
        "⚠️ Payment already processed by webhook (race condition prevented)",
        {
          studentId: student._id,
          sessionId,
        },
      );

      const latestFee = await StudentFee.findById(studentFee._id);
      const latestInstallment = latestFee.installments.id(installment._id);

      return res.json({
        success: true,
        alreadyProcessed: true,
        processedBy: "webhook",
        installment: {
          _id: latestInstallment._id,
          name: latestInstallment.name,
          amount: latestInstallment.amount,
          paidAt: latestInstallment.paidAt,
          transactionId: latestInstallment.transactionId,
          paymentGateway: latestInstallment.paymentGateway,
          status: latestInstallment.status,
        },
        totalFee: latestFee.totalFee,
        paidAmount: latestFee.paidAmount,
        remainingAmount: latestFee.totalFee - latestFee.paidAmount,
      });
    }

    // 🆕 Step 6: Payment marked as PAID by confirm-endpoint (fallback)
    logger.logInfo(
      "✅ Payment confirmed via endpoint (webhook not yet arrived)",
      {
        studentId: student._id,
        sessionId,
        paymentIntentId: paymentIntent.id,
      },
    );

    // 🆕 NOTE: Don't send receipt email here - webhook will send it (primary source)
    // If webhook fails, the email won't be sent. This is acceptable because:
    // 1. Webhook retries 3 times over 3 days
    // 2. Admin can manually resend email from dashboard
    // 3. Student can download receipt from payment history
    logger.logInfo("📧 Receipt email will be sent by webhook (primary)", {
      studentId: student._id,
    });

    // Fetch updated data for response
    const updatedFee = await StudentFee.findById(studentFee._id);
    const updatedInstallment = updatedFee.installments.id(installment._id);

    return res.json({
      success: true,
      processedBy: "confirm-endpoint",
      installment: {
        _id: updatedInstallment._id,
        name: updatedInstallment.name,
        amount: updatedInstallment.amount,
        paidAt: updatedInstallment.paidAt,
        transactionId: updatedInstallment.transactionId,
        paymentGateway: updatedInstallment.paymentGateway,
        status: updatedInstallment.status,
      },
      totalFee: updatedFee.totalFee,
      paidAmount: updatedFee.paidAmount,
      remainingAmount: updatedFee.totalFee - updatedFee.paidAmount,
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
