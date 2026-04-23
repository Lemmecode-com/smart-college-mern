const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  checkCollegeAccess,
  checkSuperAdmin,
} = require("../middlewares/collegeAccess.middleware");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/collegeRazorpayConfig.controller");

/**
 * Razorpay Configuration Routes
 * Base path: /api/admin/razorpay
 */

// All routes require authentication
router.use(auth);

/**
 * @route   GET /api/admin/razorpay/config
 * @desc    Get current college's Razorpay configuration
 * @access  Private (College Admin)
 */
router.get(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.getRazorpayConfig),
);

/**
 * @route   PATCH /api/admin/razorpay/config/status
 * @desc    Toggle Razorpay active status
 * @access  Private (College Admin)
 */
router.patch(
  "/config/status",
  checkCollegeAccess,
  asyncHandler(controller.toggleRazorpayActive),
);

/**
 * @route   POST /api/admin/razorpay/config
 * @desc    Save/Update Razorpay configuration
 * @access  Private (College Admin)
 */
router.post(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.saveRazorpayConfig),
);

/**
 * @route   POST /api/admin/razorpay/verify
 * @desc    Verify Razorpay credentials
 * @access  Private (College Admin)
 */
router.post(
  "/verify",
  checkCollegeAccess,
  asyncHandler(controller.verifyRazorpayConfig),
);

/**
 * @route   DELETE /api/admin/razorpay/config
 * @desc    Delete Razorpay configuration
 * @access  Private (College Admin)
 */
router.delete(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.deleteRazorpayConfig),
);

/**
 * @route   GET /api/admin/razorpay/test
 * @desc    Test Razorpay connection
 * @access  Private (College Admin)
 */
router.get(
  "/test",
  checkCollegeAccess,
  asyncHandler(controller.testRazorpayConnection),
);

/**
 * @route   GET /api/superadmin/razorpay/colleges
 * @desc    Get all colleges with Razorpay configured
 * @access  Private (Super Admin)
 */
router.get(
  "/colleges",
  checkSuperAdmin,
  asyncHandler(controller.getAllCollegesWithRazorpay),
);

module.exports = router;
