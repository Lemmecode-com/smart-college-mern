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
    const userRole = req.user.role.toUpperCase();

    if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
      throw new AppError(
        `Access denied: role ${req.user.role} not allowed`,
        403,
        "FORBIDDEN_ROLE"
      );
    }

    next();
  };
};