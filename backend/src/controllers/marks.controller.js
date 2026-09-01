const StudentMarks = require("../models/studentMarks.model");
const Exam = require("../models/exam.model");
const Subject = require("../models/subject.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");
const auditLogService = require("../services/auditLog.service");
const { ROLE } = require("../utils/constants");
const { calculateSubjectResult } = require("../services/examCalculation.service");

/**
 * Validate marks against the Exam Subject configuration.
 *
 * Rules:
 * - marks >= 0
 * - THEORY: internalMarks <= internalMaxMarks, externalMarks <= externalMaxMarks
 * - PRACTICAL: internalMarks <= internalMaxMarks (external not applicable)
 * - COMPOSITE: internalMarks <= internalMaxMarks, externalMarks <= externalMaxMarks
 *
 * Missing marks are allowed (null/undefined) and are NOT coerced to 0.
 */
const validateMarks = (marks, examSubject) => {
  const { subjectType, internalMaxMarks, externalMaxMarks } = examSubject;

  if (marks.internalMarks !== undefined && marks.internalMarks !== null) {
    const internal = Number(marks.internalMarks);
    if (internal < 0) {
      throw new AppError("Internal marks cannot be negative", 400, "NEGATIVE_INTERNAL_MARKS");
    }
    if (internalMaxMarks !== undefined && internalMaxMarks !== null && internal > internalMaxMarks) {
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
      throw new AppError("External marks cannot be negative", 400, "NEGATIVE_EXTERNAL_MARKS");
    }

    if (subjectType === "PRACTICAL") {
      throw new AppError(
        "External marks are not applicable for PRACTICAL subjects",
        400,
        "EXTERNAL_MARKS_NOT_APPLICABLE",
      );
    }

    if (externalMaxMarks !== undefined && externalMaxMarks !== null && external > externalMaxMarks) {
      throw new AppError(
        `External marks cannot exceed ${externalMaxMarks}`,
        400,
        "EXTERNAL_MARKS_EXCEED_MAX",
      );
    }
  }

  if (subjectType === "PRACTICAL" && marks.externalMarks !== undefined && marks.externalMarks !== null) {
    throw new AppError(
      "External marks are not applicable for PRACTICAL subjects",
      400,
      "EXTERNAL_MARKS_NOT_APPLICABLE",
    );
  }
};

/**
 * Resolve the Exam Subject configuration from the Exam document.
 */
const getExamSubject = (exam, subjectId) => {
  const subject = exam.subjects.find((s) => String(s.subject) === String(subjectId));
  if (!subject) {
    throw new AppError("Subject is not part of this exam", 404, "SUBJECT_NOT_IN_EXAM");
  }
  return subject;
};

/**
 * Authorize teacher ownership for a subject.
 * Returns the Teacher document if found, null if not a teacher or coordinator.
 */
const authorizeTeacher = async (req, subjectId, collegeId) => {
  if (req.user.role === ROLE.EXAM_COORDINATOR) {
    return null;
  }

  if (req.user.role !== ROLE.TEACHER) {
    throw new AppError("Access denied", 403, "FORBIDDEN_ROLE");
  }

  const teacher = await Teacher.findOne({
    user_id: req.user.id,
    college_id,
  });

  if (!teacher) {
    throw new AppError("Teacher profile not found", 403, "TEACHER_NOT_FOUND");
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    college_id,
  });

  if (!subject) {
    throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
  }

  if (subject.teacher_id && subject.teacher_id.toString() !== teacher._id.toString()) {
    throw new AppError("You are not authorized for this subject", 403, "SUBJECT_ACCESS_DENIED");
  }

  return teacher;
};

/**
 * GET STUDENT ROSTER
 * Returns students eligible for the exam subject, with existing marks if any.
 */
exports.getStudentRoster = async (req, res, next) => {
  try {
    const { examId, subjectId } = req.query;

    if (!examId || !subjectId) {
      throw new AppError("examId and subjectId are required", 400, "MISSING_PARAMS");
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
    });

    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const examSubject = getExamSubject(exam, subjectId);

    await authorizeTeacher(req, subjectId, req.college_id);

    const students = await Student.find({
      college_id: req.college_id,
      course_id: exam.course_id,
      currentSemester: exam.semester,
    })
      .select("_id fullName enrollmentNumber rollNumber")
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

    const roster = students.map((student) => ({
      studentId: student._id,
      fullName: student.fullName,
      enrollmentNumber: student.enrollmentNumber,
      rollNumber: student.rollNumber,
      marks: marksMap.get(String(student._id)) || null,
    }));

    // Attach calculated pass/fail status using the Exam Subject snapshot.
    // Calculation is derived; not persisted to StudentMarks.
    const rosterWithCalculation = roster.map((entry) => {
      const raw = entry.marks || {};
      const calculation = calculateSubjectResult(examSubject, {
        internalMarks: raw.internalMarks,
        externalMarks: raw.externalMarks,
      });
      return { ...entry, calculation };
    });

    res.json({
      success: true,
      data: {
        examId,
        subjectId,
        subjectType: examSubject.subjectType,
        internalMaxMarks: examSubject.internalMaxMarks,
        externalMaxMarks: examSubject.externalMaxMarks,
        roster: rosterWithCalculation,
        totalStudents: rosterWithCalculation.length,
        markedCount: marks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET MARKS
 * Returns all marks for an exam subject.
 */
exports.getMarks = async (req, res, next) => {
  try {
    const { examId, subjectId } = req.query;

    if (!examId || !subjectId) {
      throw new AppError("examId and subjectId are required", 400, "MISSING_PARAMS");
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
    });

    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    getExamSubject(exam, subjectId);
    await authorizeTeacher(req, subjectId, req.college_id);

    const marks = await StudentMarks.find({
      college_id: req.college_id,
      exam_id: examId,
      subject_id: subjectId,
    }).populate("student_id", "fullName enrollmentNumber rollNumber");

    const examSubject = exam.subjects.find(
      (s) => String(s.subject) === String(subjectId),
    );

    // Attach derived calculation; not persisted to StudentMarks.
    const data = marks.map((mark) => {
      const calculation = calculateSubjectResult(examSubject, {
        internalMarks: mark.internalMarks,
        externalMarks: mark.externalMarks,
      });
      return { ...mark.toObject(), calculation };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * SAVE MARKS (bulk)
 * Creates or updates marks for multiple students.
 */
exports.saveMarks = async (req, res, next) => {
  try {
    const { examId, subjectId, marks } = req.body;

    if (!examId || !subjectId) {
      throw new AppError("examId and subjectId are required", 400, "MISSING_PARAMS");
    }

    if (!Array.isArray(marks)) {
      throw new AppError("marks must be an array", 400, "INVALID_MARKS_FORMAT");
    }

    const exam = await Exam.findOne({
      _id: examId,
      college_id: req.college_id,
    });

    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const examSubject = getExamSubject(exam, subjectId);
    await authorizeTeacher(req, subjectId, req.college_id);

    const results = [];
    const auditLogs = [];
    const now = new Date();

    for (const entry of marks) {
      const { studentId, internalMarks, externalMarks } = entry;

      if (!studentId) {
        throw new AppError("studentId is required for each mark entry", 400, "MISSING_STUDENT_ID");
      }

      const student = await Student.findOne({
        _id: studentId,
        college_id: req.college_id,
        course_id: exam.course_id,
        currentSemester: exam.semester,
      });

      if (!student) {
        throw new AppError(
          `Student ${studentId} is not eligible for this exam`,
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

    res.json({
      success: true,
      message: "Marks saved successfully",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
