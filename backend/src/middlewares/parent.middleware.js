const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Middleware to attach linked student IDs to request for Parent Guardian role
 */
module.exports = async (req, res, next) => {
  try {
    // Query by user_id first, then filter by college_id if needed
    // This handles both migrated records (without college_id) and new records
    const parent = await ParentGuardian.findOne({
      user_id: req.user.id,
    });

    if (!parent) {
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
      );
    }

    // Validate college_id matches if present in the record
    if (parent.college_id && req.college_id &&
        parent.college_id.toString() !== req.college_id.toString()) {
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
      );
    }

    req.linkedStudentIds = parent.student_ids;
    req.parentRelation = parent.relation;

    next();
  } catch (error) {
    next(error);
  }
};
