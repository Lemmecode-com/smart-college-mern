const SecurityAudit = require('../models/securityAudit.model');
const securityAuditService = require('../services/securityAudit.service');
const AppError = require('../utils/AppError');

/**
 * Get all audit logs (Super Admin only)
 * GET /api/security-audit
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    // Super Admin can see all colleges' logs
    // Optional: Filter by specific college if collegeId query param provided
    const filters = {
      collegeId: req.query.collegeId || undefined,
      ...req.query
    };

    const result = await securityAuditService.getAuditLogs(filters);

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
 * GET /api/security-audit/:id
 */
exports.getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const audit = await SecurityAudit.findById(id)
      .populate('userId', 'email role')
      .populate('collegeId', 'name code');

    if (!audit) {
      throw new AppError("Audit log not found", 404, "NOT_FOUND");
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
 * Get security dashboard statistics
 * GET /api/security-audit/dashboard
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Super Admin sees stats from all colleges
    const stats = await securityAuditService.getDashboardStats(null);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark audit log as reviewed
 * PUT /api/security-audit/:id/review
 */
exports.markAsReviewed = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const audit = await SecurityAudit.findByIdAndUpdate(
      id,
      {
        reviewed: true,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        notes: req.body.notes
      },
      { new: true }
    );

    if (!audit) {
      throw new AppError("Audit log not found", 404, "NOT_FOUND");
    }

    res.json({
      success: true,
      message: "Audit log marked as reviewed",
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs as CSV (backup - frontend handles Excel/PDF)
 * GET /api/security-audit/export/download
 */
exports.exportAuditLogs = async (req, res, next) => {
  try {
    const filters = {
      collegeId: req.query.collegeId || undefined,
      ...req.query
    };

    const result = await securityAuditService.getAuditLogs({ ...filters, limit: 1000 });
    const logs = result.logs;

    // Convert to CSV format
    const csv = convertToCSV(logs);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="security-audit-logs.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Helper function for CSV conversion
function convertToCSV(logs) {
  const headers = [
    'Timestamp',
    'Event Type',
    'Category',
    'Severity',
    'User Email',
    'User Role',
    'College',
    'IP Address',
    'Endpoint',
    'Method',
    'Status Code',
    'Reviewed'
  ];
  
  const rows = logs.map(log => [
    new Date(log.createdAt).toLocaleString(),
    log.eventType,
    log.category,
    log.severity,
    log.userEmail || 'N/A',
    log.userRole || 'N/A',
    log.collegeId?.name || 'N/A',
    log.ipAddress,
    log.endpoint || 'N/A',
    log.method || 'N/A',
    log.statusCode || 'N/A',
    log.reviewed ? 'Yes' : 'No'
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
