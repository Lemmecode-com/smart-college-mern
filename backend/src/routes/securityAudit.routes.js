const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const {
  getAuditLogs,
  getAuditLogById,
  getDashboardStats,
  markAsReviewed,
  exportAuditLogs,
} = require("../controllers/securityAudit.controller");

// All routes require authentication and one of the audit-viewer roles.
// SUPER_ADMIN sees every college; COLLEGE_ADMIN / PRINCIPAL / PLATFORM_SUPPORT
// are restricted to their own college by the controller's scope resolution.
router.use(authMiddleware);
router.use(role(ROLE.SUPER_ADMIN, ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.PLATFORM_SUPPORT));

// Attach req.college_id for non-super-admin roles (bypassed for SUPER_ADMIN).
router.use(collegeMiddleware);

// Dashboard stats - must come before /:id to avoid route conflict
router.get("/dashboard", getDashboardStats);

// Get all audit logs with filters
router.get("/", getAuditLogs);

// Get single audit log by ID
router.get("/:id", getAuditLogById);

// Mark as reviewed
router.put("/:id/review", markAsReviewed);

// Export logs
router.get("/export/download", exportAuditLogs);

module.exports = router;
