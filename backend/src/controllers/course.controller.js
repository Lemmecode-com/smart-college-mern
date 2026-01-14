const Course = require("../models/course.model");
const Department = require("../models/department.model");

/**
 * CREATE Course
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { name, code, departmentId, duration } = req.body;

    if (!name || !code || !departmentId) {
      return res.status(400).json({
        message: "Name, code and department are required"
      });
    }

    const department = await Department.findById(departmentId);
    if (!department || department.status !== "Active") {
      return res.status(400).json({
        message: "Invalid department"
      });
    }

    const course = await Course.create({
      name,
      code,
      departmentId,
      duration
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET Courses (optionally by department)
 */
exports.getCourses = async (req, res, next) => {
  try {
    const filter = { status: "Active" };

    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    const courses = await Course.find(filter)
      .populate("departmentId", "name code")
      .sort({ name: 1 });

    res.json({
      success: true,
      data: courses
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE Course
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (err) {
    next(err);
  }
};

/**
 * SOFT DELETE Course
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "Inactive" },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      success: true,
      message: "Course deactivated"
    });
  } catch (err) {
    next(err);
  }
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
