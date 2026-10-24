const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Exam = require("../models/exam.model");
const SemesterResult = require("../models/semesterResult.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const AuditService = require("../services/auditLog.service");
const { RESULT_STATUS } = require("../utils/constants");
const teacherSubjectAssignmentService = require("../services/teacherSubjectAssignment.service");

const SUBJECT_TYPES = ["THEORY", "PRACTICAL", "COMPOSITE"];

/**
 * Validate the optional exam / marks configuration block.
 *
 * Rules:
 * - If no exam configuration keys are supplied at all, validation is skipped
 *   (backward compatibility with legacy subjects that have no exam config).
 * - subjectType must be one of THEORY / PRACTICAL / COMPOSITE.
 * - THEORY requires internalMaxMarks, externalMaxMarks, internalPassMarks,
 *   externalPassMarks; internal pass <= internal max; external pass <= external max.
 * - PRACTICAL requires internalMaxMarks (applicable maximum) and passMarks;
 *   passMarks <= internalMaxMarks. External/internalPass/externalPass not required.
 * - COMPOSITE requires internalMaxMarks, externalMaxMarks, passMarks (overall);
 *   passMarks <= internalMaxMarks + externalMaxMarks.
 * - No marks value may be negative.
 *
 * This is configuration-only validation; no student pass/fail calculation.
 */
const validateExamMarksConfig = (body = {}) => {
  const {
    subjectType,
    internalMaxMarks,
    externalMaxMarks,
    internalPassMarks,
    externalPassMarks,
    passMarks,
  } = body;

  const hasExamConfig =
    subjectType !== undefined ||
    internalMaxMarks !== undefined ||
    externalMaxMarks !== undefined ||
    internalPassMarks !== undefined ||
    externalPassMarks !== undefined ||
    passMarks !== undefined;

  if (!hasExamConfig) return;

  if (!subjectType || !SUBJECT_TYPES.includes(subjectType)) {
    throw new AppError(
      "subjectType must be one of THEORY, PRACTICAL, or COMPOSITE",
      400,
      "INVALID_SUBJECT_TYPE",
    );
  }

  const requireNonNegative = (fieldName, value) => {
    const num =
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value);

    if (num === undefined || Number.isNaN(num)) {
      throw new AppError(
        `${fieldName} is required for ${subjectType} subject configuration`,
        400,
        "MISSING_EXAM_CONFIG",
      );
    }
    if (num < 0) {
      throw new AppError(`${fieldName} cannot be negative`, 400, "NEGATIVE_MARKS");
    }
    return num;
  };

  if (subjectType === "THEORY") {
    const internalMax = requireNonNegative("internalMaxMarks", internalMaxMarks);
    const externalMax = requireNonNegative("externalMaxMarks", externalMaxMarks);
    const internalPass = requireNonNegative("internalPassMarks", internalPassMarks);
    const externalPass = requireNonNegative("externalPassMarks", externalPassMarks);

    if (internalPass > internalMax) {
      throw new AppError(
        "internalPassMarks cannot exceed internalMaxMarks",
        400,
        "PASS_EXCEEDS_MAX",
      );
    }
    if (externalPass > externalMax) {
      throw new AppError(
        "externalPassMarks cannot exceed externalMaxMarks",
        400,
        "PASS_EXCEEDS_MAX",
      );
    }
  } else if (subjectType === "PRACTICAL") {
    const internalMax = requireNonNegative("internalMaxMarks", internalMaxMarks);
    const pass = requireNonNegative("passMarks", passMarks);

    if (pass > internalMax) {
      throw new AppError(
        "passMarks cannot exceed the applicable maximum marks",
        400,
        "PASS_EXCEEDS_MAX",
      );
    }
  } else if (subjectType === "COMPOSITE") {
    const internalMax = requireNonNegative("internalMaxMarks", internalMaxMarks);
    const externalMax = requireNonNegative("externalMaxMarks", externalMaxMarks);
    const pass = requireNonNegative("passMarks", passMarks);

    if (pass > internalMax + externalMax) {
      throw new AppError(
        "passMarks cannot exceed total (internal + external) maximum marks",
        400,
        "PASS_EXCEEDS_MAX",
      );
    }
  }
};

/**
 * CREATE SUBJECT
 * UPDATED: Validate semester is within course duration
 */
exports.createSubject = async (req, res, next) => {
  const {
    course_id,
    name,
    code,
    semester,
    credits,
    teacher_id,
    subjectType,
    internalMaxMarks,
    externalMaxMarks,
    internalPassMarks,
    externalPassMarks,
    passMarks,
  } = req.body;

  // Validate exam / marks configuration (if supplied)
  validateExamMarksConfig(req.body);

  // Validate course
  const course = await Course.findOne({
    _id: course_id,
    college_id: req.college_id,
  });

  if (!course) {
    throw new AppError("Invalid course", 404, "COURSE_NOT_FOUND");
  }

  if (course.status === "INACTIVE" || course.isActive === false) {
    throw new AppError("Cannot create a subject under an inactive course", 400, "COURSE_INACTIVE");
  }

  // ✅ UPDATED: Validate subject semester is within course duration
  // Subject can be for ANY semester within the program (1 to durationSemesters)
  if (!semester || semester < 1 || semester > course.durationSemesters) {
    throw new AppError(
      `Subject semester (${semester}) must be between 1 and ${course.durationSemesters} (course duration). ` +
      `Subjects can be created for any semester within the program duration.`,
      400,
      "SEMESTER_OUT_OF_RANGE"
    );
  }

  const hasTeacherAssignment =
    teacher_id !== undefined && teacher_id !== null && teacher_id !== "";

  // Validate teacher only when provided
  if (hasTeacherAssignment) {
    const teacher = await Teacher.findOne({
      _id: teacher_id,
      college_id: req.college_id,
      department_id: course.department_id,
    });

    if (!teacher) {
      throw new AppError("Teacher does not belong to this course's department", 404, "TEACHER_NOT_FOUND");
    }
  }

  // Pre-flight duplicate check: same code within same course (scoped to college)
  const duplicate = await Subject.findOne({
    college_id: req.college_id,
    course_id,
    code: code.trim().toUpperCase(),
  });

  if (duplicate) {
    throw new AppError("Code must be unique within this course.", 409, "DUPLICATE_SUBJECT_CODE");
  }

  const subject = await Subject.create({
    college_id: req.college_id,
    department_id: course.department_id, // ✔ keep
    course_id,
    name,
    code,
    semester,
    credits,
    teacher_id: null,
    subjectType,
    internalMaxMarks,
    externalMaxMarks,
    internalPassMarks,
    externalPassMarks,
    passMarks,
    createdBy: req.user.id,
  });

  let responseSubject = subject;
  if (hasTeacherAssignment) {
    try {
      const assignment = await teacherSubjectAssignmentService.assignSubjectToTeacher(
        teacher_id,
        subject._id,
        req.college_id,
      );
      responseSubject = assignment.subject;
    } catch (error) {
      await Subject.findByIdAndDelete(subject._id);
      throw error;
    }
  }

  res.status(201).json({
    success: true,
    message: "Subject created successfully",
    subject: responseSubject
  });
};

/**
 * GET SUBJECTS BY COURSE
 */
exports.getSubjectsByCourse = async (req, res, next) => {
  try {
    const { includeInactive, status } = req.query;
    const semester = Number.parseInt(req.query.semester, 10);
    const filter = {
      course_id: req.params.courseId,
      college_id: req.college_id,
    };

    if (Number.isInteger(semester) && semester >= 1 && semester <= 8) {
      filter.semester = semester;
    }

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

    const subjects = await Subject.find(filter)
      .populate("teacher_id", "name designation")
      .populate("course_id", "name code");

    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE SUBJECT
 */
exports.updateSubject = async (req, res, next) => {
  try {
    // Validate exam / marks configuration (if supplied)
    validateExamMarksConfig(req.body);

    const hasTeacherAssignment = Object.prototype.hasOwnProperty.call(
      req.body,
      "teacher_id",
    );
    const requestedTeacherId = req.body.teacher_id;
    let assignmentResult;
    let existingSubjectForUnassign;

    // ✅ Validate teacher_id if being updated
    if (hasTeacherAssignment && requestedTeacherId) {
      // Fetch subject to get course_id and its department
      const existingSubject = await Subject.findOne({
        _id: req.params.id,
        college_id: req.college_id,
      }).populate({
        path: "course_id",
        select: "department_id",
      });

      if (!existingSubject) {
        throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
      }

      // Get course's department (from populated course)
      const courseDepartmentId = existingSubject.course_id?.department_id;

      // Fetch the new teacher
      const teacher = await Teacher.findOne({
        _id: req.body.teacher_id,
        college_id: req.college_id,
      });

      if (!teacher) {
        throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
      }

      // Validate teacher belongs to same department as course
      if (teacher.department_id.toString() !== courseDepartmentId.toString()) {
        throw new AppError(
          "Teacher must belong to the same department as the subject course",
          400,
          "TEACHER_DEPARTMENT_MISMATCH"
        );
      }

      // Update department_id if needed (should match course department)
      req.body.department_id = courseDepartmentId;
    }

    // Pre-flight duplicate check for code update
    if (req.body.code) {
      const existingForCode = await Subject.findOne({
        _id: { $ne: req.params.id },
        college_id: req.college_id,
        course_id: req.body.course_id || (await Subject.findById(req.params.id))?.course_id,
        code: req.body.code.trim().toUpperCase(),
      });

      if (existingForCode) {
        throw new AppError("Code must be unique within this course.", 409, "DUPLICATE_SUBJECT_CODE");
      }
    }

    if (hasTeacherAssignment && requestedTeacherId) {
      assignmentResult = await teacherSubjectAssignmentService.assignSubjectToTeacher(
        requestedTeacherId,
        req.params.id,
        req.college_id,
      );
    } else if (hasTeacherAssignment && requestedTeacherId === null) {
      existingSubjectForUnassign = await Subject.findOne({
        _id: req.params.id,
        college_id: req.college_id,
      });

      if (!existingSubjectForUnassign) {
        throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
      }

      if (existingSubjectForUnassign.teacher_id) {
        assignmentResult = await teacherSubjectAssignmentService.unassignSubjectFromTeacher(
          existingSubjectForUnassign.teacher_id,
          req.params.id,
          req.college_id,
        );
      } else {
        assignmentResult = { subject: existingSubjectForUnassign };
      }
    }

    const subjectUpdate = { ...req.body };
    if (hasTeacherAssignment && requestedTeacherId === null) {
      subjectUpdate.teacher_id = null;
    } else {
      delete subjectUpdate.teacher_id;
    }

    let subject;
    if (Object.keys(subjectUpdate).length > 0) {
      subject = await Subject.findOneAndUpdate(
        {
          _id: req.params.id,
          college_id: req.college_id,
        },
        subjectUpdate,
        { new: true },
      );
    } else {
      subject = assignmentResult?.subject;
      if (!subject) {
        subject = await Subject.findOne({
          _id: req.params.id,
          college_id: req.college_id,
        });
      }
    }

    if (!subject) {
      throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
    }

    res.json(subject);
  } catch (error) {
    next(error);
  }
};

/**
 * GET SUBJECT BY ID
 */
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    }).populate("teacher_id", "name designation")
      .populate("course_id", "name code")
      .populate("department_id", "name code");

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
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

/**
 * DEACTIVATE Subject
 * PUT /api/subjects/:id/deactivate
 */
exports.deactivateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!subject) {
      return ApiResponse.error(res, "Subject not found", "SUBJECT_NOT_FOUND", 404);
    }

    if (subject.isActive === false || subject.status === "INACTIVE") {
      return ApiResponse.error(
        res,
        "Subject is already inactive",
        "SUBJECT_ALREADY_INACTIVE",
        400
      );
    }

    // 1. Guard against assigned active teacher
    if (subject.teacher_id) {
      const activeTeacher = await Teacher.findOne({
        _id: subject.teacher_id,
        college_id: req.college_id,
        status: "ACTIVE",
      });
      if (activeTeacher) {
        return ApiResponse.error(
          res,
          `Cannot deactivate subject while assigned to active teacher "${activeTeacher.name}". Please unassign the teacher first.`,
          "SUBJECT_HAS_ASSIGNED_TEACHER",
          400,
          { teacherId: activeTeacher._id, teacherName: activeTeacher.name }
        );
      }
    }

    // 2. Guard against active timetable slots (in PUBLISHED timetables)
    const publishedTimetables = await Timetable.find({
      college_id: req.college_id,
      status: "PUBLISHED",
    }).select("_id");
    const publishedTimetableIds = publishedTimetables.map((t) => t._id);

    if (publishedTimetableIds.length > 0) {
      const activeSlotCount = await TimetableSlot.countDocuments({
        college_id: req.college_id,
        subject_id: subject._id,
        timetable_id: { $in: publishedTimetableIds },
      });
      if (activeSlotCount > 0) {
        return ApiResponse.error(
          res,
          `Cannot deactivate subject while scheduled in ${activeSlotCount} active timetable slot(s). Please remove or update the timetable first.`,
          "SUBJECT_IN_ACTIVE_TIMETABLE",
          400,
          { activeSlotCount }
        );
      }
    }

    // 3. Guard against active exams in progress (PUBLISHED exams)
    const activeExamsCount = await Exam.countDocuments({
      college_id: req.college_id,
      "subjects.subject": subject._id,
      status: "PUBLISHED",
    });
    if (activeExamsCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate subject with ${activeExamsCount} active or published exam(s). Please unpublish or complete them first.`,
        "SUBJECT_HAS_ACTIVE_EXAMS",
        400,
        { activeExamsCount }
      );
    }

    // 4. Guard against pending marks entry / results in progress (DRAFT results for this subject)
    const draftResultsCount = await SemesterResult.countDocuments({
      college_id: req.college_id,
      "subjects.subject": subject._id,
      status: RESULT_STATUS.DRAFT,
    });
    if (draftResultsCount > 0) {
      return ApiResponse.error(
        res,
        `Cannot deactivate subject with ${draftResultsCount} pending marks entry or draft result(s). Please finalize or discard results first.`,
        "SUBJECT_HAS_PENDING_RESULTS",
        400,
        { draftResultsCount }
      );
    }

    subject.isActive = false;
    subject.status = "INACTIVE";
    await subject.save();

    AuditService.logSubjectDeactivated(req.user, subject, req).catch((err) =>
      console.error("Audit log failed:", err.message)
    );

    ApiResponse.success(res, { subject }, "Subject deactivated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * REACTIVATE Subject
 * PUT /api/subjects/:id/reactivate
 */
exports.reactivateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!subject) {
      return ApiResponse.error(res, "Subject not found", "SUBJECT_NOT_FOUND", 404);
    }

    if (subject.isActive === true && subject.status === "ACTIVE") {
      return ApiResponse.error(
        res,
        "Subject is already active",
        "SUBJECT_ALREADY_ACTIVE",
        400
      );
    }

    // 1. Guard against inactive parent course
    const course = await Course.findOne({
      _id: subject.course_id,
      college_id: req.college_id,
    });

    if (!course || course.status === "INACTIVE" || course.isActive === false) {
      return ApiResponse.error(
        res,
        "Cannot reactivate subject because its course is inactive. Please reactivate the course first.",
        "COURSE_INACTIVE",
        400
      );
    }

    // 2. Guard against inactive parent department
    const department = await Department.findOne({
      _id: course.department_id,
      college_id: req.college_id,
    });

    if (!department || department.status === "INACTIVE" || department.isActive === false) {
      return ApiResponse.error(
        res,
        "Cannot reactivate subject because its department is inactive. Please reactivate the department first.",
        "DEPARTMENT_INACTIVE",
        400
      );
    }

    subject.isActive = true;
    subject.status = "ACTIVE";
    await subject.save();

    AuditService.logSubjectReactivated(req.user, subject, req).catch((err) =>
      console.error("Audit log failed:", err.message)
    );

    ApiResponse.success(res, { subject }, "Subject reactivated successfully");
  } catch (error) {
    next(error);
  }
};
