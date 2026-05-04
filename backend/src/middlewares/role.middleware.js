const AppError = require("../utils/AppError");
const permissionService = require("../services/permission.service");

module.exports = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized: user not authenticated", 401, "UNAUTHORIZED");
      }

      if (!req.user.role) {
        throw new AppError("Unauthorized: user role missing", 401, "ROLE_MISSING");
      }

      const userRole = String(req.user.role).toUpperCase();

      // Check if this is a permission-based route (has resource in req)
      if (req.permissionResource && req.permissionAction) {
        const hasPermission = await permissionService.checkPermission(
          userRole,
          req.permissionResource,
          req.permissionAction,
          req.user.college_id
        );

        if (!hasPermission) {
          throw new AppError(
            `Access denied: insufficient permissions for ${req.permissionResource}:${req.permissionAction}`,
            403,
            "FORBIDDEN_PERMISSION"
          );
        }

        return next();
      }

      // Backward compatibility: fall back to role-based checking
      const normalizedAllowed = allowedRoles
        .filter(r => r != null)
        .map(r => String(r).toUpperCase());

      if (!normalizedAllowed.includes(userRole)) {
        throw new AppError(
          `Access denied: role ${req.user.role} not allowed`,
          403,
          "FORBIDDEN_ROLE"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};