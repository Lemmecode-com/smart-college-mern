const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption.util");

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
        "STAFF_CREATED",
        "STAFF_UPDATED",
        "STAFF_ROLE_CHANGED",
        "STAFF_DEACTIVATED",
        "STAFF_REACTIVATED",
        "DEPARTMENT_CREATED",
        "DEPARTMENT_UPDATED",
        "DEPARTMENT_DELETED",
        "HOD_ASSIGNED",
        "TIMETABLE_DELETED",
        "TIMETABLE_ARCHIVED",
        "TIMETABLE_PUBLISHED",
        "TIMETABLE_EXCEPTION_CREATED",
        "TIMETABLE_EXCEPTION_UPDATED",
        "TIMETABLE_EXCEPTION_DELETED",
        "TIMETABLE_EXCEPTION_APPROVED",
        "TIMETABLE_EXCEPTION_REJECTED",
        "TIMETABLE_EXCEPTION_WITHDRAWN",
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
        "Timetable",
        "TimetableException",
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

// ==================== ENCRYPTION HOOKS ===================

const SENSITIVE_FIELDS = ['endpoint', 'ipAddress', 'userAgent', 'userEmail'];

function encryptField(value) {
  if (!value || typeof value !== 'string') return value;
  if (String(value).startsWith('ENC:')) return value;
  return 'ENC:' + encrypt(String(value));
}

function decryptField(value) {
  if (!value || typeof value !== 'string') return value;
  if (!value.startsWith('ENC:')) return value;
  try {
    return decrypt(value.substring(4));
  } catch (e) {
    return '[DECRYPTION_ERROR]';
  }
}

function decryptDoc(doc) {
  if (!doc) return;
  for (const field of SENSITIVE_FIELDS) {
    if (doc[field] !== undefined) {
      doc[field] = decryptField(doc[field]);
    }
  }
}

auditLogSchema.pre('save', function(next) {
  for (const field of SENSITIVE_FIELDS) {
    this[field] = encryptField(this[field]);
  }
  next();
});

auditLogSchema.pre('findOneAndUpdate', async function() {
  const update = this.getUpdate();
  const paths = update.$set || update;
  for (const field of SENSITIVE_FIELDS) {
    if (paths[field] !== undefined) {
      paths[field] = encryptField(paths[field]);
    }
  }
});

auditLogSchema.post('find', function(docs) {
  docs.forEach(decryptDoc);
});

auditLogSchema.post('findOne', function(doc) {
  decryptDoc(doc);
});

auditLogSchema.statics.findDecrypted = function(query) {
  return this.find(query).then(docs => {
    docs.forEach(decryptDoc);
    return docs;
  });
};

auditLogSchema.statics.findByIdDecrypted = function(id) {
  return this.findById(id).then(doc => {
    if (doc) decryptDoc(doc);
    return doc;
  });
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
