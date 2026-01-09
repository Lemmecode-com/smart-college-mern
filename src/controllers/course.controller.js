const Course = require("../models/course.model");

exports.createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const filter = {};

    // support: /api/courses?departmentId=
    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    const courses = await Course.find(filter)
      .populate("departmentId", "name code status");

    res.json(courses);
  } catch (err) {
    next(err);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("departmentId", "name code status");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    next(err);
  }
};