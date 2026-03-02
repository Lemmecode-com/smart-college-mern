const stripe = require("../services/stripe.service");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Course = require("../models/course.model");
const { sendPaymentReceiptEmail, sendPaymentFailureEmail } = require("../services/email.service");
const AppError = require("../utils/AppError");

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user.id;  // User._id from JWT token
    const collegeId = req.college_id;
    const { installmentName } = req.body;

    // ✅ Step 1: Find student by user_id
    const student = await Student.findOne({
      user_id: userId
      // Don't filter by college_id here - let's see what we get
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // ✅ Step 2: Find student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id
    });

    if (!studentFee) {
      throw new AppError("Student fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }


    // ✅ Step 3: Find the specific installment
    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING"
    );

    if (!installment) {
      throw new AppError("Invalid or already paid installment", 404, "INSTALLMENT_NOT_FOUND");
    }

    // 🔒 RECOVERY: Check if there's already an active session for this installment
    if (installment.stripeSessionId) {
      try {
        // Retrieve existing session to check its status
        const existingSession = await stripe.checkout.sessions.retrieve(installment.stripeSessionId);
        
        if (existingSession.status === 'open' || existingSession.status === 'complete') {
          // Session still active, return existing URL
          return res.json({ 
            checkoutUrl: existingSession.url,
            message: "Existing payment session found",
            existingSession: true
          });
        }
      } catch (error) {
        // Session not found or expired, continue with new session
        console.log("Creating new session - previous one expired or invalid");
      }
    }

    // ✅ Step 4: Create Stripe checkout session
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
      success_url: `${process.env.FRONTEND_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/student/payment-cancel`,
      metadata: {
        studentId: student._id.toString(),
        installmentName,
        studentFeeId: studentFee._id.toString(),
        installmentId: installment._id.toString()
      },
      expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // Session expires in 1 hour
    });

    // 🔒 RECOVERY: Store session ID for tracking
    installment.stripeSessionId = session.id;
    installment.paymentAttemptAt = new Date();
    await studentFee.save();

    res.json({ 
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000)
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmStripePayment = async (req, res, next) => {
  try {
    const userId = req.user.id;  // This is User._id
    const collegeId = req.college_id;
    const { sessionId } = req.body;

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new AppError("Payment not completed", 400, "PAYMENT_NOT_COMPLETED");
    }

    const { installmentName } = session.metadata;

    // ✅ Find student by user_id (don't filter by college_id)
    const student = await Student.findOne({
      user_id: userId
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id
    });

    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName
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
        const college = await College.findById(student.college_id).select('name email');
        const course = await Course.findById(student.course_id).select('name');
        
        await sendPaymentReceiptEmail({
          to: student.email,
          studentName: student.fullName,
          installment: {
            name: installment.name,
            amount: installment.amount,
            paidAt: installment.paidAt,
            transactionId: installment.transactionId
          },
          totalFee: studentFee.totalFee,
          paidAmount: studentFee.paidAmount,
          remainingAmount: studentFee.totalFee - studentFee.paidAmount
        });
        console.log(`✅ Payment receipt email sent to ${student.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send payment receipt email:', emailError.message);
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
    next(error);
  }
};