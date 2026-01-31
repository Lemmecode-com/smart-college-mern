const mongoose = require("mongoose");

const collegePaymentConfigSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true
    },

    gatewayCode: {
      type: String,
      enum: ["razorpay"],
      required: true
    },

    credentials: {
      keyId: { type: String, required: true },
      keySecret: { type: String, required: true }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "CollegePaymentConfig",
  collegePaymentConfigSchema
);
