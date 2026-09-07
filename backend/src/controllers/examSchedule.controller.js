const Exam = require("../models/exam.model");
const ExamSchedule = require("../models/examSchedule.model");
const Subject = require("../models/subject.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");
const auditLogService = require("../services/auditLog.service");
const teacherService = require("../services/teacher.service");
const ApiResponse = require("../utils/ApiResponse");

/* ============================================================
 * Validation helpers (Step 1)
 * - HH:mm format check
 * - startTime < endTime check
 * - examDate validity
 * - subject uniqueness
 * - subject belongs to exam
 * ============================================================ */

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidTimeFormat = (value) =>
  typeof value === "string" && TIME_REGEX.test(value);

const toMinutes = (value) => {
  if (!isValidTimeFormat(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

const isValidDate = (value) => {
  if (value === null || value === undefined || value === "") return false;
  const d = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(d.getTime());
};

/**
 * Verify every scheduled subject belongs to the given Exam (by reference) and
 * that there are no duplicates inside a single schedule. Returns the list of
 * valid subjects for downstream use.
 */
const validateScheduleSubjects = (incomingSubjects, examSubjectIds) => {
  if (!Array.isArray(incomingSubjects)) {
    throw new AppError(
      "subjects must be an array",
      400,
      "INVALID_SUBJECTS",
    );
  }

  const examSubjectIdStrings = new Set(
    examSubjectIds.map((id) => String(id)),
  );

  const seen = new Set();

  return incomingSubjects.map((entry, idx) => {
    if (!entry || !entry.subject) {
      throw new AppError(
        `subjects[${idx}].subject is required`,
        400,
        "SUBJECT_REQUIRED",
      );
    }

    const subjectKey = String(entry.subject);

    if (seen.has(subjectKey)) {
      throw new AppError(
        `Duplicate subject "${subjectKey}" in schedule`,
        400,
        "DUPLICATE_SCHEDULE_SUBJECT",
      );
    }
    seen.add(subjectKey);

    if (!examSubjectIdStrings.has(subjectKey)) {
      throw new AppError(
        `Subject "${subjectKey}" does not belong to the selected Exam`,
        400,
        "SUBJECT_NOT_IN_EXAM",
      );
    }

    // examDate / startTime / endTime are optional in DRAFT, but if any one is
    // present the pair/triple must be consistent.
    const { examDate, startTime, endTime, room, session } = entry;

    if (examDate !== undefined && examDate !== null && examDate !== "") {
      if (!isValidDate(examDate)) {
        throw new AppError(
          `subjects[${idx}].examDate is not a valid date`,
          400,
          "INVALID_EXAM_DATE",
        );
      }
    }

    const hasStart = startTime !== undefined && startTime !== null && startTime !== "";
    const hasEnd = endTime !== undefined && endTime !== null && endTime !== "";

    if (hasStart && !isValidTimeFormat(startTime)) {
      throw new AppError(
        `subjects[${idx}].startTime must be in HH:mm format`,
        400,
        "INVALID_TIME_FORMAT",
      );
    }

    if (hasEnd && !isValidTimeFormat(endTime)) {
      throw new AppError(
        `subjects[${idx}].endTime must be in HH:mm format`,
        400,
        "INVALID_TIME_FORMAT",
      );
    }

    if (hasStart && hasEnd) {
      const startMin = toMinutes(startTime);
      const endMin = toMinutes(endTime);
      if (startMin >= endMin) {
        throw new AppError(
          `subjects[${idx}].startTime must be earlier than endTime`,
          400,
          "INVALID_TIME_RANGE",
        );
      }
    } else if (hasStart || hasEnd) {
      // If only one of the two is provided the pair is incomplete.
      throw new AppError(
        `subjects[${idx}] requires both startTime and endTime when scheduling`,
        400,
        "INCOMPLETE_TIME_RANGE",
      );
    }

    if (session !== undefined && session !== null && session !== "") {
      if (!["FORENOON", "AFTERNOON"].includes(session)) {
        throw new AppError(
          `subjects[${idx}].session must be FORENOON or AFTERNOON`,
          400,
          "INVALID_SESSION",
        );
      }
    }

    return {
      subject: subjectKey,
      examDate: examDate !== undefined && examDate !== null && examDate !== ""
        ? new Date(examDate)
        : undefined,
      startTime: hasStart ? startTime : undefined,
      endTime: hasEnd ? endTime : undefined,
      room: typeof room === "string" && room.trim() ? room.trim() : undefined,
      session: session !== undefined && session !== null && session !== ""
        ? session
        : undefined,
    };
  });
};

/**
 * Ensure the exam exists and belongs to the authenticated user's college.
 */
const getExamForCollege = async (examId, collegeId) => {
  const exam = await Exam.findOne({ _id: examId, college_id: collegeId });
  if (!exam) {
    throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
  }
  return exam;
};

/**
 * Verify that every subject id referenced by the schedule actually exists and
 * belongs to the same college. (The Exam already constrains subjects to its
 * course+semester, so this is a defensive check only.)
 */
const ensureSubjectsExistInCollege = async (subjectIds, collegeId) => {
  if (!subjectIds.length) return;
  const docs = await Subject.find({
    _id: { $in: subjectIds },
    college_id: collegeId,
  });
  if (docs.length !== subjectIds.length) {
    throw new AppError(
      "One or more subjects were not found",
      404,
      "SUBJECT_NOT_FOUND",
    );
  }
};

/**
 * Load a schedule by examId scoped to collegeId. Returns null if not found.
 */
const loadSchedule = async (examId, collegeId) =>
  ExamSchedule.findOne({ exam_id: examId, college_id: collegeId })
    .populate("exam_id", "name course_id semester academicYear status")
    .populate("subjects.subject", "name code subjectType teacher_id");

const respondWithSchedule = (schedule) => ({
  success: true,
  schedule,
});

/* ============================================================
 * CREATE
 * ============================================================ */

exports.createExamSchedule = async (req, res, next) => {
  try {
    const { exam_id, subjects } = req.body;

    if (!exam_id) {
      throw new AppError("exam_id is required", 400, "EXAM_ID_REQUIRED");
    }

    const exam = await getExamForCollege(exam_id, req.college_id);

    const existing = await ExamSchedule.findOne({
      exam_id,
      college_id: req.college_id,
    });
    if (existing) {
      throw new AppError(
        "Exam schedule already exists for this exam",
        409,
        "SCHEDULE_ALREADY_EXISTS",
      );
    }

    const examSubjectIds = exam.subjects.map((s) => s.subject);
    const incomingSubjects = Array.isArray(subjects) ? subjects : [];

    // In DRAFT creation, subjects array may be empty/partial. We only require
    // that any provided subjects are valid.
    const validatedSubjects = validateScheduleSubjects(
      incomingSubjects,
      examSubjectIds,
    );

    await ensureSubjectsExistInCollege(
      validatedSubjects.map((s) => s.subject),
      req.college_id,
    );

    const schedule = await ExamSchedule.create({
      exam_id,
      college_id: req.college_id,
      status: "DRAFT",
      subjects: validatedSubjects,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    auditLogService
      .logAudit({
        collegeId: req.college_id,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: "EXAM_SCHEDULE_CREATED",
        resourceType: "ExamSchedule",
        resourceId: schedule._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 201,
        newValues: {
          examId: exam._id,
          subjectCount: schedule.subjects.length,
          status: schedule.status,
        },
      })
      .catch((err) => console.error("Audit log failed:", err));

    const populated = await loadSchedule(exam._id, req.college_id);
    res.status(201).json({
      ...respondWithSchedule(populated),
      message: "Exam schedule created successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * GET
 * ============================================================ */

exports.getExamSchedule = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const exam = await getExamForCollege(examId, req.college_id);

    const schedule = await loadSchedule(exam._id, req.college_id);
    if (!schedule) {
      throw new AppError(
        "Exam schedule not found",
        404,
        "SCHEDULE_NOT_FOUND",
      );
    }

    res.json(respondWithSchedule(schedule));
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * UPDATE
 * DRAFT-only updates. Schedule must already exist.
 * ============================================================ */

exports.updateExamSchedule = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const exam = await getExamForCollege(examId, req.college_id);

    const schedule = await ExamSchedule.findOne({
      exam_id: examId,
      college_id: req.college_id,
    });

    if (!schedule) {
      throw new AppError(
        "Exam schedule not found",
        404,
        "SCHEDULE_NOT_FOUND",
      );
    }

    if (schedule.status === "PUBLISHED") {
      throw new AppError(
        "Published schedule cannot be modified",
        400,
        "SCHEDULE_LOCKED",
      );
    }

    const { subjects } = req.body;

    if (subjects !== undefined) {
      const examSubjectIds = exam.subjects.map((s) => s.subject);
      const validatedSubjects = validateScheduleSubjects(
        subjects,
        examSubjectIds,
      );
      await ensureSubjectsExistInCollege(
        validatedSubjects.map((s) => s.subject),
        req.college_id,
      );
      schedule.subjects = validatedSubjects;
    }

    schedule.updatedBy = req.user.id;
    await schedule.save();

    auditLogService
      .logAudit({
        collegeId: req.college_id,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: "EXAM_SCHEDULE_UPDATED",
        resourceType: "ExamSchedule",
        resourceId: schedule._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        newValues: {
          examId: exam._id,
          subjectCount: schedule.subjects.length,
          status: schedule.status,
        },
      })
      .catch((err) => console.error("Audit log failed:", err));

    const populated = await loadSchedule(exam._id, req.college_id);
    res.json({
      ...respondWithSchedule(populated),
      message: "Exam schedule updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
 * PUBLISH
 * DRAFT -> PUBLISHED only. Requires every Exam subject to be fully
 * scheduled (examDate + startTime + endTime).
 * ============================================================ */

exports.publishExamSchedule = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const exam = await getExamForCollege(examId, req.college_id);

    const schedule = await ExamSchedule.findOne({
      exam_id: examId,
      college_id: req.college_id,
    });

    if (!schedule) {
      throw new AppError(
        "Exam schedule not found",
        404,
        "SCHEDULE_NOT_FOUND",
      );
    }

    if (schedule.status === "PUBLISHED") {
      return res.json({
        ...respondWithSchedule(schedule),
        message: "Exam schedule is already published",
      });
    }

    const examSubjectIds = exam.subjects.map((s) => String(s.subject));
    const scheduledById = new Map(
      schedule.subjects.map((s) => [String(s.subject), s]),
    );

    const missing = [];
    const incomplete = [];

    for (const subjectId of examSubjectIds) {
      const entry = scheduledById.get(subjectId);
      if (!entry) {
        missing.push(subjectId);
        continue;
      }
      const hasDate =
        entry.examDate !== undefined && entry.examDate !== null;
      const hasStart =
        typeof entry.startTime === "string" && entry.startTime.length > 0;
      const hasEnd =
        typeof entry.endTime === "string" && entry.endTime.length > 0;
      if (!hasDate || !hasStart || !hasEnd) {
        incomplete.push(subjectId);
      }
    }

    if (missing.length || incomplete.length) {
      throw new AppError(
        `Cannot publish incomplete schedule. Missing: ${missing.length}, incomplete: ${incomplete.length}`,
        400,
        "SCHEDULE_INCOMPLETE",
      );
    }

    const previousStatus = schedule.status;
    schedule.status = "PUBLISHED";
    schedule.publishedBy = req.user.id;
    schedule.publishedAt = new Date();
    schedule.updatedBy = req.user.id;
    await schedule.save();

    auditLogService
      .logAudit({
        collegeId: req.college_id,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: "EXAM_SCHEDULE_PUBLISHED",
        resourceType: "ExamSchedule",
        resourceId: schedule._id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: 200,
        oldValues: { status: previousStatus },
        newValues: { status: schedule.status },
        metadata: {
          examId: exam._id,
          subjectCount: schedule.subjects.length,
          publishedAt: schedule.publishedAt,
        },
      })
      .catch((err) => console.error("Audit log failed:", err));

    const populated = await loadSchedule(exam._id, req.college_id);
    res.json({
      ...respondWithSchedule(populated),
      message: "Exam schedule published successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET PUBLISHED SCHEDULE — DISPATCHER
 * Routes to the appropriate role-scoped handler.
 */
exports.getPublishedSchedule = async (req, res, next) => {
  try {
    const role = req.user?.role;

    if (role === "STUDENT") {
      return exports.getPublishedScheduleForStudent(req, res, next);
    }
    if (role === "TEACHER") {
      return exports.getPublishedScheduleForTeacher(req, res, next);
    }
    if (role === "HOD") {
      return exports.getPublishedScheduleForHOD(req, res, next);
    }

    return ApiResponse.success(res, null, "Exam schedule not found");
  } catch (error) {
    console.error("Get Published Schedule Error:", error);
    res.status(500).json({ message: "Failed to fetch exam schedule" });
  }
};

/* =========================================================
   PUBLISHED SCHEDULE VISIBILITY — STUDENT / TEACHER / HOD
   ========================================================= */

/**
 * Helper: Load a PUBLISHED ExamSchedule with full population.
 */
const loadPublishedScheduleForVisibility = async (examId, collegeId) => {
  const schedule = await ExamSchedule.findOne({
    exam_id: examId,
    college_id: collegeId,
    status: "PUBLISHED",
  })
    .populate("exam_id", "name course_id semester academicYear status")
    .populate(
      "subjects.subject",
      "name code subjectType teacher_id internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
    );

  if (!schedule) return null;

  return schedule;
};

/**
 * GET PUBLISHED SCHEDULE — STUDENT
 * Returns the PUBLISHED exam schedule only if the student is enrolled
 * in the exam's course + semester.
 */
exports.getPublishedScheduleForStudent = async (req, res, next) => {
  try {
    const student = req.student;

    if (!student) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const exam = await Exam.findOne({
      _id: req.params.examId,
      college_id: req.college_id,
      status: "PUBLISHED",
    });

    if (!exam) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    if (
      String(exam.course_id) !== String(student.course_id) ||
      Number(exam.semester) !== Number(student.currentSemester)
    ) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const schedule = await loadPublishedScheduleForVisibility(
      exam._id,
      req.college_id,
    );

    if (!schedule) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    ApiResponse.success(
      res,
      { exam, schedule },
      "Published exam schedule fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Schedule For Student Error:", error);
    res.status(500).json({ message: "Failed to fetch exam schedule" });
  }
};

/**
 * GET PUBLISHED SCHEDULE — TEACHER
 * Returns the PUBLISHED exam schedule only if the teacher is assigned
 * to at least one subject in the exam, or the exam's course is in
 * the teacher's courses[].
 */
exports.getPublishedScheduleForTeacher = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      false,
    );

    const exam = await Exam.findOne({
      _id: req.params.examId,
      college_id: req.college_id,
      status: "PUBLISHED",
    });

    if (!exam) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const teacherCourses = teacher.courses || [];
    const teacherSubjects = teacher.subjects || [];

    const courseMatch =
      teacherCourses.length === 0 ||
      teacherCourses.some((cid) => String(cid) === String(exam.course_id));

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
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const schedule = await loadPublishedScheduleForVisibility(
      exam._id,
      req.college_id,
    );

    if (!schedule) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    ApiResponse.success(
      res,
      { exam, schedule },
      "Published exam schedule fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Schedule For Teacher Error:", error);
    res.status(500).json({ message: "Failed to fetch exam schedule" });
  }
};

/**
 * GET PUBLISHED SCHEDULE — HOD
 * Returns the PUBLISHED exam schedule only if the exam's course belongs
 * to the HOD's department.
 */
exports.getPublishedScheduleForHOD = async (req, res, next) => {
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
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const exam = await Exam.findOne({
      _id: req.params.examId,
      college_id: req.college_id,
      status: "PUBLISHED",
    })
      .populate("course_id", "name code department_id")
      .populate(
        "subjects.subject",
        "name code teacher_id subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      );

    if (!exam) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const course = await Course.findById(exam.course_id).select(
      "department_id",
    );
    if (!course || String(course.department_id) !== String(department._id)) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    const schedule = await loadPublishedScheduleForVisibility(
      exam._id,
      req.college_id,
    );

    if (!schedule) {
      return ApiResponse.success(res, null, "Exam schedule not found");
    }

    ApiResponse.success(
      res,
      { exam, schedule },
      "Published exam schedule fetched successfully",
    );
  } catch (error) {
    console.error("Get Published Schedule For HOD Error:", error);
    res.status(500).json({ message: "Failed to fetch exam schedule" });
  }
};