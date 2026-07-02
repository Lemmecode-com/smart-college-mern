const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const asyncHandler = require("../utils/asyncHandler");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");

/**
 * Payment Gateway Configuration Routes
 * Base path: /api/admin/payment
 */

/**
 * @route   GET /api/admin/payment/gateways
 * @desc   Get active payment gateways for the college
 * @access Private (College Admin, Student)
 */
router.get(
  "/gateways",
  auth,
  collegeMiddleware,
  asyncHandler(async (req, res) => {
    const collegeId = req.college_id;

    // Get all configs where isActive = true
    const configs = await CollegePaymentConfig.find({
      collegeId,
      isActive: true,
    })
      .select("gatewayCode configuration isActive")
      .lean();

    // Map to simple gateway list
    const gateways = configs.map((config) => ({
      code: config.gatewayCode,
      enabled: config.isActive === true,
    }));

    // Determine which gateway is default (used when only one is active)
    let defaultGateway = null;
    if (gateways.length === 1) {
      defaultGateway = gateways[0].code;
    }

    // Should student see choice? Only when both gateways are active
    const allowChoice = gateways.length > 1;

    res.json({
      success: true,
      gateways,
      count: gateways.length,
      defaultGateway,
      allowChoice,
    });
  }),
);

module.exports = router;