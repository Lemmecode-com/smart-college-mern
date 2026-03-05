const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  // User reference
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Note: Compound index { user_id: 1, isRevoked: 1 } below handles all queries
  },

  // The actual refresh token (hashed)
  token: {
    type: String,
    required: true,
    index: true,
  },

  // Token metadata
  expiresAt: {
    type: Date,
    required: true,
  },

  // Device/browser info for security
  userAgent: {
    type: String,
  },

  ipAddress: {
    type: String,
  },

  // Token status
  isRevoked: {
    type: Boolean,
    default: false,
  },

  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // Auto-delete after 7 days (TTL index)
  }
});

// Compound index for efficient lookups
refreshTokenSchema.index({ user_id: 1, isRevoked: 1 });

// TTL index - automatically delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
