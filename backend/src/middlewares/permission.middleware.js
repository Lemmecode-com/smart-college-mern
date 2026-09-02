const permissionService = require("../services/permission.service");

/**
 * Middleware to check permissions dynamically
 * Usage: permission('resource', 'action')
 */
const permission = (resource, action) => {
  return async (req, res, next) => {
    // Set permission info on request for the role middleware to use
    req.permissionResource = resource;
    req.permissionAction = action;
    next();
  };
};

/**
 * Middleware to require specific permission
 * Usage: requirePermission('resource', 'action')
 */
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        const AppError = require("../utils/AppError");
        throw new AppError("Unauthorized: user not authenticated", 401, "UNAUTHORIZED");
      }

      const hasPermission = await permissionService.checkPermission(
        req.user.role,
        resource,
        action,
        req.user.college_id
      );

      if (!hasPermission) {
        const AppError = require("../utils/AppError");
        throw new AppError(
          `Access denied: insufficient permissions for ${resource}:${action}`,
          403,
          "FORBIDDEN_PERMISSION"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  permission,
  requirePermission
};