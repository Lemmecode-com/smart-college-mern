const SecurityAudit = require('../models/securityAudit.model');
const logger = require('../utils/logger');

/**
 * Security Audit Service
 * Handles all security event logging and analysis
 */

class SecurityAuditService {

  /**
   * Redact PII from data before passing to logger/file transports.
   * - Masks email to show first 2 chars + domain only
   * - Masks IPv4 to show first 2 octets only
   * Does NOT throw - safe to call on any value.
   */
  static redactPII(value) {
    if (value === null || value === undefined) return value;
    const str = String(value);
    // Mask email: ab***@domain.com
    if (str.includes('@')) {
      const [local, domain] = str.split('@');
      if (local.length <= 2) return `${local}***@${domain}`;
      return `${local.slice(0, 2)}***@${domain}`;
    }
    // Mask IPv4: 192.168.***.***
    const ipv4Match = str.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      return `${ipv4Match[1]}.${ipv4Match[2]}.***.***`;
    }
    // Mask IPv6: show first 4 hextets only
    if (str.includes(':')) {
      const parts = str.split(':');
      if (parts.length > 4) {
        return `${parts.slice(0, 4).join(':')}::***`;
      }
    }
    return str;
  }

  static redactObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const piiKeys = ['userEmail', 'email', 'ipAddress', 'ip', 'userAgent', 'password', 'token', 'otp', 'accessToken', 'refreshToken'];
    const copy = { ...obj };
    for (const key of piiKeys) {
      if (copy[key] !== undefined) {
        copy[key] = SecurityAuditService.redactPII(copy[key]);
      }
    }
    return copy;
  }

  /**
   * Log any security event
   */
  async logEvent(eventData) {
    try {
      const safeMeta = SecurityAuditService.redactObject({
        eventType: eventData.eventType,
        category: eventData.category,
        severity: eventData.severity,
        userId: eventData.userId,
        userEmail: eventData.userEmail,
        ipAddress: eventData.ipAddress,
        endpoint: eventData.endpoint,
        statusCode: eventData.statusCode,
      });

      logger.logInfo(`Security Event: ${eventData.eventType}`, safeMeta);

      const audit = new SecurityAudit(eventData);
      const saved = await audit.save();

      logger.logInfo(`Security audit saved: ${saved._id}`, {
        auditId: saved._id,
        eventType: eventData.eventType,
        status: 'saved',
      });

      if (eventData.severity === 'HIGH' || eventData.severity === 'CRITICAL') {
        await this.sendSecurityAlert(saved);
      }

      return saved;
    } catch (error) {
      const safeErrorMeta = SecurityAuditService.redactObject({
        eventType: eventData?.eventType,
        category: eventData?.category,
        severity: eventData?.severity,
        userId: eventData?.userId,
        userEmail: eventData?.userEmail,
        ipAddress: eventData?.ipAddress,
      });

      logger.logError('Failed to save security event', safeErrorMeta);
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(user, req) {
    try {
      return await this.logEvent({
        eventType: 'LOGIN_SUCCESS',
        category: 'AUTHENTICATION',
        severity: 'LOW',
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        collegeId: user.college_id || null,  // Ensure it's saved
        ipAddress: this.getClientIP(req),
        userAgent: req.get('user-agent'),
        endpoint: '/api/auth/login',
        method: 'POST',
        statusCode: 200,
        metadata: {
          loginTime: new Date(),
          success: true
        }
      });
    } catch (error) {
      logger.logError('Failed to log login success', { email: user.email });
    }
  }

  /**
   * Log failed login
   */
  async logLoginFailed(email, req, reason = 'INVALID_CREDENTIALS') {
    try {
      const severity = await this.determineSeverity(email, req);
      
      return await this.logEvent({
        eventType: 'LOGIN_FAILED',
        category: 'AUTHENTICATION',
        severity: severity,
        userEmail: email,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('user-agent'),
        endpoint: '/api/auth/login',
        method: 'POST',
        statusCode: 401,
        metadata: {
          reason: reason,
          failedAt: new Date()
        }
      });
    } catch (error) {
      logger.logError('Failed to log login failed', { email });
    }
  }

  /**
   * Log logout
   */
  async logLogout(user, req, sessionDuration = 'Unknown') {
    try {
      return await this.logEvent({
        eventType: 'LOGOUT',
        category: 'AUTHENTICATION',
        severity: 'LOW',
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        collegeId: user?.college_id || null,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('user-agent'),
        endpoint: '/api/auth/logout',
        method: 'POST',
        statusCode: 200,
        metadata: {
          sessionDuration: sessionDuration,
          logoutTime: new Date()
        }
      });
    } catch (error) {
      logger.logError('Failed to log logout');
    }
  }

  /**
   * Log permission denied
   */
  async logPermissionDenied(user, req, resource) {
    return await this.logEvent({
      eventType: 'PERMISSION_DENIED',
      category: 'AUTHORIZATION',
      severity: 'MEDIUM',
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      collegeId: user?.college_id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('user-agent'),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 403,
      metadata: {
        resource: resource,
        requiredRole: resource
      }
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(email, req) {
    try {
      return await this.logEvent({
        eventType: 'PASSWORD_RESET_REQUEST',
        category: 'AUTHENTICATION',
        severity: 'MEDIUM',
        userEmail: email,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('user-agent'),
        endpoint: '/api/auth/forgot-password',
        method: 'POST',
        statusCode: 200,
        metadata: {
          requestedAt: new Date()
        }
      });
    } catch (error) {
      logger.logError('Failed to log password reset request', { email });
    }
  }

  /**
   * Log password reset success
   */
  async logPasswordResetSuccess(email, req) {
    try {
      return await this.logEvent({
        eventType: 'PASSWORD_RESET_SUCCESS',
        category: 'AUTHENTICATION',
        severity: 'MEDIUM',
        userEmail: email,
        ipAddress: this.getClientIP(req),
        userAgent: req.get('user-agent'),
        endpoint: '/api/auth/reset-password',
        method: 'POST',
        statusCode: 200,
        metadata: {
          resetAt: new Date()
        }
      });
    } catch (error) {
      logger.logError('Failed to log password reset success', { email });
    }
  }

   /**
    * Log brute force detection
    */
   async logBruteForceDetected(ip, email, attempts) {
     return await this.logEvent({
       eventType: 'BRUTE_FORCE_DETECTED',
       category: 'SYSTEM',
       severity: 'CRITICAL',
       userEmail: email,
       ipAddress: ip,
       endpoint: '/api/auth/login',
       method: 'POST',
       statusCode: 429,
       metadata: {
         attempts: attempts,
         detectedAt: new Date(),
         action: 'IP_BLOCKED'
       }
     });
   }

   /**
    * Log password change success
    */
   async logPasswordChangeSuccess(user, req) {
     try {
       return await this.logEvent({
         eventType: 'PASSWORD_CHANGE_SUCCESS',
         category: 'AUTHENTICATION',
         severity: 'MEDIUM',
         userId: user._id,
         userEmail: user.email,
         userRole: user.role,
         collegeId: user.college_id || null,
         ipAddress: this.getClientIP(req),
         userAgent: req.get('user-agent'),
         endpoint: '/api/auth/change-password',
         method: 'POST',
         statusCode: 200,
         metadata: {
           changedAt: new Date()
         }
       });
     } catch (error) {
        logger.logError('Failed to log password change success', { email: user.email });
     }
   }

   /**
    * Log password change failure
    */
   async logPasswordChangeFailed(user, req, reason = 'INVALID_CURRENT_PASSWORD') {
     try {
       return await this.logEvent({
         eventType: 'PASSWORD_CHANGE_FAILED',
         category: 'AUTHENTICATION',
         severity: 'HIGH',
         userId: user._id,
         userEmail: user.email,
         userRole: user.role,
         collegeId: user.college_id || null,
         ipAddress: this.getClientIP(req),
         userAgent: req.get('user-agent'),
         endpoint: '/api/auth/change-password',
         method: 'POST',
         statusCode: 401,
         metadata: {
           reason: reason,
           failedAt: new Date()
         }
       });
     } catch (error) {
        logger.logError('Failed to log password change failed', { email: user.email });
     }
   }

  /**
   * Log unauthorized access (token issues)
   */
  async logUnauthorizedAccess(req, reason, statusCode = 401) {
    return await this.logEvent({
      eventType: 'UNAUTHORIZED_ACCESS',
      category: 'AUTHORIZATION',
      severity: 'MEDIUM',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('user-agent'),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: statusCode,
      metadata: {
        reason: reason,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log token blacklisted attempt
   */
  async logBlacklistedTokenAttempt(user, req) {
    return await this.logEvent({
      eventType: 'TOKEN_BLACKLISTED',
      category: 'AUTHENTICATION',
      severity: 'HIGH',
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      collegeId: user?.college_id,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('user-agent'),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 401,
      metadata: {
        reason: 'ATTEMPTED_WITH_BLACKLISTED_TOKEN',
        timestamp: new Date()
      }
    });
  }

  /**
   * Determine severity based on failed attempts
   */
  async determineSeverity(email, req) {
    const ip = this.getClientIP(req);
    const failedCount = await SecurityAudit.getFailedLoginsByIP(ip, 1);
    
    if (failedCount >= 10) return 'CRITICAL';
    if (failedCount >= 5) return 'HIGH';
    if (failedCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get client IP (handles proxies)
   */
  getClientIP(req) {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           'unknown';
  }

  /**
   * Send security alert email (for HIGH/CRITICAL events)
   * TODO: Integrate with email service for real alerts
   */
  async sendSecurityAlert(audit) {
    const safeAlert = SecurityAuditService.redactObject({
      eventType: audit.eventType,
      severity: audit.severity,
      userEmail: audit.userEmail,
      ipAddress: audit.ipAddress,
    });
    logger.logWarning(`SECURITY ALERT: ${audit.eventType}`, safeAlert);
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters) {
    const {
      collegeId,
      eventType,
      category,
      severity,
      userEmail,
      startDate,
      endDate,
      reviewed,
      page = 1,
      limit = 20
    } = filters;

    const query = {};

    if (collegeId) query.collegeId = collegeId;
    if (eventType) query.eventType = eventType;
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (userEmail) query.userEmail = userEmail;
    if (reviewed !== undefined) query.reviewed = reviewed;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      SecurityAudit.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email role')
        .populate('collegeId', 'name code'),
      SecurityAudit.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get security dashboard stats
   */
  async getDashboardStats(collegeId) {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const query = collegeId ? { collegeId } : {};

    const [
      total24h,
      failedLogins24h,
      criticalEvents24h,
      total7d,
      topEventTypes,
      topIPs
    ] = await Promise.all([
      SecurityAudit.countDocuments({ ...query, createdAt: { $gte: last24Hours } }),
      SecurityAudit.countDocuments({ 
        ...query, 
        eventType: 'LOGIN_FAILED',
        createdAt: { $gte: last24Hours } 
      }),
      SecurityAudit.countDocuments({ 
        ...query, 
        severity: 'CRITICAL',
        createdAt: { $gte: last24Hours } 
      }),
      SecurityAudit.countDocuments({ ...query, createdAt: { $gte: last7Days } }),
      SecurityAudit.aggregate([
        { $match: query },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      SecurityAudit.aggregate([
        { $match: { ...query, eventType: 'LOGIN_FAILED' } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      last24Hours: {
        totalEvents: total24h,
        failedLogins: failedLogins24h,
        criticalEvents: criticalEvents24h
      },
      last7Days: {
        totalEvents: total7d
      },
      topEventTypes,
      suspiciousIPs: topIPs
    };
  }
}

module.exports = new SecurityAuditService();
