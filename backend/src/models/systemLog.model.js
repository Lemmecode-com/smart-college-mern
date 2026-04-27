const mongoose = require("mongoose");

/**
 * SystemLog Model
 * Stores application-level logs (errors, warnings, info, debug)
 *
 * This is different from AuditLog (which tracks user actions).
 * SystemLog tracks system events, errors, warnings, and diagnostics.
 *
 * Retention: ERROR/WARN - 1 year, INFO/DEBUG - 30 days (auto-cleanup job)
 */
const systemLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ["ERROR", "WARN", "INFO", "DEBUG"],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: false,
      index: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    stack: {
      type: String, // error stack trace
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    request: {
      method: String,
      url: String,
      query: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed, // be careful with sensitive data
    },
    response: {
      statusCode: Number,
      latencyMs: Number,
    },
  },
  {
    timestamps: true,
    collection: "system_logs",
  }
);

// Indexes for efficient querying
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ level: 1, createdAt: -1 });
systemLogSchema.index({ module: 1, createdAt: -1 });
systemLogSchema.index({ college_id: 1, createdAt: -1 });
systemLogSchema.index({ userId: 1, createdAt: -1 });

// TTL index for auto-deletion of old logs
// INFO/DEBUG: expire in 30 days
// WARN: expire in 90 days
// ERROR: expire in 365 days
// We'll handle this via a cron job, not TTL (different retention per level)

module.exports = mongoose.model("SystemLog", systemLogSchema);
