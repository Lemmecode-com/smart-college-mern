const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Middleware to attach linked student IDs to request for Parent Guardian role.
 * Allows parents with 0 linked children to reach the dashboard and see the empty state.
 */
module.exports = async (req, res, next) => {
  try {
    const parent = await ParentGuardian.find({
      user_id: req.user.id,
    });

    if (!parent || parent.length === 0) {
      // Parent exists but has no linked children yet — allow through so the
      // frontend can display the appropriate empty state.
      req.linkedStudentIds = [];
      req.parentRelation = null;
      req.parentGuardianRecords = [];
      return next();
    }

    const hasAccess = parent.some(
      (record) =>
        record.college_id &&
        req.college_id &&
        record.college_id.toString() === req.college_id.toString(),
    );
    if (!hasAccess) {
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND"),
      );
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
