const RazorpayService = require("../services/payments/razorpay.service.js");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model.js");
// const StudentPayment = require("../models/StudentPayment.js");

exports.initiatePayment = async (req, res) => {
  try {
    const { courseId, caste } = req.body;
    const collegeId = req.collegeId;

    // 1️⃣ Fetch college Razorpay config
    const config = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "razorpay",
      isActive: true
    });

    if (!config) {
      return res.status(400).json({ message: "Razorpay not configured" });
    }

    // 2️⃣ Calculate fee (replace with real logic later)
    const finalFee = 2500;

    // 3️⃣ Create order
    const razorpayService = new RazorpayService(config.credentials);

    const order = await razorpayService.createOrder(
      finalFee,
      `receipt_${Date.now()}`
    );

    // 4️⃣ Save payment record
    await StudentPayment.create({
      collegeId,
      studentId: req.user.id,
      gatewayCode: "razorpay",
      orderId: order.id,
      amount: finalFee,
      status: "initiated"
    });

    // 5️⃣ Send response
    res.json({
      orderId: order.id,
      amount: finalFee,
      currency: "INR",
      keyId: config.credentials.keyId // SAFE
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};
