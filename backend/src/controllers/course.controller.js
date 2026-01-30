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
 * READ Single Course (by ID)
 */
exports.getCourseById = async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.id,
    college_id: req.college_id
  });

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
