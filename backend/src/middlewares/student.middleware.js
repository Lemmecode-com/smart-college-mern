const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

/**
 * Student Middleware
 * - Fetch student profile
 * - Attach to req.student
 */
module.exports = async (req, res, next) => {
  try {
    const userId = req.user.id;       // from auth middleware
    const collegeId = req.college_id; // from college middleware

    const student = await Student.findOne({
      _id: userId,
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
