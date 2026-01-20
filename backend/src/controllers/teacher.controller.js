const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");

/**
 * CREATE Teacher
 */
exports.createTeacher = async (req, res) => {
  const {
    name,
    email,
    employeeId,
    designation,
    qualification,
    experienceYears,
    department_id
  } = req.body;

  // Validate department belongs to college
  const department = await Department.findOne({
    _id: department_id,
    college_id: req.college_id
  });

  if (!department) {
    return res.status(404).json({ message: "Invalid department" });
  }

  const teacher = await Teacher.create({
    college_id: req.college_id,
    department_id,
    name,
    email,
    employeeId,
    designation,
    qualification,
    experienceYears,
    createdBy: req.user.id
  });

  res.status(201).json(teacher);
};

/**
 * READ Teachers (college-wise)
 */
exports.getTeachers = async (req, res) => {
  const teachers = await Teacher.find({
    college_id: req.college_id
  }).populate("department_id", "name code");

  res.json(teachers);
};

/**
 * READ Teacher by ID
 */
exports.getTeacherById = async (req, res) => {
  const teacher = await Teacher.findOne({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json(teacher);
};

/**
 * UPDATE Teacher
 */
exports.updateTeacher = async (req, res) => {
  const teacher = await Teacher.findOneAndUpdate(
    {
      _id: req.params.id,
      college_id: req.college_id
    },
    req.body,
    { new: true }
  );

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json(teacher);
};

/**
 * DELETE Teacher
 */
exports.deleteTeacher = async (req, res) => {
  const teacher = await Teacher.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!teacher) {
    return res.status(404).json({ message: "Teacher not found" });
  }

  res.json({ message: "Teacher deleted successfully" });
};
