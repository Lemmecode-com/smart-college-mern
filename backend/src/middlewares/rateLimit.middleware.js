const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Helper function to safely extract IP addresses
 * Properly handles both IPv4 and IPv6 addresses by removing IPv6 prefix
 */
const getIp = (req) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  // Remove IPv6 prefix (::ffff:) for IPv4-mapped addresses
  return ip.replace(/^::ffff:/, '');
};

/**
 * Global Rate Limiter - Applied to all API routes
 * Limits each IP to 100 requests per 15 minutes
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
    statusCode: 429
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict Rate Limiter - For authentication routes
 * Limits each IP to 5 requests per 15 minutes (prevent brute force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests (failed logins too)
  // Use safe IP extraction that handles IPv6 properly
  keyGenerator: (req) => getIp(req),
  // Log when limit is hit
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Auth endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: 'auth'
    });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  // Log request count for debugging
  requestWasSuccessful: (req, res) => {
    // Always count the request (regardless of success/failure)
    return false;
  },
});

/**
 * Password Reset Rate Limiter - Very strict to prevent email spam
 * Limits each IP to 3 requests per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again after 1 hour',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Password Reset from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: 'password-reset'
    });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many password reset requests, please try again after 1 hour',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
});

/**
 * Payment Rate Limiter - For Stripe/payment routes
 * Limits each IP to 20 requests per 15 minutes (prevent fraud)
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Payment endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: 'payment'
    });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many payment requests, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
});

/**
 * Health Check Rate Limiter - Higher limit for monitoring
 * Limits each IP to 60 requests per minute
 */
const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    success: false,
    message: 'Too many health check requests',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API Limiter - For general API routes (slightly higher than global)
 * Limits each IP to 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many API requests, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public Routes Limiter - For public endpoints
 * Limits each IP to 50 requests per 15 minutes (prevent scraping)
 */
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  paymentLimiter,
  healthCheckLimiter,
  apiLimiter,
  publicLimiter,
};
