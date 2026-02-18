const stripe = require("../services/stripe.service");
const StudentFee = require("../models/studentFee.model");

exports.createCheckoutSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { installmentName } = req.body;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      return res.status(404).json({ message: "Student fee record not found" });
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName && i.status === "PENDING",
    );

    if (!installment) {
      return res
        .status(400)
        .json({ message: "Invalid or already paid installment" });
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
    res.status(500).json({ message: error.message });
  }
};

/* exports.confirmStripePayment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const { installmentName } = session.metadata;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment || installment.status === "PAID") {
      return res.json({ message: "Installment already processed" });
    }

    installment.status = "PAID";
    installment.paidAt = new Date();
    installment.transactionId = session.payment_intent;
    installment.paymentGateway = "STRIPE";

    // 🔄 Recalculate paid amount
    studentFee.paidAmount = studentFee.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    await studentFee.save();

    // res.json({
    //   message: "Payment verified and installment updated",
    //   paidAmount: studentFee.paidAmount,
    //   remainingAmount: studentFee.totalFee - studentFee.paidAmount
    // });

    return res.json({
      installment: {
        _id: installment._id,
        name: installment.name,
        amount: installment.amount,
        paidAt: installment.paidAt,
        status: installment.status,
      },
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; */



exports.confirmStripePayment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const { installmentName } = session.metadata;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) {
      return res.status(404).json({ message: "Fee record not found" });
    }

    const installment = studentFee.installments.find(
      (i) => i.name === installmentName,
    );

    if (!installment || installment.status === "PAID") {
      return res.json({ message: "Installment already processed" });
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
    res.status(500).json({ message: error.message });
  }
};
