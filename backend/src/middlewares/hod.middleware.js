const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");

module.exports = async (req, res, next) => {
  const teacher = await Teacher.findOne({ user_id: req.user.id });
  if (!teacher) {
    return res.status(403).json({ message: "Teacher not found" });
  }

  const department = await Department.findOne({
    _id: timetable.department_id,
    hod_id: teacher._id,
  });

  if (!department) {
    return res.status(403).json({
      message: "Access denied: Only HOD can manage timetable",
    });
  }

  req.department = department;
  next();
};
