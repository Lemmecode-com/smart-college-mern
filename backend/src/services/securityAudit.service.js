const SecurityAudit = require('../models/securityAudit.model');
const logger = require('../utils/logger');

/**
 * Security Audit Service
 * Handles all security event logging and analysis
 */

class SecurityAuditService {
  
  /**
   * Log any security event
   */
  async logEvent(eventData) {
    try {
      console.log('🔒 Creating security audit event:', eventData.eventType, 'for', eventData.userEmail);
      console.log('📝 Full event data:', eventData);
      
      // Use new + save instead of create for better error handling
      const audit = new SecurityAudit(eventData);
      const saved = await audit.save();
      
      console.log('✅ Security audit SAVED to DB:', saved._id);

      // Log to file as backup
      logger.logInfo(`Security Event: ${eventData.eventType}`, {
        userEmail: eventData.userEmail,
        severity: eventData.severity,
        ip: eventData.ipAddress
      });

      // Send alert for HIGH/CRITICAL events (future enhancement)
      if (eventData.severity === 'HIGH' || eventData.severity === 'CRITICAL') {
        await this.sendSecurityAlert(audit);
      }

      return saved;
    } catch (error) {
      // Don't throw - logging failure shouldn't break the app
      console.error('❌ FAILED to save security event:', error.message);
      if (error.name === 'ValidationError') {
        console.error('Validation errors:');
        Object.values(error.errors).forEach(e => console.error('  -', e.path, ':', e.message));
      } else {
        console.error('Error details:', error);
      }
      logger.logError('Failed to log security event', { error: error.message, eventData });
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(user, req) {
    try {
      console.log('📝 logLoginSuccess - user.role:', user.role, 'user.college_id:', user.college_id);
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
      logger.logError('Failed to log login success', { error: error.message, email: user.email });
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
      logger.logError('Failed to log login failed', { error: error.message, email });
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
      logger.logError('Failed to log logout', { error: error.message });
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
      logger.logError('Failed to log password reset request', { error: error.message, email });
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
      logger.logError('Failed to log password reset success', { error: error.message, email });
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
    // For now, just log it
    // Future: Send email to admin
    logger.logWarning(`🚨 SECURITY ALERT: ${audit.eventType}`, {
      severity: audit.severity,
      user: audit.userEmail,
      ip: audit.ipAddress
    });
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
      if (startDate) {
        // Start of the day (include all times from midnight)
        query.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        // End of the day (include all times until 23:59:59)
        query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
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
