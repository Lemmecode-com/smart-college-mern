const Student = require("../models/student.model");

/**
 * LIST ALL STUDENTS REGISTERED VIA FORM (SELF)
 * COLLEGE ADMIN ONLY
 */
exports.getRegisteredStudents = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const { status, department_id, course_id } = req.query;

    const filter = {
      college_id: collegeId,
      registeredVia: "SELF"
    };

    if (status) filter.status = status;
    if (department_id) filter.department_id = department_id;
    if (course_id) filter.course_id = course_id;

    const students = await Student.find(filter)
      .select("-password")
      .populate("department_id", "name")
      .populate("course_id", "name")
      .sort({ createdAt: -1 });

    res.json({
      total: students.length,
      students
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};