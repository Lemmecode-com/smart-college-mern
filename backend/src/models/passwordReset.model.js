const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
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

// Index for faster lookups
passwordResetSchema.index({ email: 1, expiresAt: 1 });

// Auto-delete expired OTPs (TTL index)
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash OTP before saving
passwordResetSchema.pre("save", async function (next) {
  if (!this.isModified("otpHash")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(this.otpHash, salt);
  next();
});

// Compare plaintext OTP against stored hash
passwordResetSchema.methods.compareOTP = function (otp) {
  return bcrypt.compare(otp, this.otpHash);
};

// Check if OTP is valid
passwordResetSchema.methods.isValid = function () {
  return !this.isUsed && this.expiresAt > new Date();
};

// Mark OTP as used
passwordResetSchema.methods.markAsUsed = function () {
  this.isUsed = true;
  return this.save();
};

module.exports = mongoose.model("PasswordReset", passwordResetSchema);