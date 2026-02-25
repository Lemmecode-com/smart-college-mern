const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Use environment variables for configuration (defaults for production)
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000); // 15 minutes default
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

/**
 * Global Rate Limiter - Applied to all API routes
 * For development: Shorter window (1 minute) for easier testing
 */
const globalLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : WINDOW_MS, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === 'development' ? 20 : MAX_REQUESTS, // 20 in dev, 100 in prod
  message: {
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? 'Too many requests, please slow down (Development Mode)' 
      : 'Too many requests from this IP, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Global from IP: ${req.ip}`, {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict Rate Limiter - For authentication routes
 * For development: 10 requests per minute (easier testing)
 * For production: 5 requests per 15 minutes (security)
 */
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === 'development' ? 10 : 5, // 10 in dev, 5 in prod
  message: {
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? 'Too many login attempts, please wait 1 minute (Development Mode)'
      : 'Too many login attempts, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req, res, next, options) => {
    logger.logWarning(`RATE LIMIT HIT - Auth endpoint from IP: ${req.ip}`, {
      ip: req.ip,
      window: `${options.windowMs / 60000} minutes`,
      max: options.max,
      endpoint: 'auth'
    });
    res.status(options.statusCode).json({
      success: false,
      message: process.env.NODE_ENV === 'development'
        ? 'Too many login attempts, please wait 1 minute (Development Mode)'
        : 'Too many login attempts, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  requestWasSuccessful: (req, res) => {
    return false;
  },
});

/**
 * Password Reset Rate Limiter - Very strict to prevent email spam
 * For development: 5 requests per minute
 * For production: 3 requests per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 60 * 60 * 1000, // 1 min in dev, 1 hour in prod
  max: process.env.NODE_ENV === 'development' ? 5 : 3, // 5 in dev, 3 in prod
  message: {
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? 'Too many password reset requests, please wait 1 minute (Development Mode)'
      : 'Too many password reset requests, please try again after 1 hour',
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
      message: process.env.NODE_ENV === 'development'
        ? 'Too many password reset requests, please wait 1 minute (Development Mode)'
        : 'Too many password reset requests, please try again after 1 hour',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
});

/**
 * Payment Rate Limiter - For Stripe/payment routes
 * For development: 30 requests per minute (testing friendly)
 * For production: 20 requests per 15 minutes (fraud prevention)
 */
const paymentLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === 'development' ? 30 : 20, // 30 in dev, 20 in prod
  message: {
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? 'Too many payment requests, please wait 1 minute (Development Mode)'
      : 'Too many payment requests, please try again after 15 minutes',
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
      message: process.env.NODE_ENV === 'development'
        ? 'Too many payment requests, please wait 1 minute (Development Mode)'
        : 'Too many payment requests, please try again after 15 minutes',
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
 * For development: 100 requests per minute
 * For production: 50 requests per 15 minutes
 */
const publicLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 min in prod
  max: process.env.NODE_ENV === 'development' ? 100 : 50, // 100 in dev, 50 in prod
  message: {
    success: false,
    message: process.env.NODE_ENV === 'development'
      ? 'Too many requests, please wait 1 minute (Development Mode)'
      : 'Too many requests, please try again after 15 minutes',
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
