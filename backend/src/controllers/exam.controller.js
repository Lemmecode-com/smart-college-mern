const mongoose = require("mongoose");
const Exam = require("../models/exam.model");
const Course = require("../models/course.model");
const Subject = require("../models/subject.model");
const ExamSchedule = require("../models/examSchedule.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Backlog = require("../models/backlog.model");
const AppError = require("../utils/AppError");
const auditLogService = require("../services/auditLog.service");
const teacherService = require("../services/teacher.service");
const ApiResponse = require("../utils/ApiResponse");
const { ROLE } = require("../utils/constants");
const {
  filterPublishedExamAndScheduleForStudent,
  filterPublishedExamsListForStudent,
} = require("../utils/examVisibility.util");

/**
 * Normalize incoming subjects payload. Supports:
 * - String subject IDs: ["id1", "id2"] (defaults to category: "REGULAR")
 * - Objects: [{ subject: "id1", category: "REGULAR" }, { subject: "id2", category: "BACKLOG" }]
 */
const normalizeIncomingSubjects = (subjects) => {
  if (!Array.isArray(subjects)) return [];
  return subjects.map((s, idx) => {
    if (typeof s === "string") {
      const trimmed = s.trim();
      if (!trimmed) {
        throw new AppError(
          `Invalid subject entry at index ${idx}`,
          400,
          "INVALID_SUBJECT_ENTRY",
        );
      }
      return { subject: trimmed, category: "REGULAR" };
    }
    if (s && typeof s === "object") {
      const subjectId = s.subject
        ? typeof s.subject === "object" && s.subject._id
          ? String(s.subject._id)
          : String(s.subject)
        : null;
      if (!subjectId) {
        throw new AppError(
          `Invalid subject entry at index ${idx}`,
          400,
          "INVALID_SUBJECT_ENTRY",
        );
      }
      const category = s.category ? String(s.category).toUpperCase().trim() : "REGULAR";
      if (!["REGULAR", "BACKLOG"].includes(category)) {
        throw new AppError(
          `Invalid subject category "${s.category}". Category must be REGULAR or BACKLOG`,
          400,
          "INVALID_SUBJECT_CATEGORY",
        );
      }
      return {
        subject: subjectId,
        category,
      };
    }
    throw new AppError(
      `Invalid subject format at index ${idx}`,
      400,
      "INVALID_SUBJECT_ENTRY",
    );
  });
};

/**
 * Fetch subjects (scoped to the authenticated college) and validate that:
 * 1. For REGULAR: subject belongs to the given course AND exam semester.
 * 2. For BACKLOG: subject belongs to the given course, has an earlier semester than the exam semester,
 *    and has at least one active OPEN or ATTEMPTED backlog in this college.
 * Returns the exam subject snapshots on success.
 */
const resolveExamSubjects = async (
  incomingSubjects,
  collegeId,
  courseId,
  semester,
) => {
  const normalized = normalizeIncomingSubjects(incomingSubjects);
  const subjectIds = normalized.map((s) => s.subject);
  const uniqueIds = [...new Set(subjectIds)];

  if (uniqueIds.length !== subjectIds.length) {
    throw new AppError(
      "Duplicate subjects are not allowed",
      400,
      "DUPLICATE_SUBJECT",
    );
  }

  const subjectDocs = await Subject.find({
    _id: { $in: uniqueIds },
    college_id: collegeId,
  });

  if (subjectDocs.length !== uniqueIds.length) {
    // A missing entry means it does not exist OR belongs to another college.
    // Return 404 to avoid leaking cross-college existence.
    throw new AppError(
      "One or more subjects were not found",
      404,
      "SUBJECT_NOT_FOUND",
    );
  }

  const subjectMap = new Map(subjectDocs.map((s) => [s._id.toString(), s]));

  const resolved = [];
  for (const item of normalized) {
    const sub = subjectMap.get(item.subject);

    if (String(sub.course_id) !== String(courseId)) {
      throw new AppError(
        `Subject "${sub.name}" does not belong to the selected course`,
        400,
        "INVALID_SUBJECT_COURSE",
      );
    }

    if (item.category === "REGULAR") {
      if (Number(sub.semester) !== Number(semester)) {
        throw new AppError(
          `Subject "${sub.name}" does not belong to the selected semester`,
          400,
          "INVALID_SUBJECT_SEMESTER",
        );
      }
    } else if (item.category === "BACKLOG") {
      if (Number(sub.semester) >= Number(semester)) {
        throw new AppError(
          `Backlog subject "${sub.name}" must belong to an earlier semester than the exam semester`,
          400,
          "INVALID_BACKLOG_SEMESTER",
        );
      }

      const hasOpenBacklog = await Backlog.exists({
        college_id: collegeId,
        course_id: courseId,
        subject_id: sub._id,
        status: { $in: ["OPEN", "ATTEMPTED"] },
      });

      if (!hasOpenBacklog) {
        throw new AppError(
          `Subject "${sub.name}" cannot be marked as BACKLOG because there are no active open backlogs for it in this course`,
          400,
          "NO_ACTIVE_BACKLOG_FOR_SUBJECT",
        );
      }
    }

    resolved.push({
      subject: sub._id,
      subjectType: sub.subjectType || undefined,
      category: item.category,
      originalSemester: sub.semester,
      internalMaxMarks: sub.internalMaxMarks,
      externalMaxMarks: sub.externalMaxMarks,
      internalPassMarks: sub.internalPassMarks,
      externalPassMarks: sub.externalPassMarks,
      passMarks: sub.passMarks,
    });
  }

  return resolved;
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
      throw new AppError(
        "Academic year is required",
        400,
        "ACADEMIC_YEAR_REQUIRED",
      );
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
      throw new AppError(
        "At least one subject must be selected",
        400,
        "NO_SUBJECTS_SELECTED",
      );
    }

    const examSubjects = await resolveExamSubjects(
      subjects,
      req.college_id,
      course_id,
      semNum,
    );

    const existingPublishedExam = await Exam.findOne({
      college_id: req.college_id,
      course_id,
      semester: semNum,
      academicYear: String(academicYear).trim(),
      status: "PUBLISHED",
    });

    if (existingPublishedExam) {
      const publishedSchedule = await ExamSchedule.findOne({
        exam_id: existingPublishedExam._id,
        college_id: req.college_id,
        status: "PUBLISHED",
      });
      if (publishedSchedule) {
        throw new AppError(
          "Exam Timetable is already published",
          400,
          "TIMETABLE_ALREADY_PUBLISHED",
        );
      }
    }

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
 * TEACHER SCOPING — Marks Entry exam list.
 *
 * A TEACHER may only see an exam when ALL of the following hold:
 *   - the exam belongs to the teacher's college/tenant (already applied by the
 *     top-level Exam.find({ college_id })),
 *   - the exam's course belongs to the teacher's department,
 *   - the exam contains at least one subject whose Subject.teacher_id is the
 *     authenticated teacher.
 *
 * The returned exams are rewritten so that `exam.subjects` contains ONLY the
 * subjects assigned to this teacher. Exams shared by several teachers stay
 * visible to each of them, but each teacher receives their own subjects only.
 *
 * Subject.teacher_id is the single source of truth for ownership. The
 * Teacher.courses[] / Teacher.subjects[] arrays are NOT used because they are
 * not maintained by any write path in the codebase.
 */
const filterExamsForTeacher = async (exams, req) => {
  const teacher = await Teacher.findOne({
    user_id: req.user.id,
    college_id: req.college_id,
  }).select("_id department_id");

  if (!teacher) {
    return [];
  }

  // Courses belonging to the teacher's department, within the same college.
  const departmentCourses = await Course.find({
    college_id: req.college_id,
    department_id: teacher.department_id,
  }).select("_id");

  const allowedCourseIds = new Set(
    departmentCourses.map((course) => String(course._id)),
  );

  const teacherId = String(teacher._id);

  return exams
    .map((exam) => {
      const examCourseId = exam.course_id?._id || exam.course_id;
      if (!allowedCourseIds.has(String(examCourseId))) return null;

      const ownSubjects = (exam.subjects || []).filter(
        (examSubject) =>
          examSubject.subject?.teacher_id &&
          String(examSubject.subject.teacher_id) === teacherId,
      );

      // Exams with no subject assigned to this teacher must not be returned.
      if (ownSubjects.length === 0) return null;

      exam.subjects = ownSubjects;
      return exam;
    })
    .filter(Boolean);
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

    if (req.user.role === ROLE.TEACHER) {
      return res.json(await filterExamsForTeacher(exams, req));
    }

    if (req.user.role !== ROLE.HOD) {
      return res.json(exams);
    }

    const hodTeacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
    }).select("_id");

    if (!hodTeacher) {
      return next(
        new AppError(
          "HOD teacher profile not found",
          403,
          "HOD_TEACHER_NOT_FOUND",
        ),
      );
    }

    const hodTeacherId = String(hodTeacher._id);
    const eligibleExams = exams
      .map((exam) => {
        const eligibleSubjects = (exam.subjects || []).filter(
          (examSubject) =>
            examSubject.subject?.teacher_id &&
            String(examSubject.subject.teacher_id) === hodTeacherId,
        );

        if (eligibleSubjects.length === 0) return null;

        exam.subjects = eligibleSubjects;
        return exam;
      })
      .filter(Boolean);

    return res.json(eligibleExams);
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
      .populate({
        path: "course_id",
        select: "name code department_id",
        populate: {
          path: "department_id",
          select: "name code",
        },
      })
      .populate({
        path: "subjects.subject",
        select:
          "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
        populate: {
          path: "teacher_id",
          select: "name employeeId",
        },
      });

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
 * GET ELIGIBLE BACKLOG SUBJECTS FOR COURSE & SEMESTER
 * Returns distinct subjects from earlier semesters that have active/open backlogs.
 */
exports.getEligibleBacklogSubjects = async (req, res, next) => {
  try {
    const { course_id, semester } = req.query;

    if (!course_id || !mongoose.Types.ObjectId.isValid(course_id)) {
      throw new AppError("Valid course_id is required", 400, "INVALID_COURSE_ID");
    }

    const examSemester = Number(semester);
    if (!examSemester || isNaN(examSemester) || examSemester <= 1) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const course = await Course.findOne({
      _id: course_id,
      college_id: req.college_id,
    });
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const backlogs = await Backlog.aggregate([
      {
        $match: {
          college_id: new mongoose.Types.ObjectId(req.college_id),
          course_id: new mongoose.Types.ObjectId(course_id),
          semester: { $lt: examSemester },
          status: { $in: ["OPEN", "ATTEMPTED"] },
        },
      },
      {
        $group: {
          _id: "$subject_id",
          studentCount: { $addToSet: "$student_id" },
          backlogCount: { $sum: 1 },
          originalSemester: { $first: "$semester" },
        },
      },
      {
        $project: {
          _id: 1,
          studentCount: { $size: "$studentCount" },
          backlogCount: 1,
          originalSemester: 1,
        },
      },
    ]);

    if (!backlogs || backlogs.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const subjectIds = backlogs.map((b) => b._id);
    const subjects = await Subject.find({
      _id: { $in: subjectIds },
      college_id: req.college_id,
      course_id: course_id,
    }).lean();

    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));

    const result = [];
    for (const b of backlogs) {
      const sub = subjectMap.get(b._id.toString());
      if (sub && Number(sub.semester) < examSemester) {
        result.push({
          _id: sub._id,
          name: sub.name,
          code: sub.code,
          semester: sub.semester,
          subjectType: sub.subjectType,
          credits: sub.credits,
          studentCount: b.studentCount,
          backlogCount: b.backlogCount,
          category: "BACKLOG",
          originalSemester: sub.semester,
        });
      }
    }

    result.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLISH EXAM
 * DRAFT -> PUBLISHED only. Idempotent if already PUBLISHED.
 */
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const previousStatus = exam.status;

    if (exam.status === "PUBLISHED") {
      return res.status(200).json({
        success: true,
        message: "Exam is already published",
        exam,
      });
    }

    exam.status = "PUBLISHED";
    exam.updatedBy = req.user.id;
    await exam.save();

    const updated = await Exam.findById(exam._id)
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType");

    auditLogService
      .logAudit({
        collegeId: req.college_id,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: "EXAM_PUBLISHED",
        resourceType: "Exam",
        resourceId: exam._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        oldValues: { status: previousStatus },
        newValues: { status: updated.status },
        metadata: {
          examName: updated.name,
          courseId: updated.course_id,
          semester: updated.semester,
          academicYear: updated.academicYear,
          subjectCount: updated.subjects.length,
        },
      })
      .catch((err) => console.error("Audit log failed:", err));

    res.json({
      success: true,
      message: "Exam published successfully",
      exam: updated,
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
        throw new AppError(
          "At least one subject must be selected",
          400,
          "NO_SUBJECTS_SELECTED",
        );
      }
      examSubjects = await resolveExamSubjects(
        subjects,
        req.college_id,
        effectiveCourseId,
        effectiveSemester,
      );
    }

    if (name !== undefined) exam.name = String(name).trim();
    if (course_id) exam.course_id = course_id;
    if (semester !== undefined) exam.semester = Number(semester);
    if (academicYear !== undefined)
      exam.academicYear = String(academicYear).trim();
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

/* =========================================================
   PUBLISHED EXAM VISIBILITY — STUDENT / TEACHER / HOD
   These endpoints allow non-ExamCoordinator roles to view
   only PUBLISHED exams and PUBLISHED exam schedules, scoped
   by their existing academic relationships.
   ========================================================= */

/**
 * Helper: Load an ExamSchedule with exam + subjects populated.
 */
const loadPublishedSchedule = async (examId, collegeId) => {
  const schedule = await ExamSchedule.findOne({
    exam_id: examId,
    college_id: collegeId,
    status: "PUBLISHED",
  }).populate("exam_id", "name course_id semester academicYear status subjects");

  if (!schedule) return null;

  const examSubMap = new Map(
    (schedule.exam_id?.subjects || []).map((es) => [
      String(es.subject?._id || es.subject),
      es,
    ]),
  );

  schedule.subjects = schedule.subjects.map((entry) => {
    const raw = entry.subject || {};
    const subject =
      typeof raw === "object" && raw !== null
        ? raw
        : { _id: raw, name: "N/A", code: "N/A", subjectType: undefined };

    const examSub = examSubMap.get(String(subject._id || raw));

    return {
      subject: subject._id,
      subjectName: subject.name || "N/A",
      subjectCode: subject.code || "N/A",
      subjectType: subject.subjectType || undefined,
      category: entry.category || examSub?.category || "REGULAR",
      originalSemester:
        entry.originalSemester !== undefined
          ? entry.originalSemester
          : examSub?.originalSemester,
      examDate: entry.examDate || undefined,
      startTime: entry.startTime || undefined,
      endTime: entry.endTime || undefined,
      session: entry.session || undefined,
      room: entry.room || undefined,
    };
  });

  return schedule;
};

/**
 * GET PUBLISHED EXAMS — STUDENT
 * Returns only PUBLISHED exams for the student's course + currentSemester.
 */
exports.getPublishedExamsForStudent = async (req, res, next) => {
  try {
    const student =
      req.student ||
      (await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }));

    if (!student) {
      return ApiResponse.success(res, [], "No exams available");
    }

    const exams = await Exam.find({
      college_id: req.college_id,
      course_id: student.course_id,
      semester: student.currentSemester,
      status: "PUBLISHED",
    })
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType")
      .sort({ createdAt: -1 });

    const filteredExams = await filterPublishedExamsListForStudent({
      exams,
      student,
      collegeId: req.college_id,
    });

    ApiResponse.success(
      res,
      filteredExams,
      "Published exams fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Exams For Student Error:", error);
    res.status(500).json({ message: "Failed to fetch published exams" });
  }
};

/**
 * GET PUBLISHED EXAM BY ID — STUDENT
 * Returns a single PUBLISHED exam with schedule, only if the student
 * is enrolled in the exam's course + semester.
 */
exports.getPublishedExamByIdForStudent = async (req, res, next) => {
  try {
    const student =
      req.student ||
      (await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }));

    if (!student) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
      course_id: student.course_id,
      semester: student.currentSemester,
      status: "PUBLISHED",
    })
      .populate("course_id", "name code")
      .populate(
        "subjects.subject",
        "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      );

    if (!exam) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const schedule = await loadPublishedSchedule(exam._id, req.college_id);

    const filtered = await filterPublishedExamAndScheduleForStudent({
      exam,
      schedule,
      student,
      collegeId: req.college_id,
    });

    ApiResponse.success(
      res,
      { exam: filtered.exam, schedule: filtered.schedule },
      "Published exam fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Exam By ID For Student Error:", error);
    res.status(500).json({ message: "Failed to fetch published exam" });
  }
};

/**
 * GET PUBLISHED EXAMS — TEACHER
 * Returns only PUBLISHED exams where:
 * - The exam's course is in the teacher's courses[], OR
 * - At least one exam subject is assigned to the teacher (via Subject.teacher_id)
 */
exports.getPublishedExamsForTeacher = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      false,
    );

    const teacherCourses = teacher.courses || [];
    const teacherSubjects = teacher.subjects || [];

    const courseFilter =
      teacherCourses.length > 0 ? { course_id: { $in: teacherCourses } } : {};

    const exams = await Exam.find({
      college_id: req.college_id,
      status: "PUBLISHED",
      ...courseFilter,
    })
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType")
      .sort({ createdAt: -1 });

    const filtered = exams.filter((exam) => {
      const subjectIds = (exam.subjects || [])
        .map((s) => {
          const sub = s.subject;
          return sub ? String(sub._id || sub) : null;
        })
        .filter(Boolean);

      const hasAssignedSubject = subjectIds.some((sid) =>
        teacherSubjects.some((tsid) => String(tsid) === String(sid)),
      );

      if (hasAssignedSubject) return true;
      return teacherCourses.some(
        (cid) => String(cid) === String(exam.course_id && exam.course_id._id),
      );
    });

    ApiResponse.success(res, filtered, "Published exams fetched successfully");
  } catch (error) {
    console.error("Get Published Exams For Teacher Error:", error);
    res.status(500).json({ message: "Failed to fetch published exams" });
  }
};

/**
 * GET PUBLISHED EXAM BY ID — TEACHER
 * Returns a single PUBLISHED exam with schedule, only if the teacher
 * teaches a subject in the exam or the exam's course is in their courses[].
 */
exports.getPublishedExamByIdForTeacher = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      false,
    );

    const teacherCourses = teacher.courses || [];
    const teacherSubjects = teacher.subjects || [];

    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
      status: "PUBLISHED",
    })
      .populate("course_id", "name code")
      .populate(
        "subjects.subject",
        "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      );

    if (!exam) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const courseMatch =
      teacherCourses.length === 0 ||
      teacherCourses.some(
        (cid) => String(cid) === String(exam.course_id && exam.course_id._id),
      );

    const subjectIds = (exam.subjects || [])
      .map((s) => {
        const sub = s.subject;
        return sub ? String(sub._id || sub) : null;
      })
      .filter(Boolean);

    const subjectMatch = subjectIds.some((sid) =>
      teacherSubjects.some((tsid) => String(tsid) === String(sid)),
    );

    if (!courseMatch && !subjectMatch) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const schedule = await loadPublishedSchedule(exam._id, req.college_id);

    ApiResponse.success(
      res,
      { exam, schedule },
      "Published exam fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Exam By ID For Teacher Error:", error);
    res.status(500).json({ message: "Failed to fetch published exam" });
  }
};

/**
 * GET PUBLISHED EXAMS — HOD
 * Returns only PUBLISHED exams for courses belonging to the HOD's department.
 */
exports.getPublishedExamsForHOD = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      false,
    );

    const { isHOD, department } = await teacherService.getHODStatus(
      teacher,
      req.college_id,
    );

    if (!isHOD || !department) {
      return ApiResponse.success(res, [], "No exams available");
    }

    const courses = await Course.find({
      college_id: req.college_id,
      department_id: department._id,
    }).select("_id");

    const courseIds = courses.map((c) => c._id);

    const exams = await Exam.find({
      college_id: req.college_id,
      course_id: { $in: courseIds },
      status: "PUBLISHED",
    })
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code teacher_id subjectType")
      .sort({ createdAt: -1 });

    ApiResponse.success(res, exams, "Published exams fetched successfully");
  } catch (error) {
    console.error("Get Published Exams For HOD Error:", error);
    res.status(500).json({ message: "Failed to fetch published exams" });
  }
};

/**
 * GET PUBLISHED EXAMS — DISPATCHER
 * Routes to the appropriate role-scoped handler.
 */
exports.getPublishedExams = async (req, res, next) => {
  try {
    const role = req.user?.role;

    if (role === "STUDENT") {
      return exports.getPublishedExamsForStudent(req, res, next);
    }
    if (role === "TEACHER") {
      return exports.getPublishedExamsForTeacher(req, res, next);
    }
    if (role === "HOD") {
      return exports.getPublishedExamsForHOD(req, res, next);
    }

    return ApiResponse.success(res, [], "No exams available");
  } catch (error) {
    console.error("Get Published Exams Error:", error);
    res.status(500).json({ message: "Failed to fetch published exams" });
  }
};

/**
 * GET PUBLISHED EXAM BY ID — DISPATCHER
 * Routes to the appropriate role-scoped handler.
 */
exports.getPublishedExamById = async (req, res, next) => {
  try {
    const role = req.user?.role;

    if (role === "STUDENT") {
      return exports.getPublishedExamByIdForStudent(req, res, next);
    }
    if (role === "TEACHER") {
      return exports.getPublishedExamByIdForTeacher(req, res, next);
    }
    if (role === "HOD") {
      return exports.getPublishedExamByIdForHOD(req, res, next);
    }

    return ApiResponse.success(res, null, "Exam not found");
  } catch (error) {
    console.error("Get Published Exam By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch published exam" });
  }
};

/**
 * GET PUBLISHED EXAM BY ID — HOD
 * Returns a single PUBLISHED exam with schedule, only if the exam's
 * course belongs to the HOD's department.
 */
exports.getPublishedExamByIdForHOD = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      false,
    );

    const { isHOD, department } = await teacherService.getHODStatus(
      teacher,
      req.college_id,
    );

    if (!isHOD || !department) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const exam = await Exam.findOne({
      _id: req.params.id,
      college_id: req.college_id,
      status: "PUBLISHED",
    })
      .populate("course_id", "name code department_id")
      .populate(
        "subjects.subject",
        "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      );

    if (!exam) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const course = await Course.findById(exam.course_id).select(
      "department_id",
    );
    if (!course || String(course.department_id) !== String(department._id)) {
      return ApiResponse.success(res, null, "Exam not found");
    }

    const schedule = await loadPublishedSchedule(exam._id, req.college_id);

    ApiResponse.success(
      res,
      { exam, schedule },
      "Published exam fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Exam By ID For HOD Error:", error);
    res.status(500).json({ message: "Failed to fetch published exam" });
  }
};
