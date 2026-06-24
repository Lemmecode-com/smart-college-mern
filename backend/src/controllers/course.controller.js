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
    durationSemesters,
    durationYears,
    credits,
    maxStudents,
    yearLabels
  } = req.body;

  // Validate department
  const department = await Department.findOne({
    _id: department_id,
    college_id: req.college_id
  });

  if (!department) {
    throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
  }

  // ✅ Validate duration
  if (!durationSemesters || durationSemesters < 1 || durationSemesters > 8) {
    throw new AppError("Program duration must be 1-8 semesters", 400, "INVALID_DURATION");
  }

  // Note: durationYears is auto-calculated by the model's pre-save hook
  // If provided, it will be validated by the model

  // Warn if creating long duration program
  if (durationSemesters > 6 && programLevel === "UG") {
    console.warn(`⚠️ Creating advanced program "${name}" with ${durationSemesters} semesters`);
  }

  // Create course with new duration fields
  // Note: durationYears will be auto-calculated by the model's pre-save hook
  const courseData = {
    college_id: req.college_id,
    department_id,
    name,
    code,
    type,
    programLevel,
    durationSemesters,
    credits,
    maxStudents,
    createdBy: req.user.id
  };

  if (Array.isArray(yearLabels)) {
    courseData.yearLabels = yearLabels.filter((label) => typeof label === "string" && label.trim().length > 0).map((label) => label.trim());
  }

// Only add durationYears if provided (otherwise let pre-save hook calculate it)
   if (durationYears) {
     courseData.durationYears = durationYears;
   }

   try {
     const course = await Course.create(courseData);
     ApiResponse.created(res, { course }, "Course created successfully");
   } catch (error) {
     throw error;
   }
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
