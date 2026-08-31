const Exam = require("../models/exam.model");
const Course = require("../models/course.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");
const auditLogService = require("../services/auditLog.service");

/**
 * Build a normalized array of subject ids (strings) from the request payload,
 * which may be an array of ids or an array of { subject } objects.
 */
const extractSubjectIds = (subjects) =>
  (subjects || []).map((s) => (typeof s === "string" ? s : s.subject));

/**
 * Fetch subjects (scoped to the authenticated college) and validate that every
 * one belongs to the given course AND semester. Returns the exam subject
 * snapshots (subject ref + copied exam/marks configuration) on success.
 */
const resolveExamSubjects = async (subjectIds, collegeId, courseId, semester) => {
  const uniqueIds = [...new Set(subjectIds.map((id) => String(id)))];

  if (uniqueIds.length !== subjectIds.length) {
    throw new AppError("Duplicate subjects are not allowed", 400, "DUPLICATE_SUBJECT");
  }

  const subjectDocs = await Subject.find({
    _id: { $in: uniqueIds },
    college_id: collegeId,
  });

  if (subjectDocs.length !== uniqueIds.length) {
    // A missing entry means it does not exist OR belongs to another college.
    // Return 404 to avoid leaking cross-college existence.
    throw new AppError("One or more subjects were not found", 404, "SUBJECT_NOT_FOUND");
  }

  const subjectMap = new Map(subjectDocs.map((s) => [s._id.toString(), s]));

  return uniqueIds.map((id) => {
    const sub = subjectMap.get(id);

    if (String(sub.course_id) !== String(courseId)) {
      throw new AppError(
        `Subject "${sub.name}" does not belong to the selected course`,
        400,
        "INVALID_SUBJECT_COURSE",
      );
    }

    if (Number(sub.semester) !== Number(semester)) {
      throw new AppError(
        `Subject "${sub.name}" does not belong to the selected semester`,
        400,
        "INVALID_SUBJECT_SEMESTER",
      );
    }

    return {
      subject: sub._id,
      subjectType: sub.subjectType || undefined,
      internalMaxMarks: sub.internalMaxMarks,
      externalMaxMarks: sub.externalMaxMarks,
      internalPassMarks: sub.internalPassMarks,
      externalPassMarks: sub.externalPassMarks,
      passMarks: sub.passMarks,
    };
  });
};

/**
 * CREATE EXAM
 */
exports.createExam = async (req, res, next) => {
  try {
    const { name, course_id, semester, academicYear, subjects } = req.body;

    if (!name || !String(name).trim()) {
      throw new AppError("Exam name is required", 400, "INVALID_EXAM_NAME");
    }
    if (!course_id) {
      throw new AppError("Course is required", 400, "COURSE_REQUIRED");
    }
    if (semester === undefined || semester === null || semester === "") {
      throw new AppError("Semester is required", 400, "SEMESTER_REQUIRED");
    }
    if (!academicYear || !String(academicYear).trim()) {
      throw new AppError("Academic year is required", 400, "ACADEMIC_YEAR_REQUIRED");
    }

    const course = await Course.findOne({
      _id: course_id,
      college_id: req.college_id,
    });
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const semNum = Number(semester);
    if (isNaN(semNum) || semNum < 1 || semNum > course.durationSemesters) {
      throw new AppError(
        `Semester must be between 1 and ${course.durationSemesters} (course duration)`,
        400,
        "INVALID_SEMESTER",
      );
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      throw new AppError("At least one subject must be selected", 400, "NO_SUBJECTS_SELECTED");
    }

    const examSubjects = await resolveExamSubjects(
      extractSubjectIds(subjects),
      req.college_id,
      course_id,
      semNum,
    );

    const exam = await Exam.create({
      college_id: req.college_id,
      name: String(name).trim(),
      course_id,
      semester: semNum,
      academicYear: String(academicYear).trim(),
      subjects: examSubjects,
      status: "DRAFT",
      createdBy: req.user.id,
    });

    auditLogService
      .logAudit({
        collegeId: req.college_id,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: "EXAM_CREATED",
        resourceType: "Exam",
        resourceId: exam._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 201,
        metadata: {
          name: exam.name,
          courseId: exam.course_id,
          semester: exam.semester,
          academicYear: exam.academicYear,
          subjectCount: exam.subjects.length,
        },
      })
      .catch((err) => console.error("Audit log failed:", err));

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * LIST EXAMS (college-scoped)
 */
exports.getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ college_id: req.college_id })
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType")
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    next(error);
  }
};

/**
 * GET EXAM BY ID (college-scoped)
 */
exports.getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("course_id", "name code department_id")
      .populate(
        "subjects.subject",
        "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      );

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json(exam);
  } catch (error) {
    next(error);
  }
};

/**
 * EXAM DASHBOARD (placeholder for Step 1 compatibility)
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const exams = await Exam.find({ college_id: req.college_id })
      .populate("course_id", "name code")
      .sort({ createdAt: -1 });

    const totalExams = exams.length;
    const draftExams = exams.filter((e) => e.status === "DRAFT").length;
    const publishedExams = exams.filter((e) => e.status === "PUBLISHED").length;

    res.json({
      success: true,
      data: {
        totalExams,
        draftExams,
        publishedExams,
        recentExams: exams.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE EXAM
 * Only name, course_id, semester, academicYear and subjects are editable.
 * All relationships are re-validated server-side.
 */
exports.updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const { name, course_id, semester, academicYear, subjects } = req.body;

    const effectiveCourseId = course_id || exam.course_id;
    const effectiveSemester =
      semester !== undefined ? Number(semester) : exam.semester;

    // Validate course (if changed)
    const course = await Course.findOne({
      _id: effectiveCourseId,
      college_id: req.college_id,
    });
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    if (
      Number(effectiveSemester) < 1 ||
      Number(effectiveSemester) > course.durationSemesters
    ) {
      throw new AppError(
        `Semester must be between 1 and ${course.durationSemesters} (course duration)`,
        400,
        "INVALID_SEMESTER",
      );
    }

    // Validate subjects (if provided)
    let examSubjects = exam.subjects;
    if (subjects !== undefined) {
      if (!Array.isArray(subjects) || subjects.length === 0) {
        throw new AppError("At least one subject must be selected", 400, "NO_SUBJECTS_SELECTED");
      }
      examSubjects = await resolveExamSubjects(
        extractSubjectIds(subjects),
        req.college_id,
        effectiveCourseId,
        effectiveSemester,
      );
    }

    if (name !== undefined) exam.name = String(name).trim();
    if (course_id) exam.course_id = course_id;
    if (semester !== undefined) exam.semester = Number(semester);
    if (academicYear !== undefined) exam.academicYear = String(academicYear).trim();
    exam.subjects = examSubjects;
    exam.updatedBy = req.user.id;

    await exam.save();

    const updated = await Exam.findById(exam._id)
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType");

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
