const Student = require("../models/student.model");

exports.createStudent = async (req, res, next) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const filter = {};

    // support: /api/students?courseId=
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const students = await Student.find(filter)
      .populate("courseId", "name duration status")
      .populate("departmentId", "name code status")
      .populate("parentId", "name email role");

    res.json(students);
  } catch (err) {
    next(err);
  }
};

exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("courseId", "name duration status")
      .populate("departmentId", "name code status")
      .populate("parentId", "name email role");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
};