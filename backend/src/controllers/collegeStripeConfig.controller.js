const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const {
  getCollegeStripeConfig,
  verifyCollegeStripeCredentials,
  invalidateStripeInstanceCache,
  getAllCollegesWithStripe,
} = require("../services/collegeStripe.service");
const {
  encryptStripeKey,
  encryptWebhookSecret,
  getMasterKey,
} = require("../utils/encryption.util");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * Get Stripe configuration for the current college
 * @route GET /api/admin/stripe/config
 * @access Private (College Admin)
 */
exports.getStripeConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const config = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "stripe",
    });

    if (!config) {
      return res.status(200).json({
        success: true,
        configured: false,
        isActive: false,
        message: "Stripe is not configured for this college",
      });
    }

    const isTestMode = config.credentials?.keyId?.includes("pk_test_");

    res.status(200).json({
      success: true,
      configured: !!(config.credentials?.keyId && !config.credentials.keyId.startsWith("temp_")),
      isActive: config.isActive,
      config: {
        id: config._id,
        gatewayCode: config.gatewayCode,
        credentials: {
          keyId: config.credentials?.keyId,
          hasSecret: !!config.credentials?.keySecret,
          hasWebhookSecret: !!config.credentials?.webhookSecret,
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
 * Toggle Stripe active status
 * @route PATCH /api/admin/stripe/config/status
 * @access Private (College Admin)
 */
exports.toggleStripeActive = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      throw new AppError(
        "isActive must be a boolean value",
        400,
        "VALIDATION_ERROR",
      );
    }

    let config = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "stripe",
    });

    if (!config) {
      config = await CollegePaymentConfig.create({
        collegeId,
        gatewayCode: "stripe",
        isActive,
        credentials: {
          keyId: "temp_" + Date.now(),
          keySecret: "temp_" + Date.now(),
        },
        configuration: {
          currency: "INR",
          enabled: isActive,
          testMode: true,
        },
      });
    } else {
      config.isActive = isActive;
      config.configuration.enabled = isActive;
      config.configuration.currency = config.configuration.currency || "INR";
      config.configuration.testMode = config.configuration.testMode ?? true;
      await config.save();
    }

    if (!isActive) {
      invalidateStripeInstanceCache(collegeId.toString());
    }

    logger.logInfo("Stripe active status toggled", {
      collegeId,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: isActive
        ? "Stripe gateway enabled"
        : "Stripe gateway disabled",
      isActive: config.isActive,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update Stripe configuration for a college
 * @route POST /api/admin/stripe/config
 * @access Private (College Admin)
 */
exports.saveStripeConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { publishableKey, secretKey, webhookSecret, testMode } = req.body;

    if (!publishableKey || !secretKey) {
      throw new AppError(
        "Publishable key and secret key are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const isTestKey = publishableKey.startsWith("pk_test_");
    const isLiveKey = publishableKey.startsWith("pk_live_");

    if (!isTestKey && !isLiveKey) {
      throw new AppError(
        "Invalid Stripe publishable key format",
        400,
        "INVALID_KEY_FORMAT",
      );
    }

    if (testMode && !isTestKey) {
      throw new AppError(
        "Test mode enabled but live key provided",
        400,
        "KEY_MODE_MISMATCH",
      );
    }
    if (!testMode && !isLiveKey) {
      throw new AppError(
        "Live mode enabled but test key provided",
        400,
        "KEY_MODE_MISMATCH",
      );
    }

    if (
      !secretKey.startsWith("sk_test_") &&
      !secretKey.startsWith("sk_live_")
    ) {
      throw new AppError(
        "Invalid Stripe secret key format",
        400,
        "INVALID_KEY_FORMAT",
      );
    }

    try {
      getMasterKey();
    } catch (encryptError) {
      throw new AppError(
        "Encryption not configured. Contact administrator.",
        500,
        "ENCRYPTION_NOT_CONFIGURED",
      );
    }

    let encryptedSecret;
    try {
      encryptedSecret = encryptStripeKey(secretKey);
    } catch (encryptError) {
      logger.logError("Encryption failed for secret key", {
        error: encryptError.message,
      });
      throw new AppError(
        "Failed to encrypt secret key",
        500,
        "ENCRYPTION_FAILED",
      );
    }

    let encryptedWebhookSecret = null;
    if (webhookSecret && webhookSecret.startsWith("whsec_")) {
      try {
        encryptedWebhookSecret = encryptWebhookSecret(webhookSecret);
      } catch (encryptError) {
        logger.logError("Encryption failed for webhook secret", {
          error: encryptError.message,
        });
        throw new AppError(
          "Failed to encrypt webhook secret",
          500,
          "ENCRYPTION_FAILED",
        );
      }
    }

    const existingConfig = await CollegePaymentConfig.findOne({
      collegeId,
      gatewayCode: "stripe",
    });

    let config;

    if (existingConfig) {
      existingConfig.credentials.keyId = publishableKey;
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
    } else {
      config = await CollegePaymentConfig.create({
        collegeId,
        gatewayCode: "stripe",
        credentials: {
          keyId: publishableKey,
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
    }

    invalidateStripeInstanceCache(collegeId.toString());
    logger.logInfo("Stripe configuration saved", {
      collegeId,
      isTestMode: testMode ?? isTestKey,
    });

    res.status(201).json({
      success: true,
      message: "Stripe configuration saved successfully",
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
 * Verify Stripe credentials
 * @route POST /api/admin/stripe/verify
 * @access Private (College Admin)
 */
exports.verifyStripeConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const result = await verifyCollegeStripeCredentials(collegeId);

    if (result.valid) {
      res
        .status(200)
        .json({ success: true, message: result.message, verified: true });
    } else {
      res
        .status(200)
        .json({
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
 * Delete Stripe configuration
 * @route DELETE /api/admin/stripe/config
 * @access Private (College Admin)
 */
exports.deleteStripeConfig = async (req, res, next) => {
  try {
    const collegeId = req.college_id;

    const config = await CollegePaymentConfig.findOneAndDelete({
      collegeId,
      gatewayCode: "stripe",
    });

    if (!config) {
      throw new AppError(
        "Stripe configuration not found",
        404,
        "CONFIG_NOT_FOUND",
      );
    }

    invalidateStripeInstanceCache(collegeId.toString());
    logger.logInfo("Stripe configuration deleted", { collegeId });

    res
      .status(200)
      .json({
        success: true,
        message: "Stripe configuration deleted successfully",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Test Stripe connection
 * @route GET /api/admin/stripe/test
 * @access Private (College Admin)
 */
exports.testStripeConnection = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { config, secretKey } = await getCollegeStripeConfig(collegeId);

    const Stripe = require("stripe");
    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    const balance = await stripe.balance.retrieve();

    res.status(200).json({
      success: true,
      message: "Stripe connection successful",
      connection: {
        status: "connected",
        livemode: !config.configuration?.testMode,
        balance: {
          available: balance.available?.[0]?.amount ?? 0,
          currency: balance.available?.[0]?.currency ?? "INR",
        },
      },
    });
  } catch (error) {
    if (error.code === "STRIPE_NOT_CONFIGURED") {
      throw new AppError(
        "Stripe is not configured for your college",
        400,
        "STRIPE_NOT_CONFIGURED",
      );
    }
    next(error);
  }
};

/**
 * Get all colleges with Stripe configured
 * @route GET /api/superadmin/stripe/colleges
 * @access Private (Super Admin)
 */
exports.getAllCollegesWithStripe = async (req, res, next) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      throw new AppError(
        "Access denied. Super admin role required.",
        403,
        "FORBIDDEN",
      );
    }

    const colleges = await getAllCollegesWithStripe();
    res.status(200).json({ success: true, count: colleges.length, colleges });
  } catch (error) {
    next(error);
  }
};
