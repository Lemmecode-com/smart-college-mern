const Stripe = require("stripe");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { decryptStripeKey } = require("../utils/encryption.util");
const logger = require("../utils/logger");

/**
 * Cache for Stripe instances to avoid recreating them frequently
 * Key: collegeId, Value: { stripe, config }
 */
const stripeInstanceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of stripeInstanceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      stripeInstanceCache.delete(key);
    }
  }
}

// Run cache cleanup every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);

/**
 * Get Stripe configuration for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{config: Object, secretKey: string, webhookSecret: string|null}>}
 * @throws {Error} If Stripe is not configured for the college
 */
async function getCollegeStripeConfig(collegeId) {
  if (!collegeId) {
    throw new Error("College ID is required");
  }

  const config = await CollegePaymentConfig.findOne({
    collegeId,
    gatewayCode: "stripe",
    isActive: true,
  });

  if (!config) {
    const error = new Error(
      "Stripe payment gateway is not configured for this college. Please contact the college administrator.",
    );
    error.code = "STRIPE_NOT_CONFIGURED";
    error.statusCode = 400;
    throw error;
  }

  // Decrypt the secret key
  let secretKey;
  try {
    secretKey = decryptStripeKey(config.credentials.keySecret);
  } catch (decryptError) {
    logger.logError(`Failed to decrypt Stripe key for college ${collegeId}`, {
      error: decryptError.message,
    });
    const error = new Error(
      "Unable to process payment configuration. Please contact support.",
    );
    error.code = "DECRYPTION_FAILED";
    error.statusCode = 500;
    throw error;
  }

  // Decrypt webhook secret if present
  let webhookSecret = null;
  if (config.credentials.webhookSecret) {
    try {
      webhookSecret = decryptStripeKey(config.credentials.webhookSecret);
    } catch (decryptError) {
      logger.logError(
        `Failed to decrypt webhook secret for college ${collegeId}`,
        { error: decryptError.message },
      );
    }
  }

  return {
    config,
    secretKey,
    webhookSecret,
  };
}

/**
 * Get or create a Stripe instance for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<Stripe>} The Stripe instance
 * @throws {Error} If Stripe is not configured or initialization fails
 */
async function getStripeInstance(collegeId) {
  if (!collegeId) {
    throw new Error("College ID is required");
  }

  // Check cache first
  const cached = stripeInstanceCache.get(collegeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.stripe;
  }

  const { config, secretKey } = await getCollegeStripeConfig(collegeId);

  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
      appInfo: {
        name: "NOVAA SaaS",
        version: "1.0.0",
      },
    });

    // Cache the instance
    stripeInstanceCache.set(collegeId, {
      stripe,
      config,
      timestamp: Date.now(),
    });

    return stripe;
  } catch (error) {
    logger.logError(`Failed to initialize Stripe for college ${collegeId}`, {
      error: error.message,
    });
    const stripeError = new Error(
      "Failed to initialize payment gateway. Please try again later.",
    );
    stripeError.code = "STRIPE_INIT_FAILED";
    stripeError.statusCode = 500;
    throw stripeError;
  }
}

/**
 * Verify Stripe credentials for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function verifyCollegeStripeCredentials(collegeId) {
  try {
    const stripe = await getStripeInstance(collegeId);

    // Make a simple API call to verify the key works
    await stripe.balance.retrieve();

    // Update last verified timestamp
    await CollegePaymentConfig.updateOne(
      { collegeId },
      {
        lastVerifiedAt: new Date(),
      },
    );

    return {
      valid: true,
      message: "Stripe credentials verified successfully",
    };
  } catch (error) {
    logger.logError(
      `Stripe credential verification failed for college ${collegeId}`,
      { error: error.message },
    );

    let message = "Stripe credentials verification failed";

    if (error.code === "STRIPE_NOT_CONFIGURED") {
      message = "Stripe is not configured for this college";
    } else if (error.type === "StripeAuthenticationError") {
      message = "Invalid Stripe secret key";
    } else if (error.type === "StripeAPIError") {
      message = `Stripe API error: ${error.message}`;
    }

    return {
      valid: false,
      message,
      error: error.message,
    };
  }
}

/**
 * Invalidate cached Stripe instance for a college
 * Use this when credentials are updated
 * @param {string} collegeId - The college ID
 */
function invalidateStripeInstanceCache(collegeId) {
  stripeInstanceCache.delete(collegeId);
  logger.logInfo(`Invalidated Stripe cache for college ${collegeId}`);
}

/**
 * Get all colleges with Stripe configured
 * @returns {Promise<Array>} List of college configs
 */
async function getAllCollegesWithStripe() {
  const configs = await CollegePaymentConfig.find({
    gatewayCode: "stripe",
    isActive: true,
  })
    .populate("collegeId", "name code email")
    .lean();

  return configs.map((config) => ({
    collegeId: config.collegeId._id,
    collegeName: config.collegeId.name,
    collegeCode: config.collegeId.code,
    isActive: config.isActive,
    isTestMode: config.configuration?.testMode ?? true,
    lastVerifiedAt: config.lastVerifiedAt,
    createdAt: config.createdAt,
  }));
}

module.exports = {
  getStripeInstance,
  getCollegeStripeConfig,
  verifyCollegeStripeCredentials,
  invalidateStripeInstanceCache,
  getAllCollegesWithStripe,
};
