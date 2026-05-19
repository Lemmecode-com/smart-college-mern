const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
} = require("../controllers/auditLog.controller");

// All routes require authentication and (COLLEGE_ADMIN, PRINCIPAL, or PLATFORM_SUPPORT) role
router.use(authMiddleware);
router.use(role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.PLATFORM_SUPPORT));

// Apply college middleware to ensure req.college_id is set
router.use(collegeMiddleware);

// Stats - must come before /:id to avoid route conflict
router.get("/stats", getAuditStats);

// Get all audit logs with filters (for this college only)
router.get("/", getAuditLogs);

// Get single audit log by ID
router.get("/:id", getAuditLogById);

module.exports = router;
