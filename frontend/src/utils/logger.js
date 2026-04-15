/**
 * Centralized Logger Utility
 * 
 * Purpose:
 * - Development: Show all logs for debugging
 * - Production: Hide logs (security + performance)
 * 
 * Usage:
 * import { logger } from '../utils/logger';
 * 
 * logger.log('Normal log message');
 * logger.error('Error message');
 * logger.warn('Warning message');
 * logger.info('Info message (always shown)');
 * logger.debug('Debug message');
 */

// Check if running in development mode
const isDev = import.meta.env.DEV;

// Check if verbose logging is enabled (can be overridden in .env)
const isVerbose = import.meta.env.VITE_ENABLE_LOGGING === 'true';

// Format timestamp for logs
const getTimestamp = () => {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

// Format log message with timestamp and optional prefix
const formatMessage = (message, prefix = '') => {
  return prefix ? `[${getTimestamp()}] ${prefix}: ${message}` : `[${getTimestamp()}] ${message}`;
};

export const logger = {
  /**
   * Regular log - Only in development
   * Use for general logging
   */
  log: (...args) => {
    if (isDev || isVerbose) {
      console.log(`[LOG] ${getTimestamp()}:`, ...args);
    }
  },

  /**
   * Error log - Only in development
   * Use for error logging
   * Production errors should be sent to a monitoring service instead
   */
  error: (...args) => {
    if (isDev || isVerbose) {
      console.error(`[ERROR] ${getTimestamp()}:`, ...args);
    }
    // TODO: In production, send to error monitoring service (e.g., Sentry)
    // if (!isDev) {
    //   sendToErrorMonitoringService(args);
    // }
  },

  /**
   * Warning log - Only in development
   * Use for warnings
   */
  warn: (...args) => {
    if (isDev || isVerbose) {
      console.warn(`[WARN] ${getTimestamp()}:`, ...args);
    }
  },

  /**
   * Info log - Always shown (even in production)
   * Use for important informational messages
   */
  info: (...args) => {
    console.info(`[INFO] ${getTimestamp()}:`, ...args);
  },

  /**
   * Debug log - Only in development or when verbose is enabled
   * Use for detailed debugging information
   */
  debug: (...args) => {
    if (isDev || isVerbose) {
      console.debug(`[DEBUG] ${getTimestamp()}:`, ...args);
    }
  },

  /**
   * Success log - Only in development
   * Use for success messages
   */
  success: (...args) => {
    if (isDev || isVerbose) {
      console.log(`[SUCCESS] ${getTimestamp()}:`, ...args);
    }
  },

  /**
   * Table log - Only in development
   * Use for displaying data in table format
   */
  table: (data) => {
    if (isDev || isVerbose) {
      console.table(data);
    }
  },

  /**
   * Group logs - Only in development
   * Use for grouping related logs
   */
  group: (label, callback) => {
    if (isDev || isVerbose) {
      console.group(`[GROUP] ${getTimestamp()}: ${label}`);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Check if logging is enabled
   */
  isEnabled: () => isDev || isVerbose,

  /**
   * Check if in development mode
   */
  isDevelopment: () => isDev,

  /**
   * Check if in production mode
   */
  isProduction: () => !isDev,
};

// Export default for convenience
export default logger;
