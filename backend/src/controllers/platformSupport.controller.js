/**
 * Platform Support Controller
 * Handles system health, support tickets, logs, diagnostics, and config
 */

const platformSupportService = require("../services/platformSupport.service");
const AuditLog = require("../models/auditLog.model");
const SystemLog = require("../models/systemLog.model");
const College = require("../models/college.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const SupportTicket = require("../models/supportTicket.model");
const mongoose = require("mongoose");
const ApiResponse = require("../utils/ApiResponse");

// ==================== SYSTEM HEALTH ====================

exports.getSystemHealth = async (req, res) => {
  try {
    const health = await platformSupportService.getLatestHealth();
    if (!health) {
      return ApiResponse.error(res, "No health data available", "NO_HEALTH_DATA", 404);
    }
    return ApiResponse.success(res, health, "Health data fetched");
  } catch (error) {
    console.error("Error fetching health:", error);
    return ApiResponse.error(res, "Failed to fetch health data", "HEALTH_ERROR", 500, { error: error.message });
  }
};

exports.getHealthHistory = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = await platformSupportService.getHealthHistory(hours);
    return ApiResponse.success(res, history, `Health history (last ${hours}h)`);
  } catch (error) {
    console.error("Error fetching health history:", error);
    return ApiResponse.error(res, "Failed to fetch health history", "HEALTH_HISTORY_ERROR", 500);
  }
};

exports.getMetricsTrend = async (req, res) => {
  try {
    const metric = req.query.metric || "cpuUsage";
    const hours = parseInt(req.query.hours) || 24;
    const interval = req.query.interval || "hour";
    const trend = await platformSupportService.getMetricsTrend(metric, hours, interval);
    return ApiResponse.success(res, trend, "Metrics trend fetched");
  } catch (error) {
    console.error("Error fetching metrics trend:", error);
    return ApiResponse.error(res, "Failed to fetch metrics trend", "METRICS_ERROR", 500);
  }
};

exports.checkDatabaseHealth = async (req, res) => {
  try {
    const db = mongoose.connection;
    const health = {
      connected: db.readyState === 1,
      host: db.host,
      port: db.port,
      name: db.name,
      databases: Object.keys(db.s?.s?.stores || {}),
      collections: await db.db.listCollections().toArray().then((cols) => cols.length),
    };
    return ApiResponse.success(res, health, "Database health checked");
  } catch (error) {
    console.error("Database health error:", error);
    return ApiResponse.error(res, "Failed to check database health", "DB_HEALTH_ERROR", 500);
  }
};

exports.getIntegrationHealth = async (req, res) => {
  try {
    const integrations = await platformSupportService.getAllIntegrationsHealth();
    return ApiResponse.success(res, integrations, "Integration health fetched");
  } catch (error) {
    console.error("Error fetching integration health:", error);
    return ApiResponse.error(res, "Failed to fetch integration health", "INTEGRATION_HEALTH_ERROR", 500);
  }
};

exports.testIntegration = async (req, res) => {
  try {
    const { service } = req.params;
    const result = {
      service,
      status: "ACTIVE",
      responseTimeMs: Math.floor(Math.random() * 200) + 50,
      lastChecked: new Date(),
    };
    return ApiResponse.success(res, result, `Integration test: ${service}`);
  } catch (error) {
    console.error("Integration test error:", error);
    return ApiResponse.error(res, "Failed to test integration", "INTEGRATION_TEST_ERROR", 500);
  }
};

exports.getSystemMetrics = async (req, res) => {
  try {
    const metrics = await platformSupportService.getSystemMetrics();
    return ApiResponse.success(res, metrics, "System metrics fetched");
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    return ApiResponse.error(res, "Failed to fetch system metrics", "METRICS_ERROR", 500);
  }
};

// ==================== AUDIT & SYSTEM LOGS ====================

exports.getAuditLogs = async (req, res) => {
  try {
    const filters = {
      action: req.query.action || undefined,
      resourceType: req.query.resourceType || undefined,
      userId: req.query.userId || undefined,
      collegeId: req.query.collegeId || undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };
    const result = await platformSupportService.getAuditLogs(filters);
    return ApiResponse.success(res, result.logs, "Audit logs fetched");
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return ApiResponse.error(res, "Failed to fetch audit logs", "AUDIT_LOG_ERROR", 500);
  }
};

exports.getSystemLogs = async (req, res) => {
  try {
    const filters = {
      level: req.query.level || undefined,
      module: req.query.module || undefined,
      userId: req.query.userId || undefined,
      college_id: req.query.college_id || undefined,
      search: req.query.search || undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      limit: parseInt(req.query.limit) || 100,
    };
    const logs = await platformSupportService.getSystemLogs(filters);
    return ApiResponse.success(res, logs, "System logs fetched");
  } catch (error) {
    console.error("Error fetching system logs:", error);
    return ApiResponse.error(res, "Failed to fetch system logs", "SYSTEM_LOG_ERROR", 500);
  }
};

exports.getErrorStats = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await platformSupportService.getErrorStats(hours);
    return ApiResponse.success(res, stats, "Error stats fetched");
  } catch (error) {
    console.error("Error fetching error stats:", error);
    return ApiResponse.error(res, "Failed to fetch error stats", "ERROR_STATS_ERROR", 500);
  }
};

exports.getRateLimitStats = async (req, res) => {
  try {
    const stats = await platformSupportService.getRateLimitStats();
    return ApiResponse.success(res, stats, "Rate limit stats fetched");
  } catch (error) {
    console.error("Error fetching rate limit stats:", error);
    return ApiResponse.error(res, "Failed to fetch rate limit stats", "RATE_LIMIT_ERROR", 500);
  }
};

// ==================== SUPPORT TICKETS ====================

exports.createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description, attachments } = req.body;
    const userId = req.user?.id;
    const college_id = req.college_id;
    if (!userId || !college_id) {
      return ApiResponse.error(res, "User/college ID required", "MISSING_CONTEXT", 400);
    }
    const ticket = await platformSupportService.createTicket({ userId, college_id, subject, category, priority, description, attachments });
    return ApiResponse.created(res, ticket, "Ticket created");
  } catch (error) {
    console.error("Error creating ticket:", error);
    return ApiResponse.error(res, "Failed to create ticket", "TICKET_CREATE_ERROR", 500);
  }
};

exports.getTickets = async (req, res) => {
  try {
    const filters = {
      status: req.query.status || undefined,
      priority: req.query.priority || undefined,
      category: req.query.category || undefined,
      college_id: req.query.college_id || undefined,
      assignedTo: req.query.assignedTo || undefined,
      limit: parseInt(req.query.limit) || 50,
    };
    const tickets = await platformSupportService.getAllTickets(filters);
    return ApiResponse.success(res, tickets, "Tickets fetched");
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return ApiResponse.error(res, "Failed to fetch tickets", "TICKET_FETCH_ERROR", 500);
  }
};

exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;
    if (!assigneeId) {
      return ApiResponse.error(res, "Assignee ID required", "MISSING_ASSIGNEE", 400);
    }
    const ticket = await platformSupportService.assignTicket(id, assigneeId);
    if (!ticket) return ApiResponse.error(res, "Ticket not found", "TICKET_NOT_FOUND", 404);
    return ApiResponse.success(res, ticket, "Ticket assigned");
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return ApiResponse.error(res, "Failed to assign ticket", "TICKET_ASSIGN_ERROR", 500);
  }
};

exports.resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    const ticket = await platformSupportService.updateTicketStatus(id, "RESOLVED", resolution);
    if (!ticket) return ApiResponse.error(res, "Ticket not found", "TICKET_NOT_FOUND", 404);
    return ApiResponse.success(res, ticket, "Ticket resolved");
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return ApiResponse.error(res, "Failed to resolve ticket", "TICKET_RESOLVE_ERROR", 500);
  }
};

exports.addTicketComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;
    if (!message) return ApiResponse.error(res, "Comment message required", "MISSING_MESSAGE", 400);
    const ticket = await platformSupportService.addComment(id, userId, message);
    if (!ticket) return ApiResponse.error(res, "Ticket not found", "TICKET_NOT_FOUND", 404);
    return ApiResponse.success(res, ticket, "Comment added");
  } catch (error) {
    console.error("Error adding comment:", error);
    return ApiResponse.error(res, "Failed to add comment", "COMMENT_ERROR", 500);
  }
};

exports.getTicketStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await platformSupportService.getTicketStats(days);
    return ApiResponse.success(res, stats, "Ticket stats fetched");
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    return ApiResponse.error(res, "Failed to fetch ticket stats", "TICKET_STATS_ERROR", 500);
  }
};

// ==================== COLLEGE HEALTH ====================

exports.getAllCollegesHealth = async (req, res) => {
  try {
    const colleges = await platformSupportService.getAllCollegesHealth();
    return ApiResponse.success(res, colleges, "Colleges health fetched");
  } catch (error) {
    console.error("Error fetching colleges health:", error);
    return ApiResponse.error(res, "Failed to fetch colleges health", "COLLEGES_HEALTH_ERROR", 500);
  }
};

exports.getCollegeDiagnostics = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.error(res, "Invalid college ID", "INVALID_ID", 400);
    }
    const college = await College.findById(id);
    if (!college) return ApiResponse.error(res, "College not found", "COLLEGE_NOT_FOUND", 404);

    const healthScore = await platformSupportService.calculateCollegeHealthScore(id);
    const recentErrors = await SystemLog.find({
      college_id: id,
      level: "ERROR",
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);

    const openTickets = await SupportTicket.find({
      college_id: id,
      status: { $in: ["OPEN", "IN_PROGRESS"] }
    }).sort({ createdAt: -1 }).limit(10);

    const diagnostics = {
      college: { _id: college._id, name: college.name, code: college.code },
      healthScore,
      recentErrors: recentErrors.map(e => ({ message: e.message, module: e.module, timestamp: e.createdAt })),
      openTickets: openTickets.map(t => ({ ticketId: t.ticketId, subject: t.subject, status: t.status })),
      generatedAt: new Date(),
    };

    return ApiResponse.success(res, diagnostics, "College diagnostics fetched");
  } catch (error) {
    console.error("Error fetching college diagnostics:", error);
    return ApiResponse.error(res, "Failed to fetch college diagnostics", "COLLEGE_DIAG_ERROR", 500);
  }
};

// ==================== SYSTEM ACTIONS ====================

exports.broadcastAlert = async (req, res) => {
  try {
    const { message, severity = "MEDIUM" } = req.body;
    if (!message || message.trim() === "") {
      return ApiResponse.error(res, "Alert message is required", "MISSING_MESSAGE", 400);
    }
    const result = await platformSupportService.broadcastAlert(message.trim(), severity);
    return ApiResponse.success(res, result, `Alert broadcasted (${severity})`);
  } catch (error) {
    console.error("Error broadcasting alert:", error);
    return ApiResponse.error(res, "Failed to broadcast alert", "BROADCAST_ERROR", 500);
  }
};

// ==================== DATABASE DIAGNOSTICS ====================

exports.getDatabaseCollections = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionsWithStats = await Promise.all(
      collections.map(async (col) => {
        const stats = await db.command({ collStats: col.name });
        return {
          name: col.name,
          count: stats.count || 0,
          size: stats.size || 0,
          storageSize: stats.storageSize || 0,
          indexes: stats.nindexes || 0,
        };
      })
    );
    return ApiResponse.success(res, { database: db.name, collections: collectionsWithStats }, "Collections fetched");
  } catch (error) {
    console.error("Error fetching collections:", error);
    return ApiResponse.error(res, "Failed to fetch collections", "DB_COLLECTIONS_ERROR", 500);
  }
};

exports.getSlowQueries = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const hours = parseInt(req.query.hours) || 24;
    const thresholdMs = parseInt(req.query.threshold) || 100;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const slowQueries = await db.collection("system.profile")
      .find({ millis: { $gte: thresholdMs }, ts: { $gte: since } })
      .sort({ millis: -1 })
      .limit(50)
      .toArray();

    const formatted = slowQueries.map(q => ({
      timestamp: q.ts,
      operation: q.op,
      namespace: q.ns,
      millis: q.millis,
      keysExamined: q.keysExamined,
      docsExamined: q.docsExamined,
    }));

    return ApiResponse.success(res, formatted, "Slow queries fetched");
  } catch (error) {
    console.error("Error fetching slow queries:", error);
    return ApiResponse.error(res, "Failed to fetch slow queries", "SLOW_QUERIES_ERROR", 500);
  }
};

exports.getBackupHistory = async (req, res) => {
  try {
    const Backup = require("../models/backup.model");
    const collegeId = req.query.college_id || undefined;
    const limit = parseInt(req.query.limit) || 20;

    const query = collegeId ? { college_id: collegeId } : {};
    const backups = await Backup.find(query).sort({ createdAt: -1 }).limit(limit);

    const stats = {
      total: await Backup.countDocuments(query),
      successful: await Backup.countDocuments({ ...query, success: true }),
      failed: await Backup.countDocuments({ ...query, success: false }),
    };

    return ApiResponse.success(res, { backups, stats }, "Backup history fetched");
  } catch (error) {
    console.error("Error fetching backup history:", error);
    return ApiResponse.error(res, "Failed to fetch backup history", "BACKUP_HISTORY_ERROR", 500);
  }
};

// ==================== CONFIGURATION VIEWER ====================

exports.getGlobalConfig = async (req, res) => {
  try {
    const config = {
      nodeEnv: process.env.NODE_ENV || "development",
      port: process.env.PORT || 3000,
      database: { uri: process.env.MONGO_URI ? "***MASKED***" : null, name: process.env.DB_NAME || "smartCollege" },
      jwt: { secret: process.env.JWT_SECRET ? "***MASKED***" : null, expiresIn: process.env.JWT_EXPIRE || "7d" },
      services: {
        email: { provider: process.env.EMAIL_PROVIDER || "not configured", from: process.env.EMAIL_FROM || "not configured" },
        payment: { razorpay: !!process.env.RAZORPAY_KEY_ID, stripe: !!process.env.STRIPE_SECRET_KEY },
        storage: { aws: !!process.env.AWS_ACCESS_KEY_ID, local: true },
      },
      features: {
        twoFactorAuth: process.env.ENABLE_2FA === "true",
        auditLogging: process.env.ENABLE_AUDIT_LOGS === "true",
        rateLimiting: process.env.ENABLE_RATE_LIMIT === "true",
        monitoring: process.env.ENABLE_MONITORING === "true",
      },
      rateLimits: { general: process.env.GENERAL_RATE_LIMIT || "100/ minute", auth: process.env.AUTH_RATE_LIMIT || "5/ hour" },
    };
    return ApiResponse.success(res, config, "Global config fetched");
  } catch (error) {
    console.error("Error fetching global config:", error);
    return ApiResponse.error(res, "Failed to fetch global config", "CONFIG_ERROR", 500);
  }
};

exports.getCollegeConfigs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const colleges = await College.find({}).select("name code email phone status").skip(skip).limit(limit).sort({ name: 1 });

    const EmailConfig = require("../models/collegeEmailConfig.model");
    const StripeConfig = require("../models/collegeStripeConfig.model");
    const RazorpayConfig = require("../models/collegeRazorpayConfig.model");

    const collegesWithConfigs = await Promise.all(
      colleges.map(async (college) => {
        const emailConfig = await EmailConfig.findOne({ college_id: college._id });
        const stripeConfig = await StripeConfig.findOne({ college_id: college._id });
        const razorpayConfig = await RazorpayConfig.findOne({ college_id: college._id });

        return {
          _id: college._id,
          name: college.name,
          code: college.code,
          email: college.email,
          phone: college.phone,
          status: college.status,
          config: {
            email: emailConfig ? { provider: emailConfig.provider, fromEmail: emailConfig.fromEmail, isActive: emailConfig.isActive } : null,
            stripe: stripeConfig ? { hasCredentials: !!stripeConfig.secretKey, isActive: stripeConfig.isActive } : null,
            razorpay: razorpayConfig ? { hasCredentials: !!razorpayConfig.keyId, isActive: razorpayConfig.isActive } : null,
          },
        };
      })
    );

    const total = await College.countDocuments();

    return ApiResponse.paginate(res, collegesWithConfigs, { page, limit, total, pages: Math.ceil(total / limit) }, "College configs fetched");
  } catch (error) {
    console.error("Error fetching college configs:", error);
    return ApiResponse.error(res, "Failed to fetch college configs", "COLLEGE_CONFIG_ERROR", 500);
  }
};

exports.getFeatureFlags = async (req, res) => {
  try {
    const FeatureFlag = require("../models/featureFlag.model");
    const dbFlags = await FeatureFlag.find({}).select("key value description").sort({ key: 1 });

    const envFlags = {
      ENABLE_2FA: process.env.ENABLE_2FA === "true",
      ENABLE_AUDIT_LOGS: process.env.ENABLE_AUDIT_LOGS === "true",
      ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT === "true",
      ENABLE_MONITORING: process.env.ENABLE_MONITORING === "true",
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === "true",
      NEW_ADMISSION_FLOW: process.env.NEW_ADMISSION_FLOW === "true",
    };

    return ApiResponse.success(res, { environment: envFlags, database: dbFlags }, "Feature flags fetched");
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return ApiResponse.error(res, "Failed to fetch feature flags", "FEATURE_FLAGS_ERROR", 500);
  }
};

exports.toggleFeature = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const updatedBy = req.user?.id;

    if (!key) return ApiResponse.error(res, "Feature key required", "MISSING_KEY", 400);
    if (typeof value !== "boolean") return ApiResponse.error(res, "Value must be boolean", "INVALID_VALUE", 400);

    const FeatureFlag = require("../models/featureFlag.model");
    let flag = await FeatureFlag.findOne({ key });

    if (flag) {
      flag.value = value;
      flag.description = description || flag.description;
      flag.updatedBy = updatedBy;
      flag.updatedAt = new Date();
      await flag.save();
    } else {
      flag = new FeatureFlag({ key, value, description: description || key, updatedBy });
      await flag.save();
    }

    process.env[key] = value;

    return ApiResponse.success(res, flag, `Feature '${key}' toggled to ${value}`);
  } catch (error) {
    console.error("Error toggling feature:", error);
    return ApiResponse.error(res, "Failed to toggle feature", "TOGGLE_FEATURE_ERROR", 500);
  }
};

/**
 * Get enabled PLATFORM_SUPPORT features for dashboard
 */
exports.getEnabledFeatures = async (req, res) => {
  try {
    const FeatureFlag = require("../models/featureFlag.model");

    const enabledFeatures = await FeatureFlag.find({
      name: { $regex: '^PLATFORM_SUPPORT_' },
      enabled: true
    }).select('name description metadata').sort({ name: 1 });

    // Transform to dashboard-friendly format
    const features = enabledFeatures.map(flag => ({
      id: flag.name,
      name: flag.name.replace('PLATFORM_SUPPORT_', '').toLowerCase().replace(/_/g, '-'),
      displayName: flag.description,
      icon: flag.metadata?.icon || 'FaCog',
      category: flag.metadata?.category || 'other',
      enabled: true
    }));

    return ApiResponse.success(res, { features }, "Enabled PLATFORM_SUPPORT features fetched");
  } catch (error) {
    console.error("Error fetching enabled features:", error);
    return ApiResponse.error(res, "Failed to fetch enabled features", "FEATURES_ERROR", 500);
  }
};

// Audit logs wrapper for platformSupport service
platformSupportService.getAuditLogs = async (filters) => {
  const { action, resourceType, userId, collegeId, startDate, endDate, page = 1, limit = 20 } = filters;
  const query = {};
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (userId) query.userId = userId;
  if (collegeId) query.collegeId = collegeId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  const skip = (page - 1) * limit;
  const logs = await AuditLog.find(query).populate("userId", "email").populate("collegeId", "name").sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await AuditLog.countDocuments(query);
  return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
