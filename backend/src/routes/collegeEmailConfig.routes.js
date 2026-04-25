const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { checkCollegeAccess } = require("../middlewares/collegeAccess.middleware");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/collegeEmailConfig.controller");

/**
 * Email Configuration Routes
 * Base path: /api/admin/email
 */

// All routes require authentication
router.use(auth);

/**
 * @route   GET /api/admin/email/config
 * @desc    Get current college's email configuration
 * @access  Private (College Admin)
 */
router.get(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.getEmailConfig),
);

/**
 * @route   POST /api/admin/email/config
 * @desc    Save/Update email configuration
 * @access  Private (College Admin)
 */
router.post(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.saveEmailConfig),
);

/**
 * @route   POST /api/admin/email/verify
 * @desc    Verify email configuration
 * @access  Private (College Admin)
 */
router.post(
  "/verify",
  checkCollegeAccess,
  asyncHandler(controller.verifyEmailConfig),
);

/**
 * @route   DELETE /api/admin/email/config
 * @desc    Delete email configuration
 * @access  Private (College Admin)
 */
router.delete(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.deleteEmailConfig),
);

module.exports = router;