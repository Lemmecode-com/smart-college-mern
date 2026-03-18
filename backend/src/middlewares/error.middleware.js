const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * Global Error Handler Middleware for Express 5
 *
 * Must have 4 parameters (err, req, res, next) to be recognized as error handler
 * In Express 5, error handlers should NOT call next() after sending response
 */
const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error("=".repeat(60));
  console.error("❌ [Error Handler]");
  console.error("   - Message:", err.message);
  console.error("   - Code:", err.code || "UNKNOWN");
  console.error("   - Stack:", err.stack);
  console.error("   - URL:", req.originalUrl);
  console.error("   - Method:", req.method);
  console.error("=".repeat(60));

  // Log to file
  logger.logError(`[Error Handler] ${err.name || "Error"}: ${err.message}`, {
    name: err.name,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id || req.user?.id,
  });

  let error = { ...err };
  error.message = err.message || "Internal server error";

  // Handle specific error types
  if (err.name === "MongooseError" || err.name === "MongoServerError") {
    error = {
      statusCode: 500,
      message: "Database error occurred",
      code: "DATABASE_ERROR",
    };
  }

  if (err.name === "CastError") {
    error = {
      statusCode: 400,
      message: "Invalid ID format",
      code: "INVALID_ID",
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = {
      statusCode: 409,
      message: `${field} already exists`,
      code: "DUPLICATE_FIELD",
    };
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = {
      statusCode: 400,
      message: messages.join(", "),
      code: "VALIDATION_ERROR",
    };
  }

  if (err.name === "JsonWebTokenError") {
    error = {
      statusCode: 401,
      message: "Invalid token",
      code: "INVALID_TOKEN",
    };
  }

  if (err.name === "TokenExpiredError") {
    error = {
      statusCode: 401,
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    };
  }

  if (err.type === "StripeCardError" || err.type === "StripeAPIError") {
    error = {
      statusCode: 400,
      message: err.message || "Payment failed",
      code: "STRIPE_ERROR",
    };
  }

  if (err.name === "MulterError") {
    error = {
      statusCode: 400,
      message: `File upload error: ${err.message}`,
      code: "FILE_UPLOAD_ERROR",
    };
  }

  // Operational errors (AppError)
  if (err instanceof AppError) {
    error = {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
    };
  }

  // Default values
  const statusCode = error.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : error.message;
  const code = error.code || "INTERNAL_ERROR";

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: error.details || {},
    },
  });

  // IMPORTANT: In Express 5, do NOT call next() after sending response
  // This prevents "next is not a function" error
};

module.exports = errorHandler;
