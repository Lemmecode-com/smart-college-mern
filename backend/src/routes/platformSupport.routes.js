const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const platformSupportController = require("../controllers/platformSupport.controller");
const { ROLE } = require("../utils/constants");

// All routes require PLATFORM_SUPPORT role
router.use(auth, role(ROLE.PLATFORM_SUPPORT));

// ==================== SYSTEM HEALTH ====================

/**
 * @route   GET /api/platform-support/health
 * @desc    Get latest system health snapshot
 * @access  PlatformSupport
 */
router.get("/health", platformSupportController.getSystemHealth);

/**
 * @route   GET /api/platform-support/health/history
 * @desc    Get health history for last N hours
 * @access  PlatformSupport
 */
router.get("/health/history", platformSupportController.getHealthHistory);

/**
 * @route   GET /api/platform-support/health/metrics
 * @desc    Get metrics trend for charts (CPU, memory, etc.)
 * @access  PlatformSupport
 */
router.get("/health/metrics", platformSupportController.getMetricsTrend);

/**
 * @route   GET /api/platform-support/health/database
 * @desc    Check database health specifically
 * @access  PlatformSupport
 */
router.get("/health/database", platformSupportController.checkDatabaseHealth);

/**
 * @route   GET /api/platform-support/health/integrations
 * @desc    Get all third-party integration health statuses
 * @access  PlatformSupport
 */
router.get("/health/integrations", platformSupportController.getIntegrationHealth);

/**
 * @route   POST /api/platform-support/health/test-integration/:service
 * @desc    Force health check for a specific service
 * @access  PlatformSupport
 */
router.post(
  "/health/test-integration/:service",
  platformSupportController.testIntegration
);

/**
 * @route   GET /api/platform-support/metrics
 * @desc    Get system metrics (CPU, memory, disk, uptime)
 * @access  PlatformSupport
 */
router.get("/metrics", platformSupportController.getSystemMetrics);

// ==================== AUDIT & SYSTEM LOGS ====================

/**
 * @route   GET /api/platform-support/audit-logs
 * @desc    Get audit logs with filters
 * @access  PlatformSupport
 */
router.get("/audit-logs", platformSupportController.getAuditLogs);

/**
 * @route   GET /api/platform-support/system-logs
 * @desc    Get application system logs with filters
 * @access  PlatformSupport
 */
router.get("/system-logs", platformSupportController.getSystemLogs);

/**
 * @route   GET /api/platform-support/error-stats
 * @desc    Get top error modules (last 24h)
 * @access  PlatformSupport
 */
router.get("/error-stats", platformSupportController.getErrorStats);

/**
 * @route   GET /api/platform-support/rate-limit-stats
 * @desc    Get rate limit usage per college
 * @access  PlatformSupport
 */
router.get("/rate-limit-stats", platformSupportController.getRateLimitStats);

// ==================== SUPPORT TICKETS ====================

/**
 * @route   POST /api/platform-support/tickets
 * @desc    Create a new support ticket
 * @access  PlatformSupport
 */
router.post("/tickets", platformSupportController.createTicket);

/**
 * @route   GET /api/platform-support/tickets
 * @desc    Get all tickets with filters
 * @access  PlatformSupport
 */
router.get("/tickets", platformSupportController.getTickets);

/**
 * @route   PUT /api/platform-support/tickets/:id/assign
 * @desc    Assign ticket to a support agent
 * @access  PlatformSupport
 */
router.put("/tickets/:id/assign", platformSupportController.assignTicket);

/**
 * @route   PUT /api/platform-support/tickets/:id/resolve
 * @desc    Resolve a ticket
 * @access  PlatformSupport
 */
router.put("/tickets/:id/resolve", platformSupportController.resolveTicket);

/**
 * @route   POST /api/platform-support/tickets/:id/comments
 * @desc    Add comment to ticket
 * @access  PlatformSupport
 */
router.post(
  "/tickets/:id/comments",
  platformSupportController.addTicketComment
);

/**
 * @route   GET /api/platform-support/tickets/stats
 * @desc    Get ticket statistics
 * @access  PlatformSupport
 */
router.get("/tickets/stats", platformSupportController.getTicketStats);

// ==================== COLLEGE HEALTH ====================

/**
 * @route   GET /api/platform-support/colleges/health
 * @desc    Get all colleges with health scores
 * @access  PlatformSupport
 */
router.get("/colleges/health", platformSupportController.getAllCollegesHealth);

/**
 * @route   GET /api/platform-support/colleges/:id/diagnostics
 * @desc    Get detailed diagnostics for a specific college
 * @access  PlatformSupport
 */
router.get(
  "/colleges/:id/diagnostics",
  platformSupportController.getCollegeDiagnostics
);

// ==================== SYSTEM ACTIONS ====================

/**
 * @route   POST /api/platform-support/broadcast-alert
 * @desc    Broadcast alert/notification to all college admins
 * @access  PlatformSupport
 */
router.post("/broadcast-alert", platformSupportController.broadcastAlert);

// ==================== DATABASE DIAGNOSTICS ====================

/**
 * @route   GET /api/platform-support/database/collections
 * @desc    Get all MongoDB collections with stats
 * @access  PlatformSupport
 */
router.get("/database/collections", platformSupportController.getDatabaseCollections);

/**
 * @route   GET /api/platform-support/database/slow-queries
 * @desc    Get slow queries from last 24h
 * @access  PlatformSupport
 */
router.get("/database/slow-queries", platformSupportController.getSlowQueries);

/**
 * @route   GET /api/platform-support/database/backups
 * @desc    Get backup history
 * @access  PlatformSupport
 */
router.get("/database/backups", platformSupportController.getBackupHistory);

// ==================== CONFIGURATION VIEWER ====================

/**
 * @route   GET /api/platform-support/config/global
 * @desc    Get global system configuration (masked)
 * @access  PlatformSupport
 */
router.get("/config/global", platformSupportController.getGlobalConfig);

/**
 * @route   GET /api/platform-support/config/colleges
 * @desc    Get college-specific configurations
 * @access  PlatformSupport
 */
router.get("/config/colleges", platformSupportController.getCollegeConfigs);

/**
 * @route   GET /api/platform-support/config/features
 * @desc    Get feature flags
 * @access  PlatformSupport
 */
router.get("/config/features", platformSupportController.getFeatureFlags);

/**
 * @route   POST /api/platform-support/config/features/toggle
 * @desc    Toggle a feature flag
 * @access  PlatformSupport
 */
router.post("/config/features/toggle", platformSupportController.toggleFeature);

/**
 * @route   GET /api/platform-support/features/enabled
 * @desc    Get enabled PLATFORM_SUPPORT dashboard features
 * @access  PlatformSupport
 */
router.get("/features/enabled", platformSupportController.getEnabledFeatures);

module.exports = router;
