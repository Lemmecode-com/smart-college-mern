const AppError = require("../utils/AppError");

/**
 * Global Error Handler Middleware
 * 
 * Handles all types of errors consistently:
 * - Operational errors (AppError)
 * - MongoDB errors (CastError, Duplicate, ValidationError)
 * - JWT errors (JsonWebTokenError, TokenExpiredError)
 * - Stripe errors
 * - Express validation errors
 * - Unknown/programming errors
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging (never log sensitive data)
  console.error(`[Error Handler] ${err.name}: ${err.message}`);
  
  // Only log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = {
      statusCode: 400,
      message: 'Invalid ID format',
      code: 'INVALID_ID'
    };
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      statusCode: 409,
      message: `${field} already exists`,
      code: 'DUPLICATE_FIELD'
    };
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = {
      statusCode: 400,
      message: messages.join(', '),
      code: 'VALIDATION_ERROR'
    };
  }

  // JWT JsonWebTokenError
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    };
  }

  // JWT TokenExpiredError
  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    };
  }

  // Stripe API Errors
  if (err.type === 'StripeCardError' || err.type === 'StripeAPIError') {
    error = {
      statusCode: 400,
      message: err.message || 'Payment failed',
      code: 'STRIPE_ERROR'
    };
  }

  // Express Validator Errors
  if (err.array && typeof err.array === 'function') {
    const validationErrors = err.array();
    error = {
      statusCode: 400,
      message: validationErrors.map(e => e.msg).join(', '),
      code: 'VALIDATION_ERROR',
      details: validationErrors
    };
  }

  // Multer Errors (File Upload)
  if (err.name === 'MulterError') {
    error = {
      statusCode: 400,
      message: `File upload error: ${err.message}`,
      code: 'FILE_UPLOAD_ERROR'
    };
  }

  // Operational Error (AppError)
  if (err instanceof AppError) {
    error = {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code
    };
  }

  // Determine final response values
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'INTERNAL_ERROR';

  // Build response object
  const response = {
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error' // Hide detailed error messages in production for 500s
      : message,
    code
  };

  // Add validation details if available
  if (error.details) {
    response.details = error.details;
  }

  // Add stack trace in development only
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
