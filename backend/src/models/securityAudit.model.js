const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption.util');

const securityAuditSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication Events
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS',
      'PASSWORD_CHANGE_SUCCESS',
      'PASSWORD_CHANGE_FAILED',
      'PASSWORD_CHANGE',
      'TOKEN_REFRESH',
      'TOKEN_BLACKLISTED',
      
      // Authorization Events
      'PERMISSION_DENIED',
      'UNAUTHORIZED_ACCESS',
      'ROLE_CHANGE',
      'ADMIN_ACTION',
      
      // Data Events
      'BULK_DATA_EXPORT',
      'SENSITIVE_DATA_ACCESS',
      'DATA_MODIFICATION',
      'DATA_DELETION',
      
      // System Events
      'RATE_LIMIT_HIT',
      'SUSPICIOUS_IP',
      'BRUTE_FORCE_DETECTED',
      'SECURITY_POLICY_VIOLATION'
    ],
    index: true
  },

  category: {
    type: String,
    required: true,
    enum: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SYSTEM'],
    default: 'AUTHENTICATION',
    index: true
  },

  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },

  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  userEmail: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },

  userRole: {
    type: String,
    enum: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT', 'ADMISSION_OFFICER', 'EXAM_COORDINATOR', 'PARENT_GUARDIAN', 'PLATFORM_SUPPORT', 'TEACHER', 'STUDENT']
  },

  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    index: true,
    default: null  // Allow null for Super Admin events
  },

  // Request Information
  ipAddress: {
    type: String,
    required: true,
    index: true
  },

  userAgent: {
    type: String
  },

  endpoint: {
    type: String
  },

  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },

  statusCode: {
    type: Number
  },

  // Additional Context
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Review Status
  reviewed: {
    type: Boolean,
    default: false
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: {
    type: Date
  },

  notes: {
    type: String
  }

}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// ==================== INDEXES FOR PERFORMANCE ====================

// Index for querying by time range
securityAuditSchema.index({ createdAt: -1 });

// Compound index for common queries
securityAuditSchema.index({ userEmail: 1, createdAt: -1 });
securityAuditSchema.index({ collegeId: 1, eventType: 1, createdAt: -1 });
securityAuditSchema.index({ severity: 1, reviewed: 1 });

// ==================== TTL FOR AUTO-CLEANUP ====================
// Auto-delete logs older than 90 days (configurable)
securityAuditSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days in seconds
);

// ==================== STATIC METHODS ====================

// Log a security event
securityAuditSchema.statics.logEvent = async function(eventData) {
  return await this.create(eventData);
};

// Get failed login attempts by IP in last hour
securityAuditSchema.statics.getFailedLoginsByIP = async function(ip, hours = 1) {
  const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
  return await this.countDocuments({
    ipAddress: ip,
    eventType: 'LOGIN_FAILED',
    createdAt: { $gte: hoursAgo }
  });
};

// Check for brute force attack
securityAuditSchema.statics.isBruteForceAttack = async function(ip, threshold = 5) {
  const count = await this.getFailedLoginsByIP(ip, 1);
  return count >= threshold;
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

securityAuditSchema.pre('save', function(next) {
  for (const field of SENSITIVE_FIELDS) {
    this[field] = encryptField(this[field]);
  }
  next();
});

securityAuditSchema.pre('findOneAndUpdate', async function() {
  const update = this.getUpdate();
  const paths = update.$set || update;
  for (const field of SENSITIVE_FIELDS) {
    if (paths[field] !== undefined) {
      paths[field] = encryptField(paths[field]);
    }
  }
});

securityAuditSchema.post('find', function(docs) {
  docs.forEach(decryptDoc);
});

securityAuditSchema.post('findOne', function(doc) {
  decryptDoc(doc);
});

securityAuditSchema.statics.findDecrypted = function(query) {
  return this.find(query).then(docs => {
    docs.forEach(decryptDoc);
    return docs;
  });
};

securityAuditSchema.statics.findByIdDecrypted = function(id) {
  return this.findById(id).then(doc => {
    if (doc) decryptDoc(doc);
    return doc;
  });
};

module.exports = mongoose.model('SecurityAudit', securityAuditSchema);
