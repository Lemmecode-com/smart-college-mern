const Teacher = require("../models/teacher.model");

module.exports = async (req, res, next) => {
  try {
    // Auth middleware must already set req.user
    if (!req.user || req.user.role !== "TEACHER") {
      return res.status(403).json({
        message: "Access denied: teacher only",
      });
    }

    const teacher = await Teacher.findById(req.user.id);

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher account not found",
      });
    }

    // Attach useful data
    req.teacher = teacher;
    req.teacher_id = teacher._id;
    req.college_id = teacher.college_id;

    next();
  } catch (error) {
    res.status(500).json({
      message: "Teacher authentication failed",
    });
  }
};
