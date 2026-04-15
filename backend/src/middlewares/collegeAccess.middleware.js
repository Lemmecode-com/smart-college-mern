const AppError = require("../utils/AppError");

/**
 * College Access Middleware
 * Ensures user is a college admin with valid college_id
 */
exports.checkCollegeAccess = (req, res, next) => {
  // Check authentication
  if (!req.user) {
    return next(
      new AppError("User not authenticated", 401, "USER_NOT_AUTHENTICATED"),
    );
  }

  // Check role
  if (req.user.role !== "COLLEGE_ADMIN") {
    return next(
      new AppError(
        "Access denied. College admin role required.",
        403,
        "FORBIDDEN",
      ),
    );
  }

  // Check college_id
  if (!req.user.college_id) {
    return next(
      new AppError(
        "College not assigned to user account. Please contact administrator.",
        403,
        "COLLEGE_NOT_ASSIGNED",
      ),
    );
  }

  // Attach college_id for downstream handlers
  req.college_id = req.user.college_id;

  next();
};

/**
 * Super Admin Middleware
 * Ensures user has super admin role
 */
exports.checkSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("User not authenticated", 401, "USER_NOT_AUTHENTICATED"),
    );
  }

  if (req.user.role !== "SUPER_ADMIN") {
    return next(
      new AppError(
        "Access denied. Super admin role required.",
        403,
        "FORBIDDEN",
      ),
    );
  }

  next();
};
