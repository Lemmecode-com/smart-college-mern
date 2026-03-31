const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const {
  getCollegeRazorpayConfig,
  verifyCollegeRazorpayCredentials,
  invalidateRazorpayInstanceCache,
  getAllCollegesWithRazorpay,
} = require("../services/collegeRazorpay.service");
const {
  encryptRazorpayKey,
  encryptWebhookSecret,
  decryptRazorpayKey,
  getMasterKey,
} = require("../utils/encryption.util");
const AppError = require("../utils/AppError");
const Razorpay = require("razorpay");

/**
 * Get Razorpay configuration for the current college
 * @route GET /api/admin/razorpay/config
 * @access Private (College Admin)
 */
exports.getRazorpayConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const config = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "razorpay",
    }).select("-credentials.keySecret -credentials.webhookSecret");

    if (!config) {
      return res.status(200).json({
        success: true,
        configured: false,
        message: "Razorpay is not configured for this college",
      });
    }

    const isTestMode = config.configuration?.testMode ?? true;

    res.status(200).json({
      success: true,
      configured: true,
      config: {
        id: config._id,
        gatewayCode: config.gatewayCode,
        credentials: {
          keyId: config.credentials.keyId,
          hasSecret: !!config.credentials.keySecret,
          hasWebhookSecret: !!config.credentials.webhookSecret,
        },
        configuration: config.configuration,
        isActive: config.isActive,
        lastVerifiedAt: config.lastVerifiedAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        isTestMode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update Razorpay configuration for a college
 * @route POST /api/admin/razorpay/config
 * @access Private (College Admin)
 */
exports.saveRazorpayConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { keyId, keySecret, webhookSecret, testMode } = req.body;

    // Validate required fields
    if (!keyId || !keySecret) {
      throw new AppError(
        "Key ID and secret key are required",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Validate key format
    const isTestKey = keyId.startsWith("rzp_test_");
    const isLiveKey = keyId.startsWith("rzp_live_");

    if (!isTestKey && !isLiveKey) {
      throw new AppError(
        "Invalid Razorpay key ID format. Must start with rzp_test_ or rzp_live_",
        400,
        "INVALID_KEY_FORMAT"
      );
    }

    // Validate test mode matches key type
    if (testMode && !isTestKey) {
      throw new AppError(
        "Test mode is enabled but live key was provided",
        400,
        "KEY_MODE_MISMATCH"
      );
    }

    if (!testMode && !isLiveKey) {
      throw new AppError(
        "Live mode is enabled but test key was provided",
        400,
        "KEY_MODE_MISMATCH"
      );
    }

    // Validate encryption key is available
    try {
      getMasterKey();
    } catch (encryptError) {
      throw new AppError(
        "Encryption not configured. Please contact administrator.",
        500,
        "ENCRYPTION_NOT_CONFIGURED"
      );
    }

    // Encrypt the secret key
    let encryptedSecret;
    try {
      encryptedSecret = encryptRazorpayKey(keySecret);
    } catch (encryptError) {
      console.error("Encryption failed for secret key:", encryptError.message);
      throw new AppError(
        "Failed to encrypt secret key",
        500,
        "ENCRYPTION_FAILED"
      );
    }

    // Encrypt webhook secret if provided
    let encryptedWebhookSecret = null;
    if (webhookSecret) {
      try {
        encryptedWebhookSecret = encryptWebhookSecret(webhookSecret);
      } catch (encryptError) {
        console.error(
          "Encryption failed for webhook secret:",
          encryptError.message
        );
        throw new AppError(
          "Failed to encrypt webhook secret",
          500,
          "ENCRYPTION_FAILED"
        );
      }
    }

    // Check if config already exists
    const existingConfig = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "razorpay",
    });

    let config;

    if (existingConfig) {
      // Update existing config
      existingConfig.credentials.keyId = keyId;
      existingConfig.credentials.keySecret = encryptedSecret;
      if (encryptedWebhookSecret) {
        existingConfig.credentials.webhookSecret = encryptedWebhookSecret;
      }
      existingConfig.configuration.testMode = testMode ?? isTestKey;
      existingConfig.configuration.enabled = true;
      existingConfig.isActive = true;
      existingConfig.lastVerifiedAt = null;

      await existingConfig.save();
      config = existingConfig;

      console.log(`✅ Razorpay configuration updated for college ${collegeId}`);
    } else {
      // Create new config
      config = await CollegePaymentConfig.create({
        collegeId,
        gatewayCode: "razorpay",
        credentials: {
          keyId: keyId,
          keySecret: encryptedSecret,
          webhookSecret: encryptedWebhookSecret,
        },
        configuration: {
          currency: "INR",
          enabled: true,
          testMode: testMode ?? isTestKey,
        },
        isActive: true,
      });

      console.log(`✅ Razorpay configuration created for college ${collegeId}`);
    }

    // Invalidate cache to force re-initialization
    invalidateRazorpayInstanceCache(collegeId.toString());

    res.status(201).json({
      success: true,
      message: "Razorpay configuration saved successfully",
      config: {
        id: config._id,
        gatewayCode: config.gatewayCode,
        credentials: {
          keyId: config.credentials.keyId,
          hasSecret: true,
          hasWebhookSecret: !!config.credentials.webhookSecret,
        },
        configuration: config.configuration,
        isActive: config.isActive,
        isTestMode: config.configuration.testMode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay credentials
 * @route POST /api/admin/razorpay/verify
 * @access Private (College Admin)
 */
exports.verifyRazorpayConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const result = await verifyCollegeRazorpayCredentials(collegeId);

    if (result.valid) {
      res.status(200).json({
        success: true,
        message: result.message,
        verified: true,
      });
    } else {
      res.status(200).json({
        success: false,
        message: result.message,
        verified: false,
        error: result.error,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Razorpay configuration
 * @route DELETE /api/admin/razorpay/config
 * @access Private (College Admin)
 */
exports.deleteRazorpayConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const config = await CollegePaymentConfig.findOneAndDelete({
      collegeId,
      gatewayCode: "razorpay",
    });

    if (!config) {
      throw new AppError(
        "Razorpay configuration not found",
        404,
        "CONFIG_NOT_FOUND"
      );
    }

    // Invalidate cache
    invalidateRazorpayInstanceCache(collegeId.toString());

    console.log(`✅ Razorpay configuration deleted for college ${collegeId}`);

    res.status(200).json({
      success: true,
      message: "Razorpay configuration deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test Razorpay connection
 * @route GET /api/admin/razorpay/test
 * @access Private (College Admin)
 */
exports.testRazorpayConnection = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const { config, keySecret } = await getCollegeRazorpayConfig(collegeId);

    // Create a temporary Razorpay instance
    const razorpay = new Razorpay({
      key_id: config.credentials.keyId,
      key_secret: keySecret,
    });

    // Test by fetching orders (lightweight operation)
    const orders = await razorpay.orders.all({ count: 1 });

    res.status(200).json({
      success: true,
      message: "Razorpay connection successful",
      connection: {
        status: "connected",
        livemode: !config.configuration?.testMode,
        ordersCount: orders.count ?? 0,
      },
    });
  } catch (error) {
    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
      throw new AppError(
        "Razorpay is not configured for your college",
        400,
        "RAZORPAY_NOT_CONFIGURED"
      );
    }
    next(error);
  }
};

/**
 * Get all colleges with Razorpay configured
 * @route GET /api/superadmin/razorpay/colleges
 * @access Private (Super Admin)
 */
exports.getAllCollegesWithRazorpay = async (req, res, next) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "SUPER_ADMIN") {
      throw new AppError(
        "Access denied. Super admin role required.",
        403,
        "FORBIDDEN"
      );
    }

    const colleges = await getAllCollegesWithRazorpay();

    res.status(200).json({
      success: true,
      count: colleges.length,
      colleges,
    });
  } catch (error) {
    next(error);
  }
};
