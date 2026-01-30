const Razorpay = require("razorpay");

class RazorpayService {
  constructor(credentials) {
    this.razorpay = new Razorpay({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret
    });
  }

  async createOrder(amount, receiptId) {
    return await this.razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: receiptId
    });
  }
}

module.exports = RazorpayService;
