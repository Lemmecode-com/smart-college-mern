const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Middleware to attach linked student IDs to request for Parent Guardian role
 */
module.exports = async (req, res, next) => {
  try {
    console.log('Parent middleware - User ID:', req.user.id);
    console.log('Parent middleware - User role:', req.user.role);

    // Find parent guardian record for the logged-in user
    const parent = await ParentGuardian.findOne({ user_id: req.user.id });

    console.log('Parent middleware - Found parent record:', !!parent);

    if (parent) {
      console.log('Parent middleware - Student IDs:', parent.student_ids);
      console.log('Parent middleware - Relation:', parent.relation);
    }

    if (!parent) {
      console.log('Parent middleware - No parent record found for user:', req.user.id);
      return next(
        new AppError("Parent guardian profile not found", 404, "PARENT_NOT_FOUND")
      );
    }

    // Attach linked student IDs to request
    req.linkedStudentIds = parent.student_ids;
    req.parentRelation = parent.relation;

    console.log('Parent middleware - Attached linkedStudentIds:', req.linkedStudentIds);

    next();
  } catch (error) {
    console.error('Parent middleware error:', error);
    next(error);
  }
};
