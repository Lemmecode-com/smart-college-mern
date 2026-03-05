/**
 * API Response Utility
 * 
 * Provides standardized response format for all API endpoints
 * Ensures consistency across success and error responses
 * 
 * @usage
 * // Success response
 * ApiResponse.success(res, data, "Optional message", 200);
 * 
 * // Error response
 * ApiResponse.error(res, "Error message", "ERROR_CODE", 400, details);
 * 
 * // Paginated response
 * ApiResponse.paginate(res, data, pagination, "Optional message", 200);
 */

class ApiResponse {
  /**
   * Create standardized success response
   * 
   * @param {Object} res - Express response object
   * @param {Object|Array} data - Response data
   * @param {String} message - Success message (optional)
   * @param {Number} statusCode - HTTP status code (default: 200)
   * @returns {Object} Standardized success response
   */
  static success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Create standardized error response
   * 
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {String} code - Error code for frontend handling
   * @param {Number} statusCode - HTTP status code (default: 400)
   * @param {Object} details - Additional error details (optional)
   * @returns {Object} Standardized error response
   */
  static error(res, message = "Error", code = "ERROR", statusCode = 400, details = {}) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details
      }
    });
  }

  /**
   * Create standardized paginated response
   * 
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination metadata
   * @param {Number} pagination.page - Current page
   * @param {Number} pagination.limit - Items per page
   * @param {Number} pagination.total - Total items
   * @param {Number} pagination.pages - Total pages
   * @param {String} message - Success message (optional)
   * @param {Number} statusCode - HTTP status code (default: 200)
   * @returns {Object} Standardized paginated response
   */
  static paginate(res, data, pagination, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination
    });
  }

  /**
   * Create standardized created response (201)
   * 
   * @param {Object} res - Express response object
   * @param {Object} data - Created resource data
   * @param {String} message - Success message (optional)
   * @returns {Object} Standardized created response
   */
  static created(res, data, message = "Resource created successfully") {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Create standardized no content response (204)
   * 
   * @param {Object} res - Express response object
   * @param {String} message - Success message (optional)
   * @returns {Object} Standardized no content response
   */
  static noContent(res, message = "Resource deleted successfully") {
    return res.status(204).json({
      success: true,
      message
    });
  }
}

module.exports = ApiResponse;
