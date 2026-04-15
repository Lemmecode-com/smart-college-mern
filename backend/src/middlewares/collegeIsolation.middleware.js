const College = require("../models/college.model");
const AppError = require("../utils/AppError");

/**
 * 🔒 ENHANCED COLLEGE ISOLATION MIDDLEWARE
 * 
 * Purpose: Extra security layer for sensitive operations
 * 
 * Use this for:
 * - Payment routes (student fees, admin payments)
 * - Bulk operations (bulk student import, bulk promotion)
 * - Data export (student lists, attendance reports)
 * - Admin-only sensitive operations
 * 
 * Difference from college.middleware.js:
 * - Adds subscription expiry check
 * - Adds user role permission validation
 * - More detailed audit logging
 * - Stricter error messages
 */

module.exports = function collegeIsolation(options = {}) {
  return async (req, res, next) => {
    try {
      // 🔒 Step 1: Super Admin bypasses all checks
      if (req.user.role === "SUPER_ADMIN") {
        return next();
      }

      // 🔒 Step 2: Validate user has college association
      if (!req.user.college_id) {
        console.warn(`⚠️ UNASSIGNED USER ACCESS ATTEMPT:
          User: ${req.user.id}
          Role: ${req.user.role}
          Endpoint: ${req.method} ${req.originalUrl}
          IP: ${req.ip}
        `);
        
        throw new AppError(
          "User not associated with any college. Please contact administrator.",
          403,
          "NO_COLLEGE_ASSOCIATION"
        );
      }

      // 🔒 Step 3: Fetch and validate college
      const college = await College.findById(req.user.college_id);

      if (!college) {
        console.error(`❌ COLLEGE NOT FOUND:
          User: ${req.user.id}
          College ID: ${req.user.college_id}
          Endpoint: ${req.method} ${req.originalUrl}
        `);

        throw new AppError(
          "Associated college not found in system",
          403,
          "COLLEGE_NOT_FOUND"
        );
      }

      // 🔒 Step 4: Check if college is active
      if (!college.isActive) {
        console.warn(`⚠️ DEACTIVATED COLLEGE ACCESS ATTEMPT:
          User: ${req.user.id}
          College: ${college.name} (${college.code})
          Endpoint: ${req.method} ${req.originalUrl}
        `);

        throw new AppError(
          "Your college account has been deactivated. Please contact support for assistance.",
          403,
          "COLLEGE_DEACTIVATED"
        );
      }

      // 🔒 Step 5: Check subscription expiry (if field exists)
      if (college.subscriptionExpiry) {
        const now = new Date();
        const expiryDate = new Date(college.subscriptionExpiry);

        if (now > expiryDate) {
          console.warn(`⚠️ EXPIRED SUBSCRIPTION ACCESS ATTEMPT:
            User: ${req.user.id}
            College: ${college.name} (${college.code})
            Expired: ${expiryDate.toISOString()}
            Endpoint: ${req.method} ${req.originalUrl}
          `);

          throw new AppError(
            "College subscription has expired. Please renew to continue using the system.",
            403,
            "SUBSCRIPTION_EXPIRED"
          );
        }

        // Warn if expiring soon (within 7 days)
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7) {
          console.warn(`⚠️ SUBSCRIPTION EXPIRING SOON:
            College: ${college.name} (${college.code})
            Days Remaining: ${daysUntilExpiry}
            Expiry Date: ${expiryDate.toISOString()}
          `);
          // Don't block, just log warning
        }
      }

      // 🔒 Step 6: Check for college_id manipulation in request
      const requestedCollegeId = 
        req.params.college_id || 
        req.query.college_id || 
        req.body.college_id;

      if (requestedCollegeId && requestedCollegeId !== req.user.college_id.toString()) {
        // 🔒 SECURITY: Log detailed violation attempt
        console.error(`🚨 CRITICAL: COLLEGE ISOLATION VIOLATION ATTEMPT:
          User ID: ${req.user.id}
          User Email: ${req.user.email || 'unknown'}
          User Role: ${req.user.role}
          User's College: ${req.user.college_id}
          Attempted College: ${requestedCollegeId}
          Endpoint: ${req.method} ${req.originalUrl}
          IP Address: ${req.ip}
          User Agent: ${req.headers['user-agent']}
          Timestamp: ${new Date().toISOString()}
          Request Body: ${JSON.stringify(req.body)}
        `);

        throw new AppError(
          "Security violation: Attempting to access data from another college is not permitted",
          403,
          "COLLEGE_ISOLATION_VIOLATION"
        );
      }

      // 🔒 Step 7: Validate role-based access (if options provided)
      if (options.allowedRoles && !options.allowedRoles.includes(req.user.role)) {
        console.warn(`⚠️ ROLE-BASED ACCESS DENIED:
          User: ${req.user.id}
          Role: ${req.user.role}
          Allowed Roles: ${options.allowedRoles.join(', ')}
          Endpoint: ${req.method} ${req.originalUrl}
        `);

        throw new AppError(
          `Access denied: This operation requires one of the following roles: ${options.allowedRoles.join(', ')}`,
          403,
          "ROLE_NOT_ALLOWED"
        );
      }

      // ✅ All checks passed - attach college to request
      req.college = college;
      req.college_id = college._id;
      req.collegeCode = college.code;
      req.collegeName = college.name;

      // Attach isolation metadata for audit
      req.isolationChecked = true;
      req.isolationCheckedAt = new Date();

      next();
    } catch (error) {
      next(error);
    }
  };
};
