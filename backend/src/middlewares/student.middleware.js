const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

/**
 * Student Middleware
 * - Fetch student profile by user_id (not _id)
 * - Attach to req.student
 */
module.exports = async (req, res, next) => {
  try {
    const userId = req.user.id;       // from auth middleware (this is User._id)
    const collegeId = req.college_id; // from college middleware

    // ✅ Use user_id instead of _id
    const student = await Student.findOne({
      user_id: userId,        // ← Changed from _id to user_id
      college_id: collegeId,
      status: "APPROVED"
    });

    if (!student) {
      throw new AppError("Student not found or not approved", 404, "STUDENT_NOT_FOUND");
    }

    req.student = student; // 🔥 attach student
    next();

  } catch (error) {
    next(error);
  }
};
