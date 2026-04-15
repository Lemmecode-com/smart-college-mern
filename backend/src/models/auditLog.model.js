const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // College Information
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
      index: true,
    },

    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    userRole: {
      type: String,
      enum: ["SUPER_ADMIN", "COLLEGE_ADMIN", "HOD", "TEACHER", "STUDENT"],
      required: true,
    },

    // Action Information
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "APPROVE",
        "REJECT",
        "BULK_APPROVE",
        "BULK_DELETE",
        "EXPORT",
        "IMPORT",
        "DEACTIVATE",
        "REACTIVATE",
      ],
      index: true,
    },

    // Resource Information
    resourceType: {
      type: String,
      required: true,
      enum: [
        "Student",
        "StudentApproval",
        "FeeStructure",
        "Course",
        "Subject",
        "Teacher",
        "User",
        "Department",
        "Payment",
        "Document",
      ],
      index: true,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Data Changes (for UPDATE actions)
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Request Information
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },

    userAgent: {
      type: String,
    },

    endpoint: {
      type: String,
    },

    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    },

    // Additional Context
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },

    // Status
    statusCode: {
      type: Number,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// ==================== INDEXES FOR PERFORMANCE ====================

// Compound index for querying by college and resource
auditLogSchema.index({ collegeId: 1, resourceType: 1, createdAt: -1 });

// Compound index for querying by user actions
auditLogSchema.index({ collegeId: 1, userId: 1, createdAt: -1 });

// Compound index for action types
auditLogSchema.index({ collegeId: 1, action: 1, createdAt: -1 });

// Index for time-range queries
auditLogSchema.index({ createdAt: -1 });

// ==================== STATIC METHODS ====================

// Log an audit event
auditLogSchema.statics.logAudit = async function (auditData) {
  return await this.create(auditData);
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
