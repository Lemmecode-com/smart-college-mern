const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const { ROLE } = require("../utils/constants");
const staffController = require("../controllers/staff.controller");
const { validateStaffCreation } = require("../middlewares/validators/staff.validator");
const { uploadTeacherDocuments } = require("../middlewares/upload.middleware");

// All routes require authentication and COLLEGE_ADMIN role
router.use(authMiddleware, roleMiddleware([ROLE.COLLEGE_ADMIN]));

/**
 * POST /api/college/staff
 * Create staff account (ACCOUNTANT, ADMISSION_OFFICER, HOD, TEACHER, etc.)
 *
 * Supports both application/json (non-TEACHER roles) and multipart/form-data
 * (TEACHER role, which may include document uploads: aadhaarCard, panCard,
 * degreeCertificate, passportPhoto).
 *
 * The uploadTeacherDocuments middleware uses multer.any() which safely no-ops
 * when no multipart body is present, preserving existing JSON-based Staff
 * creation behavior.
 */
router.post(
  "/staff",
  uploadTeacherDocuments,
  validateStaffCreation,
  staffController.createStaff,
);

/**
 * GET /api/college/staff
 * List staff accounts for this college
 */
router.get("/staff", staffController.listStaff);

/**
 * GET /api/staff/profile/:id
 * Get individual staff profile details
 */
router.get("/staff/profile/:id", staffController.getStaffProfile);

/**
 * PUT /api/staff/profile/:id
 * Update staff profile details
 */
router.put("/staff/profile/:id", staffController.updateStaffProfile);

router.put("/staff/:id/reset-password", staffController.resetStaffPassword);

module.exports = router;
