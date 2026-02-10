const Teacher = require("../models/teacher.model");

module.exports = async (req, res, next) => {
  try {
    // Auth must already populate req.user
    if (!req.user || req.user.role !== "TEACHER") {
      return res.status(403).json({
        message: "Access denied: teacher only",
      });
    }

    // ✅ CORRECT LOOKUP
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher account not found",
      });
    }

    // ✅ Attach resolved teacher context
    req.teacher = teacher;
    req.teacher_id = teacher._id;
    req.college_id = teacher.college_id;

    next();
  } catch (error) {
    console.error("Teacher middleware error:", error);
    res.status(500).json({
      message: "Teacher authentication failed",
    });
  }
};
