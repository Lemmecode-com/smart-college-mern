const helmet = require('helmet');
// express-mongo-sanitize is incompatible with Express 5
// We use express-validator for input validation instead

const isProduction = process.env.NODE_ENV === 'production';

const cspDirectives = isProduction ? {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "https://checkout.razorpay.com",
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.jsdelivr.net",
    "https://fonts.googleapis.com",
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https:",
  ],
  connectSrc: [
    "'self'",
  ],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
} : {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-eval'",
    "'unsafe-inline'",
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.jsdelivr.net",
    "https://fonts.googleapis.com",
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https:",
  ],
  connectSrc: [
    "'self'",
    "ws:",
    "wss:",
  ],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
};

/**
 * Security Headers Middleware (Helmet.js)
 * Adds various security headers to HTTP responses
 *
 * CSP rationale:
 *   - Production: strict policy blocking inline scripts and external origins
 *     except Bootstrap CDN, Google Fonts (styles/fonts), and Razorpay checkout.
 *     The React app is served as bundled modules from our own origin, so
 *     inline execution is not required. Unsafe-inline is limited to styles
 *     only (required by Bootstrap). Script-side unsafe-inline/eval is
 *     intentionally omitted to preserve XSS mitigation.
 *   - Development: relaxed policy to allow Vite HMR (eval) and inline
 *     error overlays. Not a production exposure.
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  dnsPrefetchControl: {
    allow: false,
  },
  frameguard: {
    action: 'deny',
  },
  hidePoweredBy: true,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
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
