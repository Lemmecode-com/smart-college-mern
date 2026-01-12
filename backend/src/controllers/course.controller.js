// src/controllers/course.controller.js
const Course = require("../models/course.model");

// Utility: Generate course code
const generateCourseCode = (name) => {
  return name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .map(w => w.substring(0, 2))
    .join("")
    .toUpperCase();
};

// Admin: Create course
exports.createCourse = async (req, res) => {
  try {
    const { name, code, departmentId, teacherId, duration } = req.body;

    if (!name || !code || !departmentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = await Course.create({
      name,
      code,
      departmentId,
      teacherId,
      duration,
    });

    res.status(201).json({
      message: "Course created successfully",
      data: course,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: Get all courses
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("departmentId", "name")
      .populate("teacherId", "name email");

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// // Teacher: Get assigned courses
// exports.getMyCourses = async (req, res) => {
//   try {
//     const courses = await Course.find({ teacherId: req.user.id }).populate(
//       "departmentId",
//       "name"
//     );

//     res.json(courses);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Teacher: Get my courses
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      teacherId: req.user.id,
      status: "Active",
    })
      .populate("departmentId", "name code")
      .populate("teacherId", "name email");

    res.json({
      success: true,
      data: courses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignTeacher = async (req, res) => {
  const { teacherId } = req.body;

  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { teacherId },
    { new: true }
  );

  res.json({
    success: true,
    data: course,
  });
};

// exports.getMyCourses = async (req, res) => {
//   const courses = await Course.find({
//     teacherId: req.user.id,
//     status: "Active",
//   });

//   res.json({
//     success: true,
//     data: courses,
//   });
// };




// const Course = require("../models/course.model");

// // Admin: Create course
// exports.createCourse = async (req, res) => {
//   try {
//     const { name, code, departmentId, teacherId, duration } = req.body;

//     if (!name || !code || !departmentId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     const course = await Course.create({
//       name,
//       code,
//       departmentId,
//       teacherId,
//       duration,
//     });

//     res.status(201).json({
//       success: true,
//       data: course,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: Get all courses
// exports.getCourses = async (req, res) => {
//   try {
//     const courses = await Course.find()
//       .populate("departmentId", "name code")
//       .populate("teacherId", "name email");

//     res.json({
//       success: true,
//       data: courses,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Teacher: Get my courses
// exports.getMyCourses = async (req, res) => {
//   try {
//     const courses = await Course.find({
//       teacherId: req.user.id,
//       status: "Active",
//     })
//       .populate("departmentId", "name code")
//       .populate("teacherId", "name email");

//     res.json({
//       success: true,
//       data: courses,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: Assign teacher
// exports.assignTeacher = async (req, res) => {
//   try {
//     const { teacherId } = req.body;

//     const course = await Course.findByIdAndUpdate(
//       req.params.id,
//       { teacherId },
//       { new: true }
//     );

//     res.json({
//       success: true,
//       data: course,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
