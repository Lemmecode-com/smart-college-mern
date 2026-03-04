const Course = require("../models/course.model");
const Department = require("../models/department.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");

/**
 * CREATE Course
 */
exports.createCourse = async (req, res, next) => {
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
    throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
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

  ApiResponse.created(res, { course }, "Course created successfully");
};

/**
 * READ Courses by Department
 */
exports.getCoursesByDepartment = async (req, res, next) => {
  try {
    const courses = await Course.find({
      department_id: req.params.departmentId,
      college_id: req.college_id
    });

    ApiResponse.success(res, { courses }, "Department courses fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * READ All Courses (College-wise)
 */
exports.getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({
      college_id: req.college_id
    })
      .populate("department_id", "name code")
      .sort({ name: 1 });

    ApiResponse.success(res, { courses }, "Courses fetched successfully");
  } catch (error) {
    next(error);
  }
};


/**
 * READ Single Course (by ID)
 */
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      college_id: req.college_id
    }).populate("department_id", "name code type");

    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    ApiResponse.success(res, { course }, "Course fetched successfully");
  } catch (error) {
    next(error);
  }
};


/**
 * UPDATE Course
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id
      },
      req.body,
      { new: true }
    );

    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    ApiResponse.success(res, { course }, "Course updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE Course
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      college_id: req.college_id
    });

    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    ApiResponse.success(res, null, "Course deleted successfully");
  } catch (error) {
    next(error);
  }
};
