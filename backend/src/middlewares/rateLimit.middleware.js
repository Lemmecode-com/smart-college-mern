const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// Use environment variables for configuration (defaults for production)
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes default
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// Development-specific settings (more relaxed for testing)
const DEV_WINDOW_MS = 60 * 1000; // 1 minute
const DEV_MAX_REQUESTS = 1000; // 1000 requests per minute in development

/**
 * Helper function to normalize IP addresses (IPv4 and IPv6)
 * Properly handles IPv6 addresses to prevent rate limit bypass
 */
const normalizeIp = (req) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  // Handle IPv6 mapped to IPv4 (::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * Global Rate Limiter - Applied to all API routes
 * For development: More relaxed limits (1000 req/min) for easier testing
 * For production: Standard limits (100 req/15min)
 */
const globalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? DEV_WINDOW_MS : WINDOW_MS,
  max: process.env.NODE_ENV === "development" ? DEV_MAX_REQUESTS : MAX_REQUESTS,
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many requests, please slow down (Development Mode)"
        : "Too many requests from this IP, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Global from IP: ${req.ip}`, {
      ip: req.ip,
      endpoint: req.originalUrl,
    });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict Rate Limiter - For authentication routes
 * For development: 30 requests per minute (easier testing)
 * For production: 5 requests per 15 minutes (security)
 */
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === "development" ? 30 : 5, // 30 in dev, 5 in prod
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many login attempts, please wait 1 minute (Development Mode)"
        : "Too many login attempts, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => normalizeIp(req),
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Auth endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: "auth",
    });
    res.status(options.statusCode).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? "Too many login attempts, please wait 1 minute (Development Mode)"
          : "Too many login attempts, please try again after 15 minutes",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Password Reset Rate Limiter - Very strict to prevent email spam
 * For development: 5 requests per minute
 * For production: 3 requests per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 60 * 60 * 1000, // 1 min in dev, 1 hour in prod
  max: process.env.NODE_ENV === "development" ? 5 : 3, // 5 in dev, 3 in prod
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many password reset requests, please wait 1 minute (Development Mode)"
        : "Too many password reset requests, please try again after 1 hour",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Password Reset from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: "password-reset",
    });
    res.status(options.statusCode).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? "Too many password reset requests, please wait 1 minute (Development Mode)"
          : "Too many password reset requests, please try again after 1 hour",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Payment Rate Limiter - For Stripe/payment routes
 * For development: 30 requests per minute (testing friendly)
 * For production: 20 requests per 15 minutes (fraud prevention)
 */
const paymentLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === "development" ? 30 : 20, // 30 in dev, 20 in prod
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many payment requests, please wait 1 minute (Development Mode)"
        : "Too many payment requests, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Payment endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: "payment",
    });
    res.status(options.statusCode).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? "Too many payment requests, please wait 1 minute (Development Mode)"
          : "Too many payment requests, please try again after 15 minutes",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * Payment Status Polling Limiter - Higher limit for polling
 * Allows frequent polling (every 2-3 seconds) without hitting rate limit
 * For development: 500 requests per minute
 * For production: 200 requests per 5 minutes
 */
const paymentStatusLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 5 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 500 : 200,
  message: {
    success: false,
    message: "Payment status polling rate limit exceeded, please wait",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
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
    message: "Too many health check requests",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
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
    message: "Too many API requests, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
});

/**
 * Public Routes Limiter - For public endpoints
 * For development: 100 requests per minute
 * For production: 50 requests per 15 minutes
 */
const publicLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === "development" ? 100 : 50, // 100 in dev, 50 in prod
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many requests, please wait 1 minute (Development Mode)"
        : "Too many requests, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => normalizeIp(req),
});

/**
 * Webhook Rate Limiter - For Stripe/webhook endpoints
 * Higher limits to accommodate Stripe webhook retries
 * For development: 200 requests per minute
 * For production: 500 requests per 15 minutes
 */
const webhookLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === "development" ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === "development" ? 200 : 500, // 200 in dev, 500 in prod
  message: {
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? "Too many webhook requests, please wait 1 minute (Development Mode)"
        : "Too many webhook requests, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use Stripe signature hash if available, otherwise fallback to IP
    const stripeSignature = req.headers["stripe-signature"];
    if (stripeSignature) {
      return `stripe:${stripeSignature.substring(0, 20)}`;
    }
    return normalizeIp(req);
  },
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Webhook endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: "webhook",
      stripeSignature: req.headers["stripe-signature"] ? "Present" : "Missing",
    });
    res.status(options.statusCode).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? "Too many webhook requests, please wait 1 minute (Development Mode)"
          : "Too many webhook requests, please try again after 15 minutes",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  paymentLimiter,
  paymentStatusLimiter,
  healthCheckLimiter,
  apiLimiter,
  publicLimiter,
  webhookLimiter,
};
