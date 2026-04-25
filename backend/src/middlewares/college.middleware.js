const College = require("../models/college.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

module.exports = async (req, res, next) => {
  try {
    // Super Admin bypasses college check
    if (req.user && req.user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!req.user) {
      throw new AppError("User not authenticated", 401, "USER_NOT_AUTHENTICATED");
    }

    // Use college_id from JWT if available
    let collegeId = req.user.college_id;
    let collegeSource = "jwt";

    // If missing and user is not SUPER_ADMIN, try fallback lookup from User collection
    if (!collegeId && req.user.role !== "SUPER_ADMIN") {
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

    logger.debug("College ID resolved", {
      userId: req.user.id,
      collegeId,
      source: collegeSource,
    });

    const college = await College.findById(collegeId);

    if (!college) {
      logger.error("College not found for collegeId", { userId: req.user.id, collegeId, role: req.user.role });
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    if (!college.isActive) {
      logger.error("College is suspended — access denied", { userId: req.user.id, collegeId, collegeName: college.name });
      throw new AppError("College is suspended", 403, "COLLEGE_SUSPENDED");
    }

    // Attach college info
    req.college = college;
    req.college_id = college._id;
    req.collegeCode = college.code;

    next();
  } catch (error) {
    next(error);
  }
};
