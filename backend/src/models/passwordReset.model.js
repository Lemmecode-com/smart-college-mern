const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
      length: 6,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// ✅ Index for faster lookups
passwordResetSchema.index({ email: 1, expiresAt: 1 });

// ✅ Auto-delete expired OTPs (TTL index)
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ✅ Method to check if OTP is valid
passwordResetSchema.methods.isValid = function () {
  return !this.isUsed && this.expiresAt > new Date();
};

// ✅ Method to mark OTP as used
passwordResetSchema.methods.markAsUsed = function () {
  this.isUsed = true;
  return this.save();
};

module.exports = mongoose.model("PasswordReset", passwordResetSchema);