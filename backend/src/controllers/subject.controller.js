const Subject = require("../models/subject.model");
const Course = require("../models/course.model");

/**
 * CREATE Subject
 */
exports.createSubject = async (req, res, next) => {
  try {
    const { name, code, courseId } = req.body;

    if (!name || !code || !courseId) {
      return res.status(400).json({
        message: "Name, code and course are required"
      });
    }

    const course = await Course.findById(courseId);
    if (!course || course.status !== "Active") {
      return res.status(400).json({
        message: "Invalid course"
      });
    }

    const subject = await Subject.create({
      name,
      code,
      courseId,
      departmentId: course.departmentId,
      collegeId: req.user.collegeId
    });

    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET Subjects (by course)
 */
exports.getSubjects = async (req, res, next) => {
  try {
    if (!req.query.courseId) {
      return res.status(400).json({
        message: "courseId is required"
      });
    }

    const subjects = await Subject.find({
      courseId: req.query.courseId,
      status: "Active"
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: subjects
    });
  } catch (err) {
    next(err);
  }
};

/**
 * SOFT DELETE Subject
 */
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { status: "Inactive" },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({
      success: true,
      message: "Subject deactivated"
    });
  } catch (err) {
    next(err);
  }
};
