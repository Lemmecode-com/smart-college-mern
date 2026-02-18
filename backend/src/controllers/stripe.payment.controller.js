const stripe = require("../services/stripe.service");
const StudentFee = require("../models/studentFee.model");
const AppError = require("../utils/AppError");

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { installmentName } = req.body;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      throw new AppError("Student fee record not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING",
    );

    if (!installment) {
      throw new AppError("Invalid or already paid installment", 404, "INSTALLMENT_NOT_FOUND");
    }

    const successUrl = `${process.env.FRONTEND_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/student/payment-cancel`;

    console.log("Success URL:", successUrl);
    console.log("Cancel URL:", cancelUrl);

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
            unit_amount: installment.amount * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/student/payment-cancel`,
      metadata: {
        studentId: studentId.toString(),
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
    const studentId = req.user.id;
    const { sessionId } = req.body;

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
