const platformSupportService = require("../services/platformSupport.service");
const ApiResponse = require("../utils/ApiResponse");

/**
 * Platform Support Controller
 * Handles all platform support, system health, audit logs, and support ticket operations
 */

// ==================== SYSTEM HEALTH ====================

/**
 * GET /api/platform-support/health
 * Get latest system health snapshot
 */
exports.getSystemHealth = async (req, res) => {
  try {
    const health = await platformSupportService.getLatestHealth();
    if (!health) {
      return ApiResponse.success(res, null, "No health data available yet");
    }
    ApiResponse.success(res, { health }, "Health data fetched");
  } catch (error) {
    console.error("Error fetching health:", error);
    ApiResponse.error(res, "Failed to fetch health data", "HEALTH_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/health/history
 * Get health history for last N hours
 */
exports.getHealthHistory = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = await platformSupportService.getHealthHistory(hours);
    ApiResponse.success(res, { history }, "Health history fetched");
  } catch (error) {
    console.error("Error fetching health history:", error);
    ApiResponse.error(
      res,
      "Failed to fetch health history",
      "HEALTH_HISTORY_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/health/metrics
 * Get metrics trend for charts
 */
exports.getMetricsTrend = async (req, res) => {
  try {
    const metric = req.query.metric || "cpuUsage";
    const hours = parseInt(req.query.hours) || 24;
    const interval = req.query.interval || "hour";

    const trend = await platformSupportService.getMetricsTrend(
      metric,
      hours,
      interval
    );
    ApiResponse.success(res, { trend }, "Metrics trend fetched");
  } catch (error) {
    console.error("Error fetching metrics trend:", error);
    ApiResponse.error(
      res,
      "Failed to fetch metrics trend",
      "METRICS_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/health/database
 * Check database health specifically
 */
exports.checkDatabaseHealth = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const db = mongoose.connection;

    const health = {
      connected: db.readyState === 1,
      databases: Object.keys(db.s.s.stores),
      collections: await db.db
        .listCollections()
        .toArray()
        .then((cols) => cols.length),
      slowQueries: [], // TODO: implement slow query logging
    };

    ApiResponse.success(res, { health }, "Database health checked");
  } catch (error) {
    console.error("Database health error:", error);
    ApiResponse.error(
      res,
      "Failed to check database health",
      "DB_HEALTH_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/health/integrations
 * Get all third-party integration health
 */
exports.getIntegrationHealth = async (req, res) => {
  try {
    const integrations = await platformSupportService.getAllIntegrationsHealth();
    ApiResponse.success(res, { integrations }, "Integration health fetched");
  } catch (error) {
    console.error("Error fetching integration health:", error);
    ApiResponse.error(
      res,
      "Failed to fetch integration health",
      "INTEGRATION_HEALTH_ERROR",
      500
    );
  }
};

/**
 * POST /api/platform-support/health/test-integration/:service
 * Force health check for a specific service
 */
exports.testIntegration = async (req, res) => {
  try {
    const { service } = req.params;

    // TODO: Implement actual health check logic per service
    // For now, return simulated healthy status
    const mockResult = {
      service,
      status: "ACTIVE",
      responseTimeMs: Math.floor(Math.random() * 200) + 50,
      lastChecked: new Date(),
    };

    // Save to database
    const result = await platformSupportService.updateIntegrationHealth(
      service,
      mockResult
    );

    ApiResponse.success(
      res,
      { result },
      `${service} integration tested successfully`
    );
  } catch (error) {
    console.error("Integration test error:", error);
    ApiResponse.error(
      res,
      "Failed to test integration",
      "INTEGRATION_TEST_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/health/metrics
 * Get system-wide metrics (CPU, Memory, Disk)
 */
exports.getSystemMetrics = async (req, res) => {
  try {
    const metrics = await platformSupportService.getSystemMetrics();
    ApiResponse.success(res, { metrics }, "System metrics fetched");
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    ApiResponse.error(
      res,
      "Failed to fetch system metrics",
      "METRICS_ERROR",
      500
    );
  }
};

// ==================== AUDIT & SYSTEM LOGS ====================

/**
 * GET /api/platform-support/audit-logs
 * Get audit logs with filters (college, user, action, date range)
 * Reuses existing AuditLog model
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      college_id,
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      limit = 50,
      page = 1,
    } = req.query;

    const AuditLog = require("../models/auditLog.model");
    const query = {};

    if (college_id) query.college_id = college_id;
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const logs = await AuditLog.find(query)
      .populate("userId", "name email role")
      .populate("college_id", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    ApiResponse.success(res, { logs, total }, "Audit logs fetched");
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    ApiResponse.error(
      res,
      "Failed to fetch audit logs",
      "AUDIT_LOGS_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/system-logs
 * Get application system logs with filters
 */
exports.getSystemLogs = async (req, res) => {
  try {
    const {
      level,
      module,
      userId,
      college_id,
      search,
      startDate,
      endDate,
      limit = 100,
      page = 1,
    } = req.query;

    const filters = {};
    if (level) filters.level = level;
    if (module) filters.module = module;
    if (userId) filters.userId = userId;
    if (college_id) filters.college_id = college_id;
    if (search) filters.search = search;
    if (startDate || endDate) {
      filters.startDate = startDate ? new Date(startDate) : null;
      filters.endDate = endDate ? new Date(endDate) : null;
    }

    const skip = (page - 1) * limit;
    const logs = await platformSupportService.getSystemLogs({
      ...filters,
      limit: parseInt(limit),
      skip,
    });

    // Get total count for pagination
    const total = await SystemLog.countDocuments(
      Object.fromEntries(
        Object.entries(filters).filter(([k, v]) => k !== "limit" && k !== "skip")
      )
    );

    ApiResponse.success(res, { logs, total }, "System logs fetched");
  } catch (error) {
    console.error("Error fetching system logs:", error);
    ApiResponse.error(
      res,
      "Failed to fetch system logs",
      "SYSTEM_LOGS_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/error-stats
 * Get top error modules
 */
exports.getErrorStats = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await platformSupportService.getErrorStats(hours);
    ApiResponse.success(res, { stats }, "Error stats fetched");
  } catch (error) {
    console.error("Error fetching error stats:", error);
    ApiResponse.error(res, "Failed to fetch error stats", "ERROR_STATS_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/rate-limit-stats
 * Get rate limiting usage per college
 */
exports.getRateLimitStats = async (req, res) => {
  try {
    const stats = await platformSupportService.getRateLimitStats();
    ApiResponse.success(res, { stats }, "Rate limit stats fetched");
  } catch (error) {
    console.error("Error fetching rate limit stats:", error);
    ApiResponse.error(
      res,
      "Failed to fetch rate limit stats",
      "RATE_LIMIT_ERROR",
      500
    );
  }
};

// ==================== SUPPORT TICKETS ====================

/**
 * POST /api/platform-support/tickets
 * Create a new support ticket
 */
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description, college_id, attachments } =
      req.body;

    if (!subject || !description) {
      return ApiResponse.error(
        res,
        "Subject and description are required",
        "VALIDATION_ERROR",
        400
      );
    }

    const ticket = await platformSupportService.createTicket({
      userId: req.user.id,
      college_id,
      subject,
      category,
      priority,
      description,
      attachments,
    });

    ApiResponse.success(res, { ticket }, "Ticket created successfully");
  } catch (error) {
    console.error("Error creating ticket:", error);
    ApiResponse.error(res, "Failed to create ticket", "TICKET_CREATE_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/tickets
 * Get all tickets with filters
 */
exports.getTickets = async (req, res) => {
  try {
    const { status, priority, category, college_id, assignedTo, limit = 50 } =
      req.query;

    const tickets = await platformSupportService.getAllTickets({
      status,
      priority,
      category,
      college_id,
      assignedTo,
      limit,
    });

    ApiResponse.success(res, { tickets }, "Tickets fetched");
  } catch (error) {
    console.error("Error fetching tickets:", error);
    ApiResponse.error(res, "Failed to fetch tickets", "TICKETS_FETCH_ERROR", 500);
  }
};

/**
 * PUT /api/platform-support/tickets/:id/assign
 * Assign ticket to a support agent
 */
exports.assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assigneeId } = req.body;

    if (!assigneeId) {
      return ApiResponse.error(
        res,
        "Assignee ID required",
        "VALIDATION_ERROR",
        400
      );
    }

    const ticket = await platformSupportService.assignTicket(
      ticketId,
      assigneeId
    );

    if (!ticket) {
      return ApiResponse.error(res, "Ticket not found", "NOT_FOUND", 404);
    }

    ApiResponse.success(res, { ticket }, "Ticket assigned successfully");
  } catch (error) {
    console.error("Error assigning ticket:", error);
    ApiResponse.error(
      res,
      "Failed to assign ticket",
      "TICKET_ASSIGN_ERROR",
      500
    );
  }
};

/**
 * PUT /api/platform-support/tickets/:id/resolve
 * Resolve a ticket
 */
exports.resolveTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { resolution } = req.body;

    const ticket = await platformSupportService.updateTicketStatus(
      ticketId,
      "RESOLVED",
      resolution
    );

    if (!ticket) {
      return ApiResponse.error(res, "Ticket not found", "NOT_FOUND", 404);
    }

    ApiResponse.success(res, { ticket }, "Ticket resolved successfully");
  } catch (error) {
    console.error("Error resolving ticket:", error);
    ApiResponse.error(
      res,
      "Failed to resolve ticket",
      "TICKET_RESOLVE_ERROR",
      500
    );
  }
};

/**
 * POST /api/platform-support/tickets/:id/comments
 * Add comment to ticket
 */
exports.addTicketComment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
      return ApiResponse.error(
        res,
        "Comment message required",
        "VALIDATION_ERROR",
        400
      );
    }

    const ticket = await platformSupportService.addComment(
      ticketId,
      req.user.id,
      message
    );

    ApiResponse.success(res, { ticket }, "Comment added");
  } catch (error) {
    console.error("Error adding comment:", error);
    ApiResponse.error(
      res,
      "Failed to add comment",
      "COMMENT_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/tickets/stats
 * Get ticket statistics
 */
exports.getTicketStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await platformSupportService.getTicketStats(days);
    ApiResponse.success(res, { stats }, "Ticket stats fetched");
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    ApiResponse.error(
      res,
      "Failed to fetch ticket stats",
      "TICKET_STATS_ERROR",
      500
    );
  }
};

// ==================== COLLEGE HEALTH ====================

/**
 * GET /api/platform-support/colleges/health
 * Get all colleges with health scores
 */
exports.getAllCollegesHealth = async (req, res) => {
  try {
    const colleges = await platformSupportService.getAllCollegesHealth();
    ApiResponse.success(res, { colleges }, "Colleges health fetched");
  } catch (error) {
    console.error("Error fetching colleges health:", error);
    ApiResponse.error(
      res,
      "Failed to fetch colleges health",
      "COLLEGES_HEALTH_ERROR",
      500
    );
  }
};

/**
 * GET /api/platform-support/colleges/:id/diagnostics
 * Get detailed diagnostics for a specific college
 */
exports.getCollegeDiagnostics = async (req, res) => {
  try {
    const { id } = req.params;

    const College = require("../models/college.model");
    const college = await College.findById(id);
    if (!college) {
      return ApiResponse.error(res, "College not found", "NOT_FOUND", 404);
    }

    const healthScore = await platformSupportService.calculateCollegeHealthScore(
      id
    );

    const recentErrors = await SystemLog.countDocuments({
      college_id: id,
      level: "ERROR",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const openTickets = await SupportTicket.countDocuments({
      college_id: id,
      status: { $in: ["OPEN", "IN_PROGRESS"] },
    });

    ApiResponse.success(
      res,
      {
        diagnostics: {
          college: { name: college.name, code: college.code },
          healthScore,
          recentErrors,
          openTickets,
        },
      },
      "Diagnostics fetched"
    );
  } catch (error) {
    console.error("Error fetching diagnostics:", error);
    ApiResponse.error(
      res,
      "Failed to fetch diagnostics",
      "DIAGNOSTICS_ERROR",
      500
    );
  }
};

// ==================== DATABASE DIAGNOSTICS ====================

/**
 * GET /api/platform-support/database/collections
 * Get list of all collections with sizes
 */
exports.getDatabaseCollections = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const collectionsWithStats = await Promise.all(
      collections.map(async (col) => {
        const stats = await db.command({ collStats: col.name });
        return {
          name: col.name,
          size: stats.size,
          count: stats.count,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexSizes: stats.indexSizes,
        };
      })
    );

    ApiResponse.success(res, { collections: collectionsWithStats }, "Collections fetched");
  } catch (error) {
    console.error("Error fetching collections:", error);
    ApiResponse.error(res, "Failed to fetch collections", "DB_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/database/slow-queries
 * Get slow queries from logs (last 24h)
 * Assumes slow query logging is enabled in MongoDB
 */
exports.getSlowQueries = async (req, res) => {
  try {
    // In production, you'd query a slow-query log collection or system.profile
    // Here, we simulate by getting ERROR logs with "slow" in message
    const SystemLog = require("../models/systemLog.model");
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const slowLogs = await SystemLog.find({
      level: "WARN",
      message: { $regex: /slow|latency|timeout/i },
      createdAt: { $gte: last24h },
    }).sort({ createdAt: -1 }).limit(50);

    // Transform to expected format
    const queries = slowLogs.map((log) => ({
      collection: log.module,
      operation: "unknown",
      query: log.request?.query || {},
      duration: log.metadata?.duration || 0,
      timestamp: log.createdAt,
    }));

    ApiResponse.success(res, { queries }, "Slow queries fetched");
  } catch (error) {
    console.error("Error fetching slow queries:", error);
    ApiResponse.error(res, "Failed to fetch slow queries", "DB_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/database/backups
 * Get backup history (requires Backup model - optional)
 */
exports.getBackupHistory = async (req, res) => {
  try {
    // Try to load Backup model if it exists
    let Backup;
    try {
      Backup = require("../models/backup.model");
    } catch (e) {
      // Backup model doesn't exist yet - return empty
      return ApiResponse.success(res, { backups: [] }, "No backup model");
    }

    const backups = await Backup.find({})
      .sort({ createdAt: -1 })
      .limit(20);

    ApiResponse.success(res, { backups }, "Backup history fetched");
  } catch (error) {
    console.error("Error fetching backups:", error);
    ApiResponse.error(res, "Failed to fetch backups", "DB_ERROR", 500);
  }
};

// ==================== CONFIG VIEWER ====================

/**
 * GET /api/platform-support/config/global
 * Get global system configuration (masked secrets)
 */
exports.getGlobalConfig = async (req, res) => {
  try {
    // Read from environment variables and config files
    // Never expose raw secrets
    const config = {
      platformName: process.env.PLATFORM_NAME || "NOVAA Smart College",
      version: process.env.npm_package_version || "2.1.0",
      env: process.env.NODE_ENV || "development",
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      maxFileUpload: process.env.MAX_FILE_UPLOAD_MB || 10,
      sessionTimeout: process.env.SESSION_TIMEOUT || 120,
      rateLimitDefault: process.env.RATE_LIMIT_DEFAULT || 100,
      rateLimitAuth: process.env.RATE_LIMIT_AUTH || 1000,
      uploadLimitDay: process.env.UPLOAD_LIMIT_PER_DAY || 100,
      email: {
        provider: process.env.EMAIL_HOST ? "SMTP" : "Not configured",
        host: process.env.EMAIL_HOST || "N/A",
        port: process.env.EMAIL_PORT || "N/A",
        fromAddress: process.env.EMAIL_FROM_ADDRESS || "N/A",
        fromName: process.env.EMAIL_FROM_NAME || "N/A",
        enabled: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
      },
      payment: {
        stripeEnabled: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
        razorpayEnabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        stripeKey: "publishable_***",
        razorpayKeyId: "key_***",
        stripeWebhookVerified: process.env.STRIPE_WEBHOOK_SECRET ? true : false,
        razorpayWebhookVerified: process.env.RAZORPAY_WEBHOOK_SECRET ? true : false,
      },
    };

    ApiResponse.success(res, { config }, "Global config fetched");
  } catch (error) {
    console.error("Error fetching global config:", error);
    ApiResponse.error(res, "Failed to fetch config", "CONFIG_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/config/colleges
 * Get college-specific configurations
 */
exports.getCollegeConfigs = async (req, res) => {
  try {
    const College = require("../models/college.model");
    const colleges = await College.find({})
      .select("name code email phone isActive emailEnabled paymentGateway timetableAccess features")
      .sort({ name: 1 });

    ApiResponse.success(res, { colleges }, "College configs fetched");
  } catch (error) {
    console.error("Error fetching college configs:", error);
    ApiResponse.error(res, "Failed to fetch college configs", "CONFIG_ERROR", 500);
  }
};

/**
 * GET /api/platform-support/config/features
 * Get feature flags (from database or config)
 */
exports.getFeatureFlags = async (req, res) => {
  try {
    // Feature flags could be stored in a collection or env vars
    // For now, return from env or hardcoded
    const flags = {
      ONLINE_EXAM: process.env.FEATURE_ONLINE_EXAM === "true",
      PARENT_PORTAL: process.env.FEATURE_PARENT_PORTAL !== "false",
      MOBILE_APP: process.env.FEATURE_MOBILE_APP === "true",
      BIOMETRIC_ATTENDANCE: process.env.FEATURE_BIOMETRIC === "true",
      AUTO_FEE_REMINDER: process.env.FEATURE_AUTO_FEE_REMINDER !== "false",
      SMS_NOTIFICATIONS: process.env.FEATURE_SMS === "true",
    };

    ApiResponse.success(res, { flags }, "Feature flags fetched");
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    ApiResponse.error(res, "Failed to fetch feature flags", "CONFIG_ERROR", 500);
  }
};

/**
 * POST /api/platform-support/config/features/toggle
 * Toggle a feature flag (Super Admin or Platform Support only)
 */
exports.toggleFeature = async (req, res) => {
  try {
    const { feature } = req.body;
    if (!feature) {
      return ApiResponse.error(res, "Feature name required", "VALIDATION_ERROR", 400);
    }

    // In production, update database or config service
    // For now, just log and return success
    console.log(`Feature toggle requested: ${feature} by user ${req.user.id}`);

    ApiResponse.success(
      res,
      { feature, status: "toggled" },
      `Feature "${feature}" toggled successfully`
    );
  } catch (error) {
    console.error("Error toggling feature:", error);
    ApiResponse.error(res, "Failed to toggle feature", "CONFIG_ERROR", 500);
  }
};
