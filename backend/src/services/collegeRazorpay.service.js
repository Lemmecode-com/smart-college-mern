const Razorpay = require("razorpay");
const CollegePaymentConfig = require("../models/collegePaymentConfig.model");
const { decryptRazorpayKey } = require("../utils/encryption.util");

/**
 * Cache for Razorpay instances to avoid recreating them frequently
 * Key: collegeId, Value: { razorpay, config }
 */
const razorpayInstanceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of razorpayInstanceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      razorpayInstanceCache.delete(key);
    }
  }
}

// Run cache cleanup every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);

/**
 * Get Razorpay configuration for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{config: Object, keySecret: string}>}
 * @throws {Error} If Razorpay is not configured for the college
 */
async function getCollegeRazorpayConfig(collegeId) {
  if (!collegeId) {
    throw new Error("College ID is required");
  }

  const config = await CollegePaymentConfig.getActiveConfig(
    collegeId,
    "razorpay"
  );

  if (!config) {
    const error = new Error(
      "Razorpay payment gateway is not configured for this college. Please contact the college administrator."
    );
    error.code = "RAZORPAY_NOT_CONFIGURED";
    error.statusCode = 400;
    throw error;
  }

  // Decrypt the secret key
  let keySecret;
  try {
    keySecret = decryptRazorpayKey(config.credentials.keySecret);
  } catch (decryptError) {
    console.error(
      `Failed to decrypt Razorpay key for college ${collegeId}:`,
      decryptError.message
    );
    const error = new Error(
      "Unable to process payment configuration. Please contact support."
    );
    error.code = "DECRYPTION_FAILED";
    error.statusCode = 500;
    throw error;
  }

  return {
    config,
    keySecret,
  };
}

/**
 * Get or create a Razorpay instance for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<Razorpay>} The Razorpay instance
 * @throws {Error} If Razorpay is not configured or initialization fails
 */
async function getRazorpayInstance(collegeId) {
  if (!collegeId) {
    throw new Error("College ID is required");
  }

  // Check cache first
  const cached = razorpayInstanceCache.get(collegeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.razorpay;
  }

  const { config, keySecret } = await getCollegeRazorpayConfig(collegeId);

  try {
    const razorpay = new Razorpay({
      key_id: config.credentials.keyId,
      key_secret: keySecret,
    });

    // Cache the instance
    razorpayInstanceCache.set(collegeId, {
      razorpay,
      config,
      timestamp: Date.now(),
    });

    return razorpay;
  } catch (error) {
    console.error(
      `Failed to initialize Razorpay for college ${collegeId}:`,
      error
    );
    const razorpayError = new Error(
      "Failed to initialize payment gateway. Please try again later."
    );
    razorpayError.code = "RAZORPAY_INIT_FAILED";
    razorpayError.statusCode = 500;
    throw razorpayError;
  }
}

/**
 * Verify Razorpay credentials for a college
 * @param {string} collegeId - The college ID
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function verifyCollegeRazorpayCredentials(collegeId) {
  try {
    const razorpay = await getRazorpayInstance(collegeId);

    // Make a simple API call to verify the key works
    // Fetch order list to verify credentials (lightweight operation)
    await razorpay.orders.all({ count: 1 });

    // Update last verified timestamp
    await CollegePaymentConfig.updateOne(
      { collegeId },
      {
        lastVerifiedAt: new Date(),
      }
    );

    return {
      valid: true,
      message: "Razorpay credentials verified successfully",
    };
  } catch (error) {
    console.error(
      `Razorpay credential verification failed for college ${collegeId}:`,
      error
    );

    let message = "Razorpay credentials verification failed";

    if (error.code === "RAZORPAY_NOT_CONFIGURED") {
      message = "Razorpay is not configured for this college";
    } else if (error.statusCode === 401) {
      message = "Invalid Razorpay key ID or secret";
    } else if (error.statusCode === 400) {
      message = `Razorpay API error: ${error.message}`;
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      message = "Connection timeout - please check your network";
    }

    return {
      valid: false,
      message,
      error: error.message,
    };
  }
}

/**
 * Invalidate cached Razorpay instance for a college
 * Use this when credentials are updated
 * @param {string} collegeId - The college ID
 */
function invalidateRazorpayInstanceCache(collegeId) {
  razorpayInstanceCache.delete(collegeId);
  console.log(`Invalidated Razorpay cache for college ${collegeId}`);
}

/**
 * Get all colleges with Razorpay configured
 * @returns {Promise<Array>} List of college configs
 */
async function getAllCollegesWithRazorpay() {
  const configs = await CollegePaymentConfig.find({
    gatewayCode: "razorpay",
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
  getRazorpayInstance,
  getCollegeRazorpayConfig,
  verifyCollegeRazorpayCredentials,
  invalidateRazorpayInstanceCache,
  getAllCollegesWithRazorpay,
};
