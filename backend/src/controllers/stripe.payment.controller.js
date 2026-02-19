const stripe = require("../services/stripe.service");
const StudentFee = require("../models/studentFee.model");
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
      },
    });

    res.json({ checkoutUrl: session.url });
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

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      throw new AppError("Fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    /* if (!installment || installment.status === "PAID") {
      return res.json({ message: "Installment already processed" });
    } */

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
