const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Teacher = require("../models/teacher.model");

/**
 * CREATE SUBJECT
 */
exports.createSubject = async (req, res) => {
  const { course_id, name, code, semester, credits, teacher_id } = req.body;

  // Validate course
  const course = await Course.findOne({
    _id: course_id,
    college_id: req.college_id,
  });

  if (!course) {
    return res.status(404).json({ message: "Invalid course" });
  }

  // ✅ FIX: validate teacher WITH department
  const teacher = await Teacher.findOne({
    _id: teacher_id,
    college_id: req.college_id,
    department_id: course.department_id, // 🔥 IMPORTANT
  });

  if (!teacher) {
    return res.status(400).json({
      message: "Teacher does not belong to this course's department",
    });
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
exports.getSubjectsByCourse = async (req, res) => {
  const subjects = await Subject.find({
    course_id: req.params.courseId,
    college_id: req.college_id,
  }).populate("teacher_id", "name designation");

  res.json(subjects);
};

/**
 * UPDATE SUBJECT
 */
exports.updateSubject = async (req, res) => {
  const subject = await Subject.findOneAndUpdate(
    {
      _id: req.params.id,
      college_id: req.college_id,
    },
    req.body,
    { new: true },
  );

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  res.json(subject);
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
