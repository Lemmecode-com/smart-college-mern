const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Middleware to attach linked student IDs to request for Parent Guardian role
 */
module.exports = async (req, res, next) => {
  try {
    // Find parent guardian record for the logged-in user
    const parent = await ParentGuardian.findOne({ user_id: req.user._id });

    if (!parent) {
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
      );
    }

    // Attach linked student IDs to request
    req.linkedStudentIds = parent.student_ids;
    req.parentRelation = parent.relation;

    next();
  } catch (error) {
    next(error);
  }
};
