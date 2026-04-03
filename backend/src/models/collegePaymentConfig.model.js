const mongoose = require("mongoose");

const collegePaymentConfigSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },
    gatewayCode: {
      type: String,
      enum: ["stripe", "razorpay"],
      required: true,
    },
    credentials: {
      keyId: { type: String, required: true },
      keySecret: { type: String, required: true },
      webhookSecret: { type: String },
    },
    configuration: {
      currency: { type: String, default: "INR" },
      enabled: { type: Boolean, default: true },
      testMode: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastVerifiedAt: { type: Date },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Compound index: one active config per college per gateway
collegePaymentConfigSchema.index({ collegeId: 1, gatewayCode: 1, isActive: 1 });

/**
 * Pre-save middleware to ensure only one active config per college per gateway
 *
 * IMPORTANT: Must use async function + next() pattern for async operations
 *
 * Why the error occurred:
 * - Old code: Called .exec() without await, then immediately called next()
 * - This caused next() to be called before the async operation completed
 * - In Mongoose 8.x, this breaks the middleware execution context
 *
 * Solution:
 * - Use async function WITHOUT next() parameter
 * - Let Promise resolution signal completion
 * - Throw errors to signal failure
 */
collegePaymentConfigSchema.pre("save", async function () {
  if (this.isActive) {
    // Await the async operation properly
    await this.constructor
      .updateMany(
        {
          collegeId: this.collegeId,
          gatewayCode: this.gatewayCode,
          isActive: true,
          _id: { $ne: this._id }, // Exclude current document
        },
        { isActive: false },
      )
      .exec();

    console.log(
      `[CollegePaymentConfig] Deactivated other configs for college ${this.collegeId}`,
    );
  }
  // No next() call - async function resolution signals completion
});

// Instance method to check if config is valid
collegePaymentConfigSchema.methods.isValid = function () {
  return this.isActive && this.configuration?.enabled;
};

// Static method to get active config for a college
collegePaymentConfigSchema.statics.getActiveConfig = async function (
  collegeId,
  gatewayCode,
) {
  return await this.findOne({
    collegeId,
    gatewayCode,
    isActive: true,
    "configuration.enabled": true,
  }).lean();
};

module.exports = mongoose.model(
  "CollegePaymentConfig",
  collegePaymentConfigSchema,
);
