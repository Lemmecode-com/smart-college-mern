const collegeMiddleware = require("./college.middleware");
const AppError = require("../utils/AppError");

/**
 * 🔒 ENHANCED COLLEGE ISOLATION MIDDLEWARE
 *
 * Unified wrapper delegating to the hardened `college.middleware.js`.
 * All core multi-tenancy protections (subscriptionExpiry, cross-tenant parameter
 * tampering detection, and security violation audit logging) are enforced in `college.middleware.js`.
 *
 * This wrapper provides backward compatibility and optional role-based gating:
 * - `collegeIsolation()`
 * - `collegeIsolation({ allowedRoles: ['COLLEGE_ADMIN', 'ADMISSION_OFFICER'] })`
 * - Direct middleware usage: `collegeIsolation(req, res, next)`
 */
module.exports = function collegeIsolation(optionsOrReq = {}, res, next) {
  // If invoked directly as middleware: collegeIsolation(req, res, next)
  if (optionsOrReq && optionsOrReq.method && typeof res?.status === "function" && typeof next === "function") {
    return collegeMiddleware(optionsOrReq, res, next);
  }

  // If invoked as a factory: collegeIsolation(options)(req, res, next)
  const options = optionsOrReq || {};
  return async (req, res, next) => {
    try {
      // Role-based access check (if options.allowedRoles specified)
      if (
        options.allowedRoles &&
        req.user &&
        req.user.role !== "SUPER_ADMIN" &&
        !options.allowedRoles.includes(req.user.role)
      ) {
        throw new AppError(
          `Access denied: This operation requires one of the following roles: ${options.allowedRoles.join(", ")}`,
          403,
          "ROLE_NOT_ALLOWED"
        );
      }

      return collegeMiddleware(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
