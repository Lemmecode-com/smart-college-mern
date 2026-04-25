const AppError = require("../utils/AppError");

module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError("Unauthorized: user not authenticated", 401, "UNAUTHORIZED");
    }

    if (!req.user.role) {
      throw new AppError("Unauthorized: user role missing", 401, "ROLE_MISSING");
    }

    // Normalize role comparison
    const userRole = String(req.user.role).toUpperCase();

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
  };
};