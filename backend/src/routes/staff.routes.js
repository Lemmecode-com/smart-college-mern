const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const { ROLE } = require("../utils/constants");
const staffController = require("../controllers/staff.controller");

// All routes require authentication and COLLEGE_ADMIN role
router.use(authMiddleware, roleMiddleware([ROLE.COLLEGE_ADMIN]));

/**
 * POST /api/college/staff
 * Create staff account (ACCOUNTANT, ADMISSION_OFFICER, etc.)
 */
router.post("/staff", staffController.createStaff);

/**
 * GET /api/college/staff
 * List staff accounts for this college
 */
router.get("/staff", staffController.listStaff);

module.exports = router;
