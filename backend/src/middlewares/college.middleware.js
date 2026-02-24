const College = require("../models/college.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    // Super Admin bypasses college check
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!req.user.college_id) {
      throw new AppError("College not assigned", 403, "COLLEGE_NOT_ASSIGNED");
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