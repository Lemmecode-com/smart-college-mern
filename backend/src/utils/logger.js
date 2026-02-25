const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * 
 * Provides structured logging for the application with:
 * - File-based logging for persistence
 * - Console logging for development
 * - Different log levels (error, warn, info, http, debug)
 * - JSON format for easy parsing
 */

// Define log directory
const logDir = path.join(__dirname, '..', '..', 'logs');

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: 'http', // Set to 'http' to capture all HTTP requests
  format: logFormat,
  defaultMeta: {
    service: 'smart-college-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log - only errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log - all levels (http and above)
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Console logging for development environment (HTTP logs only, not errors)
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: 'http', // Only show HTTP logs in console
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Separate error logger for file-only error logging (no console)
const errorFileLogger = winston.createLogger({
  level: 'error',
  format: logFormat,
  defaultMeta: {
    service: 'smart-college-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log - only errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Also add to combined log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * Log HTTP request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Time taken to process request in ms
 */
logger.logRequest = (req, res, responseTime) => {
  logger.http({
    message: `${req.method} ${req.originalUrl}`,
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

/**
 * Log error with context (file only, not in console)
 * @param {string} message - Error message
 * @param {Object} context - Additional context (error, stack, userId, etc.)
 */
logger.logError = (message, context = {}) => {
  errorFileLogger.error({
    message,
    type: 'error',
    ...context,
  });
};

/**
 * Log warning
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
logger.logWarning = (message, context = {}) => {
  logger.warn({
    message,
    type: 'warning',
    ...context,
  });
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
logger.logInfo = (message, context = {}) => {
  logger.info({
    message,
    type: 'info',
    ...context,
  });
};

module.exports = logger;
