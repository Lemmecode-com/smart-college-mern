const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    // Auth must already populate req.user
    if (!req.user || req.user.role !== "TEACHER") {
      throw new AppError("Access denied: teacher only", 403, "TEACHER_ROLE_REQUIRED");
    }

    // ✅ CORRECT LOOKUP
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      throw new AppError("Teacher account not found", 404, "TEACHER_NOT_FOUND");
    }

    // ✅ Attach resolved teacher context
    req.teacher = teacher;
    req.teacher_id = teacher._id;
    req.college_id = teacher.college_id;

    next();
  } catch (error) {
    next(error);
  }
};
