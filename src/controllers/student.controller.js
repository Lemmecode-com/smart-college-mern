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
    const students = await Student.find()
      .populate("department", "name")
      .populate("course", "name code");

    res.json(students);
  } catch (err) {
    next(err);
  }
};

exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("department", "name")
      .populate("course", "name code");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    next(err);
  }
};
