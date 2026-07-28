const mongoose = require("mongoose");
const crypto = require("crypto");

const authSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    index: true,
  },
  role: {
    type: String,
    required: true,
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  invalidationReason: {
    type: String,
    default: null,
  },
}, { timestamps: true });

authSessionSchema.index({ user_id: 1, isActive: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

authSessionSchema.methods.isExpired = function () {
  return new Date() > new Date(this.expiresAt);
};

module.exports = mongoose.model("AuthSession", authSessionSchema);
