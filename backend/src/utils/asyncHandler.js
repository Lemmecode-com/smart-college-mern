/**
 * Async Handler Wrapper for Express 5
 * 
 * Wraps async controller functions and catches errors automatically
 * Passes errors to Express error handler via next()
 * 
 * Usage:
 *   router.get('/users', asyncHandler(getUsers));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Ensure error is an AppError or convert it
    if (!error.statusCode) {
      error.statusCode = 500;
      error.code = 'INTERNAL_ERROR';
    }
    next(error);
  });
};

module.exports = asyncHandler;
