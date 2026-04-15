const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tokenType: {
    type: String,
    enum: ["access", "refresh"],
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  blacklistedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    enum: ["LOGOUT", "PASSWORD_CHANGE", "SECURITY", "USER_REQUEST"],
    default: "LOGOUT",
  },
}, { timestamps: true });

// 🔒 TTL index - auto-delete after expiry (saves database space)
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 🔒 Index for quick lookup during token validation
tokenBlacklistSchema.index({ token: 1, tokenType: 1 });

module.exports = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
