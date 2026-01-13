const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const Attendance = require("../models/attendance.model");

exports.getAdminStats = async (req, res) => {
  try {
    const [
      departments,
      courses,
      students,
      teachers,
      attendance,
    ] = await Promise.all([
      Department.countDocuments(),
      Course.countDocuments(),
      Student.countDocuments(),
      User.countDocuments({ role: "teacher" }),
      Attendance.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        departments,
        courses,
        students,
        teachers,
        attendance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
