const Course = require("../models/course.model");
const Department = require("../models/department.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const Timetable = require("../models/timetable.model");
const Exam = require("../models/exam.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const AuditService = require("../services/auditLog.service");
const { STUDENT_STATUS } = require("../utils/constants");

/**
 * CREATE Course
 */
exports.createCourse = async (req, res, next) => {
  console.log('📝 [CREATE COURSE] Request body:', req.body);
  console.log('📝 [CREATE COURSE] College ID:', req.college_id);
  console.log('📝 [CREATE COURSE] User ID:', req.user?.id);
  
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

  if (department.status === "INACTIVE" || department.isActive === false) {
    throw new AppError("Cannot create a course under an inactive department", 400, "DEPARTMENT_INACTIVE");
  }

  // ✅ Validate duration
  if (!durationSemesters || durationSemesters < 1 || durationSemesters > 8) {
    throw new AppError("Program duration must be 1-8 semesters", 400, "INVALID_DURATION");
  }

  // ✅ Validate maxStudents (must be a positive integer > 0)
  if (
    maxStudents === undefined ||
    maxStudents === null ||
    maxStudents === "" ||
    !Number.isFinite(Number(maxStudents)) ||
    !Number.isInteger(Number(maxStudents)) ||
    Number(maxStudents) <= 0
  ) {
    throw new AppError("Maximum Students must be greater than 0", 400, "INVALID_MAX_STUDENTS");
  }

  // Note: durationYears is always auto-calculated by the pre('save') hook — never trust client value

  // Warn if creating long duration program
  if (durationSemesters > 6 && programLevel === "UG") {
    console.warn(`⚠️ Creating advanced program "${name}" with ${durationSemesters} semesters`);
  }

  // ✅ Check for duplicate course code in the same department
  const duplicate = await Course.findOne({
    college_id: req.college_id,
    department_id,
    code: code.toUpperCase()
  });

  if (duplicate) {
    throw new AppError("duplicate course code", 409, "DUPLICATE_COURSE_CODE");
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

  // Never trust a client-supplied durationYears — the pre('save') hook always calculates it

  console.log('📝 [CREATE COURSE] Course data to save:', courseData);

  try {
    const course = await Course.create(courseData);
    console.log('✅ [CREATE COURSE] Course created:', course._id);
    ApiResponse.created(res, { course }, "Course created successfully");
  } catch (error) {
    console.error('❌ [CREATE COURSE] Error creating course:', error.message);
    console.error('❌ [CREATE COURSE] Full error:', error);
    next(error);
  }
};

/**
 * READ Courses by Department
 */
exports.getCoursesByDepartment = async (req, res, next) => {
  try {
    const { includeInactive, status } = req.query;
    const filter = {
      department_id: req.params.departmentId,
      college_id: req.college_id,
    };

    if (status) {
      filter.status = status.toUpperCase();
      if (filter.status === "ACTIVE") {
        filter.isActive = { $ne: false };
      } else if (filter.status === "INACTIVE") {
        filter.isActive = { $ne: true };
      }
    } else if (includeInactive !== "true") {
      filter.status = "ACTIVE";
      filter.isActive = { $ne: false };
    }

    const courses = await Course.find(filter);
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
    const { status, type, programLevel, departmentId, search, includeInactive } = req.query;

    const filter = {
      college_id: req.college_id,
      ...(type && { type: type.toUpperCase() }),
      ...(programLevel && { programLevel: programLevel.toUpperCase() }),
      ...(departmentId && { department_id: departmentId }),
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } }
        ]
      })
    };

    if (status) {
      filter.status = status.toUpperCase();
      if (filter.status === "ACTIVE") {
        filter.isActive = { $ne: false };
      } else if (filter.status === "INACTIVE") {
        filter.isActive = { $ne: true };
      }
    } else if (includeInactive !== "true") {
      filter.status = "ACTIVE";
      filter.isActive = { $ne: false };
    }

    const courses = await Course.find(filter)
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
    console.log('[getCourseById] Request ID:', req.params.id);
    console.log('[getCourseById] College ID:', req.college_id);
    
    const course = await Course.findOne({
      _id: req.params.id,
      college_id: req.college_id
    }).populate("department_id", "name code type");
    
    console.log('[getCourseById] Found course:', course ? course.name : 'NULL');

    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    ApiResponse.success(res, { course }, "Course fetched successfully");
  } catch (error) {
    console.error('[getCourseById] Error:', error);
    next(error);
  }
};


/**
 * UPDATE Course
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { code, department_id, maxStudents, durationSemesters } = req.body;

    // ✅ Validate durationSemesters if being updated
    if (durationSemesters !== undefined && durationSemesters !== null) {
      const sem = Number(durationSemesters);
      if (!Number.isFinite(sem) || !Number.isInteger(sem) || sem < 1 || sem > 8) {
        throw new AppError("Program duration must be 1-8 semesters", 400, "INVALID_DURATION");
      }
    }

    // ✅ Validate maxStudents if it is being updated (must be a positive integer > 0)
    if (maxStudents !== undefined && maxStudents !== null) {
      const parsed = Number(maxStudents);
      if (
        !Number.isFinite(parsed) ||
        !Number.isInteger(parsed) ||
        parsed <= 0
      ) {
        throw new AppError("Maximum Students must be greater than 0", 400, "INVALID_MAX_STUDENTS");
      }
    }

    if (code || department_id) {
      const targetCollegeId = req.college_id;
      const targetDepartmentId = department_id || (await Course.findById(req.params.id).select("department_id"))?.department_id;
      const targetCode = code ? code.toUpperCase() : (await Course.findById(req.params.id).select("code"))?.code;

      const duplicate = await Course.findOne({
        _id: { $ne: req.params.id },
        college_id: targetCollegeId,
        department_id: targetDepartmentId,
        code: targetCode
      });

      if (duplicate) {
        throw new AppError("duplicate course code", 409, "DUPLICATE_COURSE_CODE");
      }
    }

    // Strip durationYears — the pre('findOneAndUpdate') hook on the model owns this field
    const { durationYears: _stripped, ...updatePayload } = req.body;

    const course = await Course.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id
      },
      updatePayload,
      { new: true, runValidators: true }
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

/**
 * DEACTIVATE Course
 * PUT /api/courses/:id/deactivate
 */
exports.deactivateCourse = async (req, res, next) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!course) {
      return ApiResponse.error(res, "Course not found", "COURSE_NOT_FOUND", 404);
    }

    if (course.isActive === false || course.status === "INACTIVE") {
      return ApiResponse.error(
        res,
        "Course is already inactive",
        "COURSE_ALREADY_INACTIVE",
        400
      );
    }

    // 1. Guard against active students enrolled
    const activeStudentsCount = await Student.countDocuments({
      college_id: req.college_id,
      course_id: course._id,
      status: {
        $in: [
          STUDENT_STATUS.APPROVED,
          STUDENT_STATUS.ENROLLED,
          STUDENT_STATUS.OFFER_MADE,
          STUDENT_STATUS.SEAT_CONFIRMED,
          STUDENT_STATUS.PENDING,
        ],
      },
    });
    if (activeStudentsCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate course with ${activeStudentsCount} active student(s). Please graduate, transfer, or process them first.`,
        "COURSE_HAS_ACTIVE_STUDENTS",
        400,
        { activeStudentsCount }
      );
    }

    // 2. Guard against active subjects
    const activeSubjectsCount = await Subject.countDocuments({
      college_id: req.college_id,
      course_id: course._id,
      status: "ACTIVE",
      isActive: { $ne: false },
    });
    if (activeSubjectsCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate course with ${activeSubjectsCount} active subject(s). Please deactivate or reassign subjects first.`,
        "COURSE_HAS_ACTIVE_SUBJECTS",
        400,
        { activeSubjectsCount }
      );
    }

    // 3. Guard against active timetable
    const activeTimetableCount = await Timetable.countDocuments({
      college_id: req.college_id,
      course_id: course._id,
      status: "PUBLISHED",
    });
    if (activeTimetableCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate course with ${activeTimetableCount} active timetable(s). Please archive or remove them first.`,
        "COURSE_HAS_ACTIVE_TIMETABLE",
        400,
        { activeTimetableCount }
      );
    }

    // 4. Guard against active exams
    const activeExamsCount = await Exam.countDocuments({
      college_id: req.college_id,
      course_id: course._id,
      status: "PUBLISHED",
    });
    if (activeExamsCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate course with ${activeExamsCount} running or published exam(s). Please unpublish or conclude them first.`,
        "COURSE_HAS_ACTIVE_EXAMS",
        400,
        { activeExamsCount }
      );
    }

    course.isActive = false;
    course.status = "INACTIVE";
    await course.save();

    AuditService.logCourseDeactivated(req.user, course, req).catch((err) =>
      console.error("Audit log failed:", err.message)
    );

    ApiResponse.success(res, { course }, "Course deactivated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * REACTIVATE Course
 * PUT /api/courses/:id/reactivate
 */
exports.reactivateCourse = async (req, res, next) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!course) {
      return ApiResponse.error(res, "Course not found", "COURSE_NOT_FOUND", 404);
    }

    if (course.isActive === true && course.status === "ACTIVE") {
      return ApiResponse.error(
        res,
        "Course is already active",
        "COURSE_ALREADY_ACTIVE",
        400
      );
    }

    // Guard: parent department must be active
    const department = await Department.findOne({
      _id: course.department_id,
      college_id: req.college_id,
    });

    if (!department || department.status === "INACTIVE" || department.isActive === false) {
      return ApiResponse.error(
        res,
        "Cannot reactivate course because its department is inactive. Please reactivate the department first.",
        "DEPARTMENT_INACTIVE",
        400
      );
    }

    course.isActive = true;
    course.status = "ACTIVE";
    await course.save();

    AuditService.logCourseReactivated(req.user, course, req).catch((err) =>
      console.error("Audit log failed:", err.message)
    );

    ApiResponse.success(res, { course }, "Course reactivated successfully");
  } catch (error) {
    next(error);
  }
};
