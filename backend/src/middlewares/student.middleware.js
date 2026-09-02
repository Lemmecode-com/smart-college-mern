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

    console.log("🔍 Student Middleware - Looking for student:", {
      user_id: userId,
      college_id: collegeId,
      userEmail: req.user.email
    });

    // ✅ Use user_id instead of _id
    const student = await Student.findOne({
      user_id: userId,        // ← Changed from _id to user_id
      college_id: collegeId,
      // status: "APPROVED"  // ← Temporarily comment out to see all students
    });

    if (!student) {
      console.log("❌ Student not found with user_id:", userId);
      throw new AppError("Student not found or not approved", 404, "STUDENT_NOT_FOUND");
    }

    console.log("✅ Student found:", student.fullName, "Status:", student.status);

    if (!["APPROVED", "ENROLLED"].includes(student.status)) {
      console.log("⚠️ Student not approved yet. Status:", student.status);
      throw new AppError("Student account is pending approval", 403, "STUDENT_NOT_APPROVED");
    }

    req.student = student; // 🔥 attach student
    next();

  } catch (error) {
    console.error("❌ Student Middleware Error:", error.message, error.code);
    next(error);
  }
};