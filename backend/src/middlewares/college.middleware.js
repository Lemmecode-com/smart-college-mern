const College = require("../models/college.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * 🔒 Hardened Multi-Tenant College Isolation Middleware
 *
 * Enforces strict multi-tenancy boundaries across all protected college endpoints:
 * 1. Super Admin bypass (platform-level operations)
 * 2. Authentication check
 * 3. College ID resolution (JWT with fallback to User document)
 * 4. Cross-tenant parameter tampering detection (req.params, req.query, req.body)
 * 5. College existence and suspension/deactivation check
 * 6. Subscription expiry check (with 7-day advance warning)
 * 7. Attaching verified college context & isolation audit metadata to req
 */
module.exports = async (req, res, next) => {
  try {
    // 1. Super Admin bypasses college checks
    if (req.user && req.user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!req.user) {
      throw new AppError("User not authenticated", 401, "USER_NOT_AUTHENTICATED");
    }

    // 2. Resolve college_id from JWT or DB fallback
    let collegeId = req.user.college_id;
    let collegeSource = "jwt";

    if (!collegeId) {
      logger.info("collegeId missing from JWT, attempting DB fallback", {
        userId: req.user.id,
        role: req.user.role,
      });
      const user = await User.findById(req.user.id).select("college_id");
      if (user && user.college_id) {
        collegeId = user.college_id;
        req.user.college_id = collegeId; // attach for downstream
        collegeSource = "db_fallback";
        logger.info("College ID recovered from DB", { userId: req.user.id, collegeId });
      } else {
        logger.warn("College ID fallback failed — user doc missing college_id", {
          userId: req.user.id,
          role: req.user.role,
          userFound: !!user,
          userCollegeId: user?.college_id,
        });
      }
    }

    if (!collegeId) {
      logger.warn("College ID missing after fallback — rejecting request", {
        userId: req.user.id,
        role: req.user.role,
        source: collegeSource,
        path: req.path,
      });
      throw new AppError(
        "College not assigned to user account. Please contact administrator.",
        403,
        "COLLEGE_NOT_ASSIGNED"
      );
    }

    // 3. Cross-Tenant Parameter Tampering Detection
    // Check if client explicitly supplied a college_id/collegeId in params, query, or body that mismatches the authenticated college
    const requestedCollegeId =
      req.params?.college_id ||
      req.params?.collegeId ||
      req.query?.college_id ||
      req.query?.collegeId ||
      req.body?.college_id ||
      req.body?.collegeId;

    if (requestedCollegeId && requestedCollegeId.toString() !== collegeId.toString()) {
      logger.error("🚨 CRITICAL: COLLEGE ISOLATION VIOLATION ATTEMPT", {
        userId: req.user.id,
        userEmail: req.user.email || "unknown",
        userRole: req.user.role,
        userCollege: collegeId.toString(),
        attemptedCollege: requestedCollegeId.toString(),
        endpoint: `${req.method} ${req.originalUrl || req.url}`,
        ip: req.ip,
        userAgent: req.headers ? req.headers["user-agent"] : undefined,
        timestamp: new Date().toISOString(),
      });

      throw new AppError(
        "Security violation: Attempting to access data from another college is not permitted",
        403,
        "COLLEGE_ISOLATION_VIOLATION"
      );
    }

    logger.debug("College ID resolved", {
      userId: req.user.id,
      collegeId,
      source: collegeSource,
    });

    // 4. Fetch and validate college document
    const college = await College.findById(collegeId);

    if (!college) {
      logger.error("College not found for collegeId", {
        userId: req.user.id,
        collegeId,
        role: req.user.role,
      });
      throw new AppError(
        "Your college account is invalid or has been removed. Please contact administrator.",
        403,
        "COLLEGE_NOT_FOUND"
      );
    }

    // 5. Check if college is active
    if (!college.isActive) {
      logger.error("College is suspended or deactivated — access denied", {
        userId: req.user.id,
        collegeId,
        collegeName: college.name,
      });
      throw new AppError(
        "Your college account has been deactivated. Please contact support for assistance.",
        403,
        "COLLEGE_SUSPENDED"
      );
    }

    // 6. Check subscription expiry (if field exists on college)
    if (college.subscriptionExpiry) {
      const now = new Date();
      const expiryDate = new Date(college.subscriptionExpiry);

      if (now > expiryDate) {
        logger.warn("⚠️ EXPIRED SUBSCRIPTION ACCESS ATTEMPT", {
          userId: req.user.id,
          collegeId: college._id,
          collegeName: college.name,
          collegeCode: college.code,
          expiredAt: expiryDate.toISOString(),
          endpoint: `${req.method} ${req.originalUrl || req.url}`,
        });

        throw new AppError(
          "College subscription has expired. Please renew to continue using the system.",
          403,
          "SUBSCRIPTION_EXPIRED"
        );
      }

      // Warn if expiring soon (within 7 days)
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        logger.warn("⚠️ SUBSCRIPTION EXPIRING SOON", {
          collegeId: college._id,
          collegeName: college.name,
          collegeCode: college.code,
          daysRemaining: daysUntilExpiry,
          expiryDate: expiryDate.toISOString(),
        });
      }
    }

    // 7. Attach verified college context & isolation audit metadata
    req.college = college;
    req.college_id = college._id;
    req.collegeCode = college.code;
    req.collegeName = college.name;
    req.isolationChecked = true;
    req.isolationCheckedAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
};
