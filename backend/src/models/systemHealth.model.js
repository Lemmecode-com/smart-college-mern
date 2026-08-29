const mongoose = require("mongoose");

/**
 * SystemHealth Model
 * Tracks overall system health metrics and service status
 *
 * Usage: Store periodic health check snapshots (every 1-5 minutes)
 * Retention: 90 days (then archive/delete)
 */
const systemHealthSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["HEALTHY", "DEGRADED", "DOWN"],
      default: "HEALTHY",
    },
    metrics: {
      cpuUsage: {
        type: Number, // 0-100 percentage
        min: 0,
        max: 100,
      },
      memoryUsage: {
        type: Number, // 0-100 percentage
        min: 0,
        max: 100,
      },
      diskUsage: {
        type: Number, // 0-100 percentage
        min: 0,
        max: 100,
      },
      responseTimeMs: {
        type: Number, // average API response time
        min: 0,
      },
      errorRate: {
        type: Number, // percentage of failed requests
        min: 0,
        max: 100,
      },
    },
    services: [
      {
        name: {
          type: String,
          enum: [
            "MONGODB",
            "REDIS",
            "EMAIL_SMTP",
            "SMS_TWILIO",
            "PAYMENT_STRIPE",
            "PAYMENT_RAZORPAY",
            "CLOUD_STORAGE",
            "CACHE",
            "QUEUE",
          ],
          required: true,
        },
        status: {
          type: String,
          enum: ["ACTIVE", "INACTIVE", "ERROR"],
          default: "ACTIVE",
        },
        latencyMs: {
          type: Number,
          min: 0,
        },
        lastChecked: {
          type: Date,
          default: Date.now,
        },
        errorMessage: {
          type: String,
          trim: true,
        },
      },
    ],
    errors: [
      {
        type: {
          type: String,
          enum: [
            "DATABASE",
            "API",
            "AUTH",
            "PAYMENT",
            "EMAIL",
            "SMS",
            "STORAGE",
            "NETWORK",
            "UNKNOWN",
          ],
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        count: {
          type: Number,
          min: 0,
          default: 1,
        },
        lastOccurred: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "system_health",
  }
);

// Index for efficient time-range queries
systemHealthSchema.index({ timestamp: -1 });
systemHealthSchema.index({ status: 1 });

module.exports = mongoose.model("SystemHealth", systemHealthSchema);
