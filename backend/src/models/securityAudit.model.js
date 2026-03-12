const mongoose = require('mongoose');

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
    enum: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'HOD', 'TEACHER', 'STUDENT']
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

module.exports = mongoose.model('SecurityAudit', securityAuditSchema);
