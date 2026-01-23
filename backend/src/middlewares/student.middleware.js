const Student = require("../models/student.model");

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
      return res.status(403).json({
        message: "Student not found or not approved"
      });
    }

    req.student = student; // 🔥 attach student
    next();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
