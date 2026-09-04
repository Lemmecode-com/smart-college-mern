const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");

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

  // Validate teacher only when provided
  if (teacher_id) {
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
    teacher_id,
    subjectType,
    internalMaxMarks,
    externalMaxMarks,
    internalPassMarks,
    externalPassMarks,
    passMarks,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Subject created successfully",
    subject
  });
};

/**
 * GET SUBJECTS BY COURSE
 */
exports.getSubjectsByCourse = async (req, res, next) => {
  try {
    const subjects = await Subject.find({
      course_id: req.params.courseId,
      college_id: req.college_id,
    }).populate("teacher_id", "name designation")
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

    // ✅ Validate teacher_id if being updated
    if (req.body.teacher_id) {
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

    const subject = await Subject.findOneAndUpdate(
      {
        _id: req.params.id,
        college_id: req.college_id,
      },
      req.body,
      { new: true },
    );

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
