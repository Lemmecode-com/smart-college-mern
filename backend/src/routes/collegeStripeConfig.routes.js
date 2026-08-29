const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
  checkCollegeAccess,
  checkSuperAdmin,
} = require("../middlewares/collegeAccess.middleware");
const asyncHandler = require("../utils/asyncHandler");
const controller = require("../controllers/collegeStripeConfig.controller");

/**
 * Stripe Configuration Routes
 * Base path: /api/admin/stripe
 */

// All routes require authentication
router.use(auth);

/**
 * @route   GET /api/admin/stripe/config
 * @desc    Get current college's Stripe configuration
 * @access  Private (College Admin)
 */
router.get(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.getStripeConfig),
);

/**
 * @route   PATCH /api/admin/stripe/config/status
 * @desc    Toggle Stripe active status
 * @access  Private (College Admin)
 */
router.patch(
  "/config/status",
  checkCollegeAccess,
  asyncHandler(controller.toggleStripeActive),
);

/**
 * @route   POST /api/admin/stripe/config
 * @desc    Save/Update Stripe configuration
 * @access  Private (College Admin)
 */
router.post(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.saveStripeConfig),
);

/**
 * @route   POST /api/admin/stripe/verify
 * @desc    Verify Stripe credentials
 * @access  Private (College Admin)
 */
router.post(
  "/verify",
  checkCollegeAccess,
  asyncHandler(controller.verifyStripeConfig),
);

/**
 * @route   DELETE /api/admin/stripe/config
 * @desc    Delete Stripe configuration
 * @access  Private (College Admin)
 */
router.delete(
  "/config",
  checkCollegeAccess,
  asyncHandler(controller.deleteStripeConfig),
);

/**
 * @route   GET /api/admin/stripe/test
 * @desc    Test Stripe connection
 * @access  Private (College Admin)
 */
router.get(
  "/test",
  checkCollegeAccess,
  asyncHandler(controller.testStripeConnection),
);

/**
 * @route   GET /api/admin/stripe/colleges
 * @desc    Get all colleges with Stripe configured
 * @access  Private (Super Admin)
 */
router.get(
  "/colleges",
  checkSuperAdmin,
  asyncHandler(controller.getAllCollegesWithStripe),
);

module.exports = router;
