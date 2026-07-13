const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Middleware to attach linked student IDs to request for Parent Guardian role
 */
module.exports = async (req, res, next) => {
  try {
    const parent = await ParentGuardian.find({
      user_id: req.user.id,
    });

    if (!parent || parent.length === 0) {
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
      );
    }

    for (const record of parent) {
      if (record.college_id && req.college_id &&
          record.college_id.toString() !== req.college_id.toString()) {
        return next(
          new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
        );
      }
    }

    const studentIds = [...new Set(parent.flatMap((r) => r.student_ids || []))].map((id) => id.toString());
    req.linkedStudentIds = studentIds;
    req.parentRelation = parent[0].relation;
    req.parentGuardianRecords = parent;

    next();
  } catch (error) {
    next(error);
  }
};
