const SystemHealth = require("../models/systemHealth.model");
const SupportTicket = require("../models/supportTicket.model");
const SystemLog = require("../models/systemLog.model");
const IntegrationHealth = require("../models/integrationHealth.model");
const College = require("../models/college.model");
const { v4: uuidv4 } = require("uuid");

/**
 * Platform Support Service
 * Business logic for system health, support tickets, logs, and integration monitoring
 */

// ==================== SYSTEM HEALTH ====================

/**
 * Record a health check snapshot
 */
exports.recordHealthSnapshot = async (metricsData) => {
  const {
    cpuUsage,
    memoryUsage,
    diskUsage,
    responseTimeMs,
    errorRate,
    services = [],
    errors = [],
  } = metricsData;

  // Determine overall status
  let status = "HEALTHY";
  if (errorRate > 10 || cpuUsage > 90 || memoryUsage > 90) {
    status = "DOWN";
  } else if (errorRate > 5 || cpuUsage > 80 || memoryUsage > 80) {
    status = "DEGRADED";
  }

  const health = new SystemHealth({
    status,
    metrics: { cpuUsage, memoryUsage, diskUsage, responseTimeMs, errorRate },
    services,
    errors,
  });

  await health.save();
  return health;
};

/**
 * Get latest system health
 */
exports.getLatestHealth = async () => {
  return await SystemHealth.findOne({}).sort({ timestamp: -1 });
};

/**
 * Get health history for last N hours
 */
exports.getHealthHistory = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return await SystemHealth.find({ timestamp: { $gte: since } }).sort({
    timestamp: -1,
  });
};

/**
 * Get system metrics trend (for charts)
 */
exports.getMetricsTrend = async (metric, hours = 24, interval = "hour") => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  let groupBy;
  if (interval === "hour") {
    groupBy = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" },
      hour: { $hour: "$timestamp" },
    };
  } else if (interval === "minute") {
    groupBy = {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" },
      hour: { $hour: "$timestamp" },
      minute: { $minute: "$timestamp" },
    };
  }

  return await SystemHealth.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: groupBy,
        avgCpu: { $avg: "$metrics.cpuUsage" },
        avgMemory: { $avg: "$metrics.memoryUsage" },
        avgDisk: { $avg: "$metrics.diskUsage" },
        avgResponseTime: { $avg: "$metrics.responseTimeMs" },
        avgErrorRate: { $avg: "$metrics.errorRate" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
  ]);
};

// ==================== INTEGRATION HEALTH ====================

/**
 * Update integration health status
 */
exports.updateIntegrationHealth = async (serviceName, statusData) => {
  const {
    status,
    responseTimeMs,
    errorMessage,
    configSnapshot = {},
  } = statusData;

  const update = {
    status,
    lastCheck: new Date(),
    responseTimeMs,
    errorMessage,
    configSnapshot,
  };

  // Increment failures or reset on success
  if (status === "ACTIVE") {
    update.consecutiveFailures = 0;
    update.lastSuccess = new Date();
    update.healthScore = 100;
  } else {
    update.consecutiveFailures = (await IntegrationHealth.findOne({
      service: serviceName,
    }))?.consecutiveFailures + 1 || 1;
    update.lastFailure = new Date();
    // Reduce health score based on consecutive failures
    update.healthScore = Math.max(0, 100 - update.consecutiveFailures * 20);
  }

  // Push to checks array (keep last 10 checks)
  const $push = {
    checks: {
      $each: [
        {
          timestamp: new Date(),
          status,
          responseTimeMs,
          errorMessage,
        },
      ],
      $slice: -10,
    },
  };

  await IntegrationHealth.updateOne(
    { service: serviceName },
    { $set: update, $push },
    { upsert: true }
  );

  return await IntegrationHealth.findOne({ service: serviceName });
};

/**
 * Get all integration health statuses
 */
exports.getAllIntegrationsHealth = async () => {
  return await IntegrationHealth.find({}).sort({ service: 1 });
};

/**
 * Get single integration health
 */
exports.getIntegrationHealth = async (serviceName) => {
  return await IntegrationHealth.findOne({ service: serviceName });
};

// ==================== SUPPORT TICKETS ====================

/**
 * Create a new support ticket
 */
exports.createTicket = async (ticketData) => {
  const {
    userId,
    college_id,
    subject,
    category,
    priority,
    description,
    attachments = [],
  } = ticketData;

  const ticket = new SupportTicket({
    ticketId: `SPT-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`,
    userId,
    college_id,
    subject,
    category: category || "OTHER",
    priority: priority || "MEDIUM",
    description,
    attachments,
  });

  await ticket.save();
  await ticket.populate("userId", "name email");
  await ticket.populate("college_id", "name");
  return ticket;
};

/**
 * Get all tickets with filters
 */
exports.getAllTickets = async (filters = {}) => {
  const { status, priority, category, college_id, assignedTo, limit = 50 } =
    filters;
  const query = {};

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (college_id) query.college_id = college_id;
  if (assignedTo) query.assignedTo = assignedTo;

  return await SupportTicket.find(query)
    .populate("userId", "name email")
    .populate("college_id", "name")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get single ticket by ID
 */
exports.getTicketById = async (ticketId) => {
  return await SupportTicket.findOne({ ticketId })
    .populate("userId", "name email")
    .populate("college_id", "name code")
    .populate("assignedTo", "name email");
};

/**
 * Update ticket status
 */
exports.updateTicketStatus = async (ticketId, status, resolution = null) => {
  const update = { status };
  if (status === "RESOLVED" || status === "CLOSED") {
    update.resolvedAt = new Date();
    if (resolution) update.resolution = resolution;
  }

  return await SupportTicket.findOneAndUpdate(
    { ticketId },
    { $set: update },
    { new: true }
  );
};

/**
 * Assign ticket to a support agent
 */
exports.assignTicket = async (ticketId, assigneeId) => {
  return await SupportTicket.findOneAndUpdate(
    { ticketId },
    { $set: { assignedTo: assigneeId, status: "IN_PROGRESS" } },
    { new: true }
  );
};

/**
 * Add comment to ticket
 */
exports.addComment = async (ticketId, userId, message) => {
  const ticket = await SupportTicket.findOne({ ticketId });
  if (!ticket) throw new Error("Ticket not found");

  ticket.comments.push({
    user: userId,
    message,
  });

  await ticket.save();
  return ticket;
};

/**
 * Get ticket statistics
 */
exports.getTicketStats = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return await SupportTicket.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

// ==================== SYSTEM LOGS ====================

/**
 * Create a system log entry
 */
exports.createSystemLog = async (logData) => {
  const {
    level,
    message,
    module,
    userId,
    college_id,
    ip,
    userAgent,
    stack,
    metadata = {},
    request,
    response,
  } = logData;

  const log = new SystemLog({
    level,
    message,
    module,
    userId,
    college_id,
    ip,
    userAgent,
    stack,
    metadata,
    request,
    response,
  });

  await log.save();
  return log;
};

/**
 * Get system logs with filters
 */
exports.getSystemLogs = async (filters = {}) => {
  const {
    level,
    module,
    userId,
    college_id,
    search,
    startDate,
    endDate,
    limit = 100,
    skip = 0,
  } = filters;

  const query = {};

  if (level) query.level = level;
  if (module) query.module = new RegExp(module, "i");
  if (userId) query.userId = userId;
  if (college_id) query.college_id = college_id;
  if (search) {
    query.$or = [
      { message: new RegExp(search, "i") },
      { stack: new RegExp(search, "i") },
    ];
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return await SystemLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get error statistics
 */
exports.getErrorStats = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return await SystemLog.aggregate([
    {
      $match: {
        level: "ERROR",
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: "$module",
        count: { $sum: 1 },
        lastError: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
};

/**
 * Get system logs by level count (for dashboard)
 */
exports.getLogsCountByLevel = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return await SystemLog.aggregate([
    {
      $match: {
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: "$level",
        count: { $sum: 1 },
      },
    },
  ]);
};

// ==================== COLLEGE HEALTH ====================

/**
 * Calculate health score for a college
 */
exports.calculateCollegeHealthScore = async (collegeId) => {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get API error rate for this college
  const errorLogs = await SystemLog.countDocuments({
    college_id: collegeId,
    level: "ERROR",
    createdAt: { $gte: last24h },
  });

  const totalLogs = await SystemLog.countDocuments({
    college_id: collegeId,
    createdAt: { $gte: last24h },
  });

  const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

  // Get open support tickets
  const openTickets = await SupportTicket.countDocuments({
    college_id: collegeId,
    status: { $in: ["OPEN", "IN_PROGRESS"] },
  });

  // Get last backup status (if backup model exists)
  let backupStatus = 100;
  try {
    const Backup = require("../models/backup.model");
    const lastBackup = await Backup.findOne({ college_id: collegeId }).sort(
      { createdAt: -1 }
    );
    if (lastBackup) {
      backupStatus = lastBackup.success ? 100 : 0;
    }
  } catch (e) {
    // Backup model may not exist yet, ignore
  }

  // Calculate score (weighted)
  let score = 100;
  score -= errorRate * 0.3; // 30% weight for error rate
  score -= Math.min(openTickets * 5, 25); // 25% weight for open tickets (max -25)
  score -= (100 - backupStatus) * 0.15; // 15% weight for backup

  return Math.round(Math.max(0, Math.min(100, score)));
};

/**
 * Get all colleges with health scores
 */
exports.getAllCollegesHealth = async () => {
  const colleges = await College.find({}).select("_id name code");

  const collegesWithHealth = await Promise.all(
    colleges.map(async (college) => {
      const healthScore = await this.calculateCollegeHealthScore(college._id);
      return {
        ...college.toObject(),
        healthScore,
      };
    })
  );

  return collegesWithHealth.sort((a, b) => b.healthScore - a.healthScore);
};

// ==================== RATE LIMIT STATS ====================

/**
 * Get rate limit usage per college (from redis or logs)
 */
exports.getRateLimitStats = async () => {
  // This would typically query Redis for current rate limit counters
  // For now, return mock or parse from logs
  const recentLogs = await SystemLog.find({
    level: "WARN",
    message: { $regex: /rate limit/i },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).select("college_id message");

  const stats = {};
  recentLogs.forEach((log) => {
    if (log.college_id) {
      stats[log.college_id] = (stats[log.college_id] || 0) + 1;
    }
  });

  return stats;
};

// ==================== SYSTEM METRICS ====================

/**
 * Get system metrics (CPU, Memory, Disk) - placeholders
 * In production, integrate with OS-level monitoring (PM2, Node OS module)
 */
exports.getSystemMetrics = async () => {
  // Placeholder - in real scenario use 'os' module and process.memoryUsage()
  return {
    cpuUsage: Math.round(Math.random() * 50) + 10, // mock 10-60%
    memoryUsage: Math.round(Math.random() * 40) + 30, // mock 30-70%
    diskUsage: 45, // static mock %
    uptime: process.uptime(),
    totalMemory: process.memoryUsage(),
    timestamp: new Date(),
  };
};

// ==================== NOTIFICATIONS ====================

/**
 * Broadcast alert to all college admins
 */
exports.broadcastAlert = async (message, severity = "MEDIUM") => {
  // Find all college admins
  const User = require("../models/user.model");
  const collegeAdmins = await User.find({
    role: "COLLEGE_ADMIN",
  }).select("_id");

  // Create notification for each (using existing Notification model)
  const Notification = require("../models/notification.model");
  const notifications = collegeAdmins.map((admin) => ({
    user: admin._id,
    title: `System Alert: ${severity}`,
    message,
    type: "URGENT",
    read: false,
  }));

  await Notification.insertMany(notifications);
  return { sent: notifications.length };
};
