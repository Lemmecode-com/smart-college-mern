const AuditLog = require('../models/auditLog.model');
const auditLogService = require('../services/auditLog.service');
const AppError = require('../utils/AppError');

/**
 * Get audit logs for COLLEGE_ADMIN
 * GET /api/audit-logs
 * College admins can only see logs for their own college
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    // College isolation - COLLEGE_ADMIN can only see their own college's logs
    const filters = {
      collegeId: req.college_id,  // Enforced by college middleware
      action: req.query.action || undefined,
      resourceType: req.query.resourceType || undefined,
      userId: req.query.userId || undefined,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await auditLogService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit log by ID
 * GET /api/audit-logs/:id
 */
exports.getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const audit = await AuditLog.findById(id)
      .populate('userId', 'email role')
      .populate('collegeId', 'name code');

    if (!audit) {
      throw new AppError("Audit log not found", 404, "NOT_FOUND");
    }

    // College isolation - ensure the log belongs to the admin's college
    if (audit.collegeId._id.toString() !== req.college_id.toString()) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    res.json({
      success: true,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit log statistics for dashboard
 * GET /api/audit-logs/stats
 */
exports.getAuditStats = async (req, res, next) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      total24h,
      total7d,
      total30d,
      actionsByType,
      resourcesByType,
      recentActivity
    ] = await Promise.all([
      AuditLog.countDocuments({
        collegeId: req.college_id,
        createdAt: { $gte: last24Hours }
      }),
      AuditLog.countDocuments({
        collegeId: req.college_id,
        createdAt: { $gte: last7Days }
      }),
      AuditLog.countDocuments({
        collegeId: req.college_id,
        createdAt: { $gte: last30Days }
      }),
      AuditLog.aggregate([
        { $match: { collegeId: req.college_id } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $match: { collegeId: req.college_id } },
        { $group: { _id: '$resourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.find({ collegeId: req.college_id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'email')
    ]);

    res.json({
      success: true,
      data: {
        last24Hours: total24h,
        last7Days: total7d,
        last30Days: total30d,
        actionsByType,
        resourcesByType,
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};
