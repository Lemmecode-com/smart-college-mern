const College = require("../models/college.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    // Super Admin bypasses college check
    if (req.user && req.user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!req.user) {
      throw new AppError("User not authenticated", 401, "USER_NOT_AUTHENTICATED");
    }

    if (!req.user.college_id) {
      throw new AppError(
        "College not assigned to user account. Please contact administrator.",
        403,
        "COLLEGE_NOT_ASSIGNED"
      );
    }

    const college = await College.findById(req.user.college_id);

    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    if (!college.isActive) {
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
