const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");

/**
 * CREATE SUBJECT
 */
exports.createSubject = async (req, res, next) => {
  const { course_id, name, code, semester, credits, teacher_id } = req.body;

  // Validate course
  const course = await Course.findOne({
    _id: course_id,
    college_id: req.college_id,
  });

  if (!course) {
    throw new AppError("Invalid course", 404, "COURSE_NOT_FOUND");
  }

  // ✅ FIX: validate teacher WITH department
  const teacher = await Teacher.findOne({
    _id: teacher_id,
    college_id: req.college_id,
    department_id: course.department_id, // 🔥 IMPORTANT
  });

  if (!teacher) {
    throw new AppError("Teacher does not belong to this course's department", 404, "TEACHER_NOT_FOUND");
  }

  const subject = await Subject.create({
    college_id: req.college_id,
    department_id: course.department_id, // ✔ keep
    course_id,
    name,
    code,
    semester,
    credits,
    teacher_id,
    createdBy: req.user.id,
  });

  res.status(201).json(subject);
};

/**
 * GET SUBJECTS BY COURSE
 */
exports.getSubjectsByCourse = async (req, res, next) => {
  try {
    const subjects = await Subject.find({
      course_id: req.params.courseId,
      college_id: req.college_id,
    }).populate("teacher_id", "name designation");

    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE SUBJECT
 */
exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id,
      },
      req.body,
      { new: true },
    );

    if (!subject) {
      throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
    }

    res.json(subject);
  } catch (error) {
    next(error);
  }
};

/**
 * GET SUBJECT BY ID
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    }).populate("teacher_id", "name designation")
      .populate("course_id", "name code");

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * DELETE SUBJECT
 */
exports.deleteSubject = async (req, res) => {
  const subject = await Subject.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id,
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  res.json({ message: "Subject deleted successfully" });
};
