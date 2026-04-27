const mongoose = require("mongoose");

/**
 * IntegrationHealth Model
 * Monitors health of third-party integrations (payment gateways, email, SMS, etc.)
 *
 * Purpose: Track uptime, latency, and errors for external services
 * Used by: Platform Support to detect service outages
 */
const integrationHealthSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: [
        "STRIPE",
        "RAZORPAY",
        "EMAIL_SMTP",
        "SMS_TWILIO",
        "SMS_NODEJS",
        "CLOUD_STORAGE",
        "REDIS",
        "QUEUE",
        "PDF_GENERATOR",
        "QR_CODE",
      ],
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ERROR", "UNKNOWN"],
      default: "UNKNOWN",
    },
    lastCheck: {
      type: Date,
      default: Date.now,
    },
    responseTimeMs: {
      type: Number,
      min: 0,
      default: null,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
    healthScore: {
      type: Number, // 0-100
      min: 0,
      max: 100,
      default: 100,
    },
    configSnapshot: {
      // Encrypted snapshot of config (without secrets)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    checks: [
      {
        timestamp: Date,
        status: String,
        responseTimeMs: Number,
        errorMessage: String,
      },
    ],
    consecutiveFailures: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastSuccess: {
      type: Date,
    },
    lastFailure: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "integration_health",
  }
);

// Index for quick lookup by service
integrationHealthSchema.index({ service: 1 });
integrationHealthSchema.index({ status: 1 });
integrationHealthSchema.index({ lastCheck: -1 });

// Keep only last 1000 check records per service (limit array size)
integrationHealthSchema.pre("save", function (next) {
  if (this.checks && this.checks.length > 1000) {
    this.checks = this.checks.slice(-1000); // Keep last 1000
  }
  next();
});

module.exports = mongoose.model("IntegrationHealth", integrationHealthSchema);
