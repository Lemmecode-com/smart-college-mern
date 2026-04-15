/**
 * Custom Error Class for Consistent Error Handling
 * 
 * Usage:
 *   throw new AppError('User not found', 404);
 *   throw new AppError('Invalid credentials', 401, 'AUTH_ERROR');
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'APPLICATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
