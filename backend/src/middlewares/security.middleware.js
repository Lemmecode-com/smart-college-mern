const helmet = require('helmet');
// express-mongo-sanitize is incompatible with Express 5
// We use express-validator for input validation instead

/**
 * Security Headers Middleware (Helmet.js)
 * Adds various security headers to HTTP responses
 * Using relaxed configuration for development
 */
const securityHeaders = helmet({
  // Content Security Policy - Relaxed for development
  contentSecurityPolicy: false, // Disable CSP for now - can enable in production with proper config
  // Prevent DNS prefetching to protect user privacy
  dnsPrefetchControl: {
    allow: false,
  },
  // Prevent iframe clickjacking
  frameguard: {
    action: 'deny',
  },
  // Remove X-Powered-By header (hide Express)
  hidePoweredBy: true,
  // Prevent MIME type sniffing
  noSniff: true,
  // Enable XSS filter in browsers
  xssFilter: true,
  // Referrer Policy - control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Permissions Policy - control browser features
  permissionsPolicy: {
    features: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
    },
  },
});

/**
 * MongoDB Injection Sanitization Middleware
 * Note: express-mongo-sanitize is incompatible with Express 5
 * Input sanitization is handled by express-validator in route validators
 * This is a pass-through middleware for compatibility
 */
const sanitizeMongo = (req, res, next) => {
  // No-op: express-validator handles input validation in controllers
  next();
};

/**
 * Combined Security Middleware
 * Use this to apply both Helmet and MongoDB sanitization
 */
const securityMiddleware = [securityHeaders, sanitizeMongo];

module.exports = {
  securityHeaders,
  sanitizeMongo,
  securityMiddleware,
};
