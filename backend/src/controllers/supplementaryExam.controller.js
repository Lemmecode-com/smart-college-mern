const Exam = require("../models/exam.model");
const Student = require("../models/student.model");
const Backlog = require("../models/backlog.model");
const BacklogAttempt = require("../models/backlogAttempt.model");
const Subject = require("../models/subject.model");
const StudentMarks = require("../models/studentMarks.model");
const SemesterResult = require("../models/semesterResult.model");
const { calculateSubjectResult } = require("../services/examCalculation.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { EXAM_TYPE, BACKLOG_STATUS } = require("../services/backlogAttempt.service");
const { assertMarksMutable } = require("../utils/resultLifecycle.util");
const auditLogService = require("../services/auditLog.service");

const getSupplementaryExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({
      college_id: req.college_id,
      exam_type: EXAM_TYPE.SUPPLEMENTARY,
    })
      .populate("course_id", "name code")
      .populate("subjects.subject", "name code subjectType")
      .sort({ createdAt: -1 });

    ApiResponse.success(
      res,
      exams,
      "Supplementary exams fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getSupplementaryExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.examId,
      college_id: req.college_id,
      exam_type: EXAM_TYPE.SUPPLEMENTARY,
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
          "name code subjectType internalMaxMarks externalMaxMarks internalPassMarks externalPassMarks passMarks",
      });

    if (!exam) {
      throw new AppError("Supplementary exam not found", 404, "EXAM_NOT_FOUND");
    }

    ApiResponse.success(
      res,
      exam,
      "Supplementary exam details fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getSupplementaryRoster = async (req, res, next) => {
  try {
    const { examId, subjectId } = req.query;

    if (!examId || !subjectId) {
      throw new AppError(
        "examId and subjectId are required",
        400,
        "MISSING_PARAMS"
      );
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
      exam_type: EXAM_TYPE.SUPPLEMENTARY,
    });

    if (!exam) {
      throw new AppError("Supplementary exam not found", 404, "EXAM_NOT_FOUND");
    }

    const examSubject = exam.subjects.find(
      (s) => String(s.subject) === String(subjectId)
    );
    if (!examSubject) {
      throw new AppError(
        "Subject not found in exam configuration",
        404,
        "SUBJECT_NOT_IN_EXAM"
      );
    }

    const attempts = await BacklogAttempt.find({
      exam_id: examId,
      college_id: req.college_id,
    })
      .select("backlog_id student_id course_id subject_id attempt_number result_status passed cleared")
      .lean();

    if (attempts.length === 0) {
      return ApiResponse.success(
        res,
        {
          examId,
          subjectId,
          subjectType: examSubject.subjectType,
          internalMaxMarks: examSubject.internalMaxMarks,
          externalMaxMarks: examSubject.externalMaxMarks,
          roster: [],
          totalStudents: 0,
          markedCount: 0,
        },
        "No eligible backlog students found for the selected supplementary exam and subject."
      );
    }

    const backlogIds = [...new Set(attempts.map((attempt) => attempt.backlog_id))];
    const backlogs = await Backlog.find({
      _id: { $in: backlogIds },
      college_id: req.college_id,
      status: { $in: [BACKLOG_STATUS.OPEN, BACKLOG_STATUS.ATTEMPTED] },
    })
      .select("student_id course_id subject_id semester academicYear status attempt_count latest_result_status")
      .lean();

    const attemptRelationships = new Set(
      attempts.map(
        (attempt) =>
          `${attempt.backlog_id}:${attempt.course_id}:${attempt.subject_id}`
      )
    );

    const eligibleBacklogs = backlogs.filter(
      (backlog) =>
        attemptRelationships.has(
          `${backlog._id}:${backlog.course_id}:${backlog.subject_id}`
        )
    );

    if (eligibleBacklogs.length === 0) {
      return ApiResponse.success(
        res,
        {
          examId,
          subjectId,
          subjectType: examSubject.subjectType,
          internalMaxMarks: examSubject.internalMaxMarks,
          externalMaxMarks: examSubject.externalMaxMarks,
          roster: [],
          totalStudents: 0,
          markedCount: 0,
        },
        "No eligible backlog students found for the selected supplementary exam and subject."
      );
    }

    const studentIds = eligibleBacklogs.map((b) => b.student_id);
    const students = await Student.find({
      college_id: req.college_id,
      _id: { $in: studentIds },
    })
      .select("_id fullName enrollmentNumber rollNumber course_id currentSemester currentAcademicYear")
      .populate("course_id", "name code")
      .sort({ fullName: 1 });

    const marks = await StudentMarks.find({
      college_id: req.college_id,
      exam_id: examId,
      subject_id: subjectId,
    });

    const marksMap = new Map();
    for (const mark of marks) {
      marksMap.set(String(mark.student_id), {
        _id: mark._id,
        internalMarks: mark.internalMarks,
        externalMarks: mark.externalMarks,
        createdAt: mark.createdAt,
        updatedAt: mark.updatedAt,
      });
    }

    const backlogMap = new Map(eligibleBacklogs.map((b) => [String(b.student_id), b]));
    const attemptMap = new Map(attempts.map((a) => [String(a.student_id), a]));

    const roster = students.map((student) => {
      const studentId = String(student._id);
      const backlog = backlogMap.get(studentId);
      const attempt = attemptMap.get(studentId);
      const existingMarks = marksMap.get(studentId);

      const calculation = calculateSubjectResult(examSubject, {
        internalMarks: existingMarks?.internalMarks ?? null,
        externalMarks: existingMarks?.externalMarks ?? null,
      });

      return {
        studentId: student._id,
        fullName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        rollNumber: student.rollNumber,
        course: student.course_id ? { name: student.course_id.name, code: student.course_id.code } : null,
        currentSemester: student.currentSemester,
        currentAcademicYear: student.currentAcademicYear,
        backlogSemester: backlog?.semester,
        backlogAcademicYear: backlog?.academicYear,
        backlogStatus: backlog?.status,
        backlogId: backlog?._id,
        attemptId: attempt?._id,
        attemptNumber: attempt?.attempt_number,
        attemptResultStatus: attempt?.result_status,
        attemptPassed: attempt?.passed,
        attemptCleared: attempt?.cleared,
        marks: existingMarks || null,
        calculation,
      };
    });

    ApiResponse.success(
      res,
      {
        examId,
        subjectId,
        subjectType: examSubject.subjectType,
        internalMaxMarks: examSubject.internalMaxMarks,
        externalMaxMarks: examSubject.externalMaxMarks,
        roster,
        totalStudents: roster.length,
        markedCount: marks.length,
      },
      "Supplementary roster fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const getSupplementaryMarks = async (req, res, next) => {
  try {
    const { examId, subjectId } = req.query;

    if (!examId || !subjectId) {
      throw new AppError(
        "examId and subjectId are required",
        400,
        "MISSING_PARAMS"
      );
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
      exam_type: EXAM_TYPE.SUPPLEMENTARY,
    });

    if (!exam) {
      throw new AppError("Supplementary exam not found", 404, "EXAM_NOT_FOUND");
    }

    const examSubject = exam.subjects.find(
      (s) => String(s.subject) === String(subjectId)
    );
    if (!examSubject) {
      throw new AppError(
        "Subject not found in exam configuration",
        404,
        "SUBJECT_NOT_IN_EXAM"
      );
    }

    const marks = await StudentMarks.find({
      college_id: req.college_id,
      exam_id: examId,
      subject_id: subjectId,
    }).lean();

    const marksWithCalculation = marks.map((mark) => {
      const calculation = calculateSubjectResult(examSubject, {
        internalMarks: mark.internalMarks,
        externalMarks: mark.externalMarks,
      });
      return { ...mark, calculation };
    });

    ApiResponse.success(
      res,
      {
        examId,
        subjectId,
        subjectType: examSubject.subjectType,
        internalMaxMarks: examSubject.internalMaxMarks,
        externalMaxMarks: examSubject.externalMaxMarks,
        marks: marksWithCalculation,
        totalMarks: marksWithCalculation.length,
      },
      "Supplementary marks fetched successfully"
    );
  } catch (error) {
    next(error);
  }
};

const validateMarks = (marks, examSubject) => {
  const { subjectType, internalMaxMarks, externalMaxMarks } = examSubject;

  if (marks.internalMarks !== undefined && marks.internalMarks !== null) {
    const internal = Number(marks.internalMarks);
    if (internal < 0) {
      throw new AppError(
        "Internal marks cannot be negative",
        400,
        "NEGATIVE_INTERNAL_MARKS",
      );
    }
    if (
      internalMaxMarks !== undefined &&
      internalMaxMarks !== null &&
      internal > internalMaxMarks
    ) {
      throw new AppError(
        `Internal marks cannot exceed ${internalMaxMarks}`,
        400,
        "INTERNAL_MARKS_EXCEED_MAX",
      );
    }
  }

  if (marks.externalMarks !== undefined && marks.externalMarks !== null) {
    const external = Number(marks.externalMarks);
    if (external < 0) {
      throw new AppError(
        "External marks cannot be negative",
        400,
        "NEGATIVE_EXTERNAL_MARKS",
      );
    }

    if (subjectType === "PRACTICAL") {
      throw new AppError(
        "External marks are not applicable for PRACTICAL subjects",
        400,
        "EXTERNAL_MARKS_NOT_APPLICABLE",
      );
    }

    if (
      externalMaxMarks !== undefined &&
      externalMaxMarks !== null &&
      external > externalMaxMarks
    ) {
      throw new AppError(
        `External marks cannot exceed ${externalMaxMarks}`,
        400,
        "EXTERNAL_MARKS_EXCEED_MAX",
      );
    }
  }

  if (
    subjectType === "PRACTICAL" &&
    marks.externalMarks !== undefined &&
    marks.externalMarks !== null
  ) {
    throw new AppError(
      "External marks are not applicable for PRACTICAL subjects",
      400,
      "EXTERNAL_MARKS_NOT_APPLICABLE",
    );
  }
};

const getExamSubject = (exam, subjectId) => {
  const subject = exam.subjects.find(
    (s) => String(s.subject) === String(subjectId),
  );
  if (!subject) {
    throw new AppError(
      "Subject is not part of this exam",
      404,
      "SUBJECT_NOT_IN_EXAM",
    );
  }
  return subject;
};

const getSupplementaryBacklogStudentIds = async (examId, collegeId) => {
  const attempts = await BacklogAttempt.find({
    exam_id: examId,
    college_id: collegeId,
  })
    .select("backlog_id course_id subject_id")
    .lean();

  if (attempts.length === 0) {
    return [];
  }

  const backlogIds = [...new Set(attempts.map((attempt) => attempt.backlog_id))];
  const backlogs = await Backlog.find({
    _id: { $in: backlogIds },
    college_id: collegeId,
    status: { $in: [BACKLOG_STATUS.OPEN, BACKLOG_STATUS.ATTEMPTED] },
  })
    .select("student_id course_id subject_id")
    .lean();

  const attemptRelationships = new Set(
    attempts.map(
      (attempt) =>
        `${attempt.backlog_id}:${attempt.course_id}:${attempt.subject_id}`,
    ),
  );

  return backlogs
    .filter(
      (backlog) =>
        attemptRelationships.has(
          `${backlog._id}:${backlog.course_id}:${backlog.subject_id}`,
        ),
    )
    .map((backlog) => String(backlog.student_id));
};

const saveSupplementaryMarks = async (req, res, next) => {
  try {
    const { examId, subjectId, marks } = req.body;

    if (!examId || !subjectId) {
      throw new AppError(
        "examId and subjectId are required",
        400,
        "MISSING_PARAMS",
      );
    }

    if (!Array.isArray(marks)) {
      throw new AppError("marks must be an array", 400, "INVALID_MARKS_FORMAT");
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
      exam_type: EXAM_TYPE.SUPPLEMENTARY,
    });

    if (!exam) {
      throw new AppError("Supplementary exam not found", 404, "EXAM_NOT_FOUND");
    }

    const examSubject = getExamSubject(exam, subjectId);

    const supplementaryBacklogStudentIds = await getSupplementaryBacklogStudentIds(
      examId,
      req.college_id,
    );

    const studentIds = marks
      .map((entry) => entry && entry.studentId)
      .filter((id) => id);
    await assertMarksMutable({
      collegeId: req.college_id,
      examId,
      studentIds,
    });

    const results = [];
    const auditLogs = [];

    for (const entry of marks) {
      const { studentId, internalMarks, externalMarks } = entry;

      if (!studentId) {
        throw new AppError(
          "studentId is required for each mark entry",
          400,
          "MISSING_STUDENT_ID",
        );
      }

      if (!supplementaryBacklogStudentIds?.includes(String(studentId))) {
        throw new AppError(
          `Student ${studentId} is not eligible for this supplementary exam`,
          400,
          "STUDENT_NOT_ELIGIBLE",
        );
      }

      const student = await Student.findOne({
        _id: studentId,
        college_id: req.college_id,
        course_id: exam.course_id,
      });

      if (!student) {
        throw new AppError(
          `Student ${studentId} is not eligible for this supplementary exam`,
          400,
          "STUDENT_NOT_ELIGIBLE",
        );
      }

      const marksToValidate = {
        internalMarks: internalMarks !== undefined ? internalMarks : null,
        externalMarks: externalMarks !== undefined ? externalMarks : null,
      };

      validateMarks(marksToValidate, examSubject);

      const existing = await StudentMarks.findOne({
        college_id: req.college_id,
        exam_id: examId,
        subject_id: subjectId,
        student_id: studentId,
      });

      const isNew = !existing;

      const updated = await StudentMarks.findOneAndUpdate(
        {
          college_id: req.college_id,
          exam_id: examId,
          subject_id: subjectId,
          student_id: studentId,
        },
        {
          college_id: req.college_id,
          exam_id: examId,
          subject_id: subjectId,
          student_id: studentId,
          internalMarks: marksToValidate.internalMarks,
          externalMarks: marksToValidate.externalMarks,
          createdBy: isNew ? req.user.id : existing.createdBy,
          updatedBy: req.user.id,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      results.push({
        studentId: student._id,
        fullName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        internalMarks: updated.internalMarks,
        externalMarks: updated.externalMarks,
        isNew,
      });

      auditLogs.push({
        action: isNew ? "MARKS_ENTERED" : "MARKS_UPDATED",
        resourceType: "StudentMarks",
        resourceId: updated._id,
        oldValues: isNew
          ? null
          : {
              internalMarks: existing.internalMarks,
              externalMarks: existing.externalMarks,
            },
        newValues: {
          internalMarks: updated.internalMarks,
          externalMarks: updated.externalMarks,
          studentId: student._id,
          studentName: student.fullName,
          examId,
          subjectId,
        },
      });
    }

    await Promise.all(
      auditLogs.map((log) =>
        auditLogService.logAudit({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: log.oldValues,
          newValues: log.newValues,
        }),
      ),
    );

    ApiResponse.success(
      res,
      { results },
      "Supplementary marks saved successfully",
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSupplementaryExams,
  getSupplementaryExamById,
  getSupplementaryRoster,
  getSupplementaryMarks,
  saveSupplementaryMarks,
};