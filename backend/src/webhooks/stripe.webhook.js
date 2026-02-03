const stripe = require("../services/stripe.service");
const StudentFee = require("../models/studentFee.model");

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { studentId, installmentName } = session.metadata;

    const studentFee = await StudentFee.findOne({ student_id: studentId });
    if (!studentFee) return res.json({ received: true });

    const installment = studentFee.installments.find(
      i => i.name === installmentName
    );

    if (installment && installment.status !== "PAID") {
      installment.status = "PAID";
      installment.paidAt = new Date();
      installment.transactionId = session.payment_intent;
      installment.paymentGateway = "STRIPE";

      // 🔥 Recalculate paid amount
      studentFee.paidAmount = studentFee.installments
        .filter(i => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0);

      await studentFee.save();
    }
  }

  res.json({ received: true });
};
