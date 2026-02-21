const Course = require("../models/course.model");
const Department = require("../models/department.model");

/**
 * CREATE Course
 */
exports.createCourse = async (req, res) => {
  const {
    department_id,
    name,
    code,
    type,
    programLevel,
    semester,
    credits,
    maxStudents
  } = req.body;

  const department = await Department.findOne({
    _id: department_id,
    college_id: req.college_id
  });

  if (!department) {
    return res.status(404).json({ message: "Invalid department" });
  }

  const course = await Course.create({
    college_id: req.college_id,
    department_id,
    name,
    code,
    type,
    programLevel,
    semester,
    credits,
    maxStudents,
    createdBy: req.user.id
  });

  res.status(201).json(course);
};

/**
 * READ Courses by Department
 */
exports.getCoursesByDepartment = async (req, res) => {
  const courses = await Course.find({
    department_id: req.params.departmentId,
    college_id: req.college_id
  });

  res.json(courses);
};

/**
 * READ All Courses (College-wise)
 */
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      college_id: req.college_id
    })
      .populate("department_id", "name code")
      .sort({ name: 1 });

    res.json(courses);
  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};


/**
 * READ Single Course (by ID)
 */
exports.getCourseById = async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.id,
    college_id: req.college_id
  }).populate("department_id", "name code type");

  if (!course) {
    return res.status(404).json({
      message: "Course not found"
    });
  }

  res.json(course);
};


/**
 * UPDATE Course
 */
exports.updateCourse = async (req, res) => {
  const course = await Course.findOneAndUpdate(
    {
      _id: req.params.id,
      college_id: req.college_id
    },
    req.body,
    { new: true }
  );

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.json(course);
};

/**
 * DELETE Course
 */
exports.deleteCourse = async (req, res) => {
  const course = await Course.findOneAndDelete({
    _id: req.params.id,
    college_id: req.college_id
  });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.json({ message: "Course deleted successfully" });
};
