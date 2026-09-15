const mongoose = require("mongoose");
const Backlog = require("../models/backlog.model");
const BacklogAttempt = require("../models/backlogAttempt.model");
const Exam = require("../models/exam.model");
const Student = require("../models/student.model");
const SemesterResult = require("../models/semesterResult.model");
const Subject = require("../models/subject.model");
const StudentMarks = require("../models/studentMarks.model");
const AuditLog = require("../models/auditLog.model");
const Notification = require("../models/notification.model");
const AppError = require("../utils/AppError");
const { ROLE } = require("../utils/constants");
const { RESULT_STATUS } = require("../utils/constants");
const {
  calculateSubjectResult,
} = require("./examCalculation.service");
const auditLogService = require("./auditLog.service");
const {
  DEFAULT_MAX_ALLOWED_KTS,
  resolveMaxAllowedKTs,
} = require("../utils/promotionPolicy.util");
const {
  calculateKTCount,
  isWithinKTLimit,
} = require("./atkt.service");

const EXAM_TYPE = {
  REGULAR: "REGULAR",
  SUPPLEMENTARY: "SUPPLEMENTARY",
  RE_EXAM: "RE_EXAM",
};

const BACKLOG_STATUS = {
  OPEN: "OPEN",
  ATTEMPTED: "ATTEMPTED",
  CLEARED: "CLEARED",
  CANCELLED: "CANCELLED",
};

const assertRole = (action, actorRole) => {
  const normalizedRole = String(actorRole || "").toUpperCase();
  const allowedRoles =
    action === "CREATE_ATTEMPT" || action === "EVALUATE_ATTEMPT"
      ? ["COLLEGE_ADMIN", "ADMISSION_OFFICER"]
      : [];
  if (!allowedRoles.includes(normalizedRole)) {
    throw new AppError(
      `Role ${actorRole || "UNKNOWN"} cannot ${action.toLowerCase()}`,
      403,
      "PROMOTION_WORKFLOW_FORBIDDEN",
    );
  }
};

const getBacklog = async (backlogId, collegeId, session) => {
  const backlog = await Backlog.findOne({
    _id: backlogId,
    college_id: collegeId,
  })
    .session(session || null)
    .exec();
  if (!backlog) {
    throw new AppError("Backlog not found", 404, "BACKLOG_NOT_FOUND");
  }
  return backlog;
};

const getStudent = async (studentId, collegeId, session) => {
  const student = await Student.findOne({
    _id: studentId,
    college_id: collegeId,
  })
    .session(session || null)
    .exec();
  if (!student) {
    throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
  }
  return student;
};

const getSubject = async (subjectId, collegeId, session) => {
  const subject = await Subject.findOne({
    _id: subjectId,
    college_id: collegeId,
  })
    .session(session || null)
    .exec();
  if (!subject) {
    throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
  }
  return subject;
};

const resolveExamSubjectConfig = async (
  examId,
  subjectId,
  collegeId,
  session,
) => {
  const exam = await Exam.findOne({
    _id: examId,
    college_id: collegeId,
    "subjects.subject": subjectId,
  })
    .session(session || null)
    .exec();
  if (!exam) {
    throw new AppError("Exam not found for this subject", 404, "EXAM_NOT_FOUND");
  }
  const examSubject = exam.subjects.find(
    (s) => String(s.subject) === String(subjectId),
  );
  if (!examSubject) {
    throw new AppError(
      "Subject not found in exam configuration",
      404,
      "SUBJECT_NOT_IN_EXAM",
    );
  }
  return { exam, examSubject };
};

const hasMarksForExam = async (examId, studentId, collegeId, session) => {
  const count = await StudentMarks.countDocuments({
    college_id: collegeId,
    exam_id: examId,
    student_id: studentId,
  })
    .session(session || null)
    .exec();
  return count > 0;
};

const createSupplementaryExam = async (
  backlog,
  actorId,
  session,
) => {
  const existingExam = await Exam.findOne({
    college_id: backlog.college_id,
    name: `Supplementary - ${backlog.subject_code || backlog.subject_name}`,
    semester: backlog.semester,
    academicYear: backlog.academicYear,
    "subjects.subject": backlog.subject_id,
  })
    .session(session)
    .exec();

  if (existingExam) {
    return existingExam;
  }

  const subjectDoc = await Subject.findById(backlog.subject_id)
    .session(session)
    .exec();

  const exam = await Exam.create(
    [
      {
        college_id: backlog.college_id,
        name: `Supplementary - ${backlog.subject_code || backlog.subject_name}`,
        course_id: backlog.course_id,
        semester: backlog.semester,
        academicYear: backlog.academicYear,
        exam_type: EXAM_TYPE.SUPPLEMENTARY,
        subjects: [
          {
            subject: backlog.subject_id,
            subjectType: subjectDoc?.subjectType || "THEORY",
            internalMaxMarks: subjectDoc?.internalMaxMarks || 30,
            externalMaxMarks: subjectDoc?.externalMaxMarks || 70,
            internalPassMarks: subjectDoc?.internalPassMarks || 12,
            externalPassMarks: subjectDoc?.externalPassMarks || 28,
            passMarks: subjectDoc?.passMarks || 40,
          },
        ],
        status: "DRAFT",
        createdBy: actorId,
      },
    ],
    { session },
  );

  return exam[0];
};

const buildAttemptSnapshot = (backlog, exam, result) => ({
  college_id: backlog.college_id,
  student_id: backlog.student_id,
  college_id: backlog.college_id,
  course_id: backlog.course_id,
  subject_id: backlog.subject_id,
  subject_code: backlog.subject_code,
  subject_name: backlog.subject_name,
  subject_type: backlog.subject_type,
  exam_id: exam._id,
  exam_name: exam.name,
  exam_type: exam.exam_type,
  result_id: result ? result._id : null,
  internal_marks: result?.subjects?.[0]?.internalMarks || null,
  external_marks: result?.subjects?.[0]?.externalMarks || null,
  total_marks: result?.subjects?.[0]?.totalMarks || null,
  result_status: result?.subjects?.[0]?.status || null,
  passed: result?.subjects?.[0]?.passed || false,
  attempted_by: null,
  evaluated_by: null,
  cleared: false,
});

const createAttempt = async ({
  backlogId,
  collegeId,
  actorId,
  actorRole,
  request,
}) => {
  assertRole("CREATE_ATTEMPT", actorRole);
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const backlog = await getBacklog(backlogId, collegeId, session);

      const exam = await createSupplementaryExam(backlog, actorId, session);

      const existingAttempt = await BacklogAttempt.findOne({
        backlog_id: backlogId,
        exam_id: exam._id,
        attempted_by: actorId,
      })
        .session(session)
        .exec();

      if (existingAttempt) {
        result = {
          attempt: existingAttempt,
          isIdempotent: true,
          exam,
          backlog,
        };
        return;
      }

      if (backlog.status !== BACKLOG_STATUS.OPEN) {
        throw new AppError(
          `Backlog cannot be attempted in ${backlog.status} status.`,
          409,
          "BACKLOG_NOT_OPEN",
          { backlogId, status: backlog.status },
        );
      }

      const student = await getStudent(backlog.student_id, collegeId, session);

      const subject = await getSubject(
        backlog.subject_id,
        collegeId,
        session,
      );

      const currentAttemptNumber = (backlog.attempt_count || 0) + 1;

      const attempt = await BacklogAttempt.create(
        [
          {
            backlog_id: backlogId,
            student_id: backlog.student_id,
            college_id: backlog.college_id,
            course_id: backlog.course_id,
            subject_id: backlog.subject_id,
            subject_code: backlog.subject_code,
            subject_name: backlog.subject_name,
            subject_type: backlog.subject_type,
            attempt_number: currentAttemptNumber,
            exam_id: exam._id,
            exam_name: exam.name,
            exam_type: EXAM_TYPE.SUPPLEMENTARY,
            attempted_by: actorId,
            attempted_at: new Date(),
            result_status: "INCOMPLETE",
            passed: false,
            cleared: false,
          },
        ],
        { session },
      );

      const attemptDoc = attempt[0];

      backlog.status = BACKLOG_STATUS.ATTEMPTED;
      backlog.attempt_count = currentAttemptNumber;
      backlog.latest_attempt_id = attemptDoc._id;
      backlog.latest_result_status = "INCOMPLETE";
      await backlog.save({ session });

      await auditLogService.logAudit(
        {
          collegeId: backlog.college_id,
          userId: actorId,
          userEmail: request?.user?.email || "system",
          userRole: actorRole,
          action: "BACKLOG_ATTEMPT_CREATED",
          resourceType: "BacklogAttempt",
          resourceId: attemptDoc._id,
          ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
          userAgent: request?.get?.("user-agent"),
          endpoint: request?.originalUrl,
          method: request?.method || "POST",
          statusCode: 201,
          metadata: {
            backlogId: backlog._id,
            studentId: backlog.student_id,
            subjectId: backlog.subject_id,
            subjectCode: backlog.subject_code,
            subjectName: backlog.subject_name,
            attemptNumber: currentAttemptNumber,
            examId: exam._id,
            examType: EXAM_TYPE.SUPPLEMENTARY,
            previousStatus: BACKLOG_STATUS.OPEN,
            newStatus: BACKLOG_STATUS.ATTEMPTED,
          },
        },
        { session },
      );

      result = {
        attempt: attemptDoc,
        isIdempotent: false,
        exam,
        backlog,
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
};

const evaluateAttempt = async ({
  attemptId,
  collegeId,
  actorId,
  actorRole,
  request,
}) => {
  assertRole("EVALUATE_ATTEMPT", actorRole);
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const attempt = await BacklogAttempt.findById(attemptId)
        .session(session)
        .exec();

      if (!attempt) {
        throw new AppError(
          "Backlog attempt not found",
          404,
          "BACKLOG_ATTEMPT_NOT_FOUND",
        );
      }

      if (attempt.result_status !== "INCOMPLETE") {
        result = {
          attempt,
          isIdempotent: true,
          backlogCleared: attempt.cleared,
        };
        return;
      }

      const backlog = await getBacklog(attempt.backlog_id, collegeId, session);
      const student = await getStudent(
        attempt.student_id,
        collegeId,
        session,
      );

      const { exam } = await resolveExamSubjectConfig(
        attempt.exam_id,
        attempt.subject_id,
        collegeId,
        session,
      );

      const hasMarks = await hasMarksForExam(
        attempt.exam_id,
        attempt.student_id,
        collegeId,
        session,
      );

      const examSubjectConfig = exam.subjects.find(
        (s) => String(s.subject) === String(attempt.subject_id),
      );

      let calculation = {
        status: "INCOMPLETE",
        passed: false,
        internalMarks: null,
        externalMarks: null,
        totalMarks: null,
        internalPassed: null,
        externalPassed: null,
      };

      if (hasMarks) {
        const marksRecord = await StudentMarks.findOne({
          college_id: collegeId,
          exam_id: attempt.exam_id,
          subject_id: attempt.subject_id,
          student_id: attempt.student_id,
        })
          .session(session)
          .exec();

        calculation = calculateSubjectResult(examSubjectConfig, {
          internalMarks: marksRecord?.internalMarks,
          externalMarks: marksRecord?.externalMarks,
        });
      }

      const resultStatus = calculation.status;
      const passed = calculation.passed;

      attempt.result_status = resultStatus;
      attempt.passed = passed;
      attempt.evaluated_at = new Date();
      attempt.evaluated_by = actorId;
      attempt.internal_marks = calculation.internalMarks;
      attempt.external_marks = calculation.externalMarks;
      attempt.total_marks = calculation.totalMarks;

      const existingSemesterResult = await SemesterResult.findOne({
        college_id: collegeId,
        student_id: attempt.student_id,
        exam_id: attempt.exam_id,
      })
        .session(session)
        .exec();

      if (!existingSemesterResult) {
        const semesterResultData = {
          college_id: collegeId,
          student_id: attempt.student_id,
          exam_id: attempt.exam_id,
          course_id: attempt.course_id,
          semester: backlog.semester,
          academicYear: backlog.academicYear,
          subjects: [
            {
              subject: attempt.subject_id,
              subjectName: attempt.subject_name,
              subjectCode: attempt.subject_code,
              subjectType: examSubjectConfig?.subjectType || "THEORY",
              internalMarks: calculation.internalMarks,
              externalMarks: calculation.externalMarks,
              totalMarks: calculation.totalMarks,
              internalPassed: calculation.internalPassed,
              externalPassed: calculation.externalPassed,
              passed: calculation.passed,
              status: resultStatus,
              marksRecorded: hasMarks,
            },
          ],
          totalSubjects: 1,
          passedSubjects: resultStatus === "PASS" ? 1 : 0,
          failedSubjects: resultStatus === "FAIL" ? 1 : 0,
          incompleteSubjects: resultStatus === "INCOMPLETE" ? 1 : 0,
          overallResult: resultStatus,
          status: RESULT_STATUS.PUBLISHED,
          createdBy: actorId,
          updatedBy: actorId,
          calculatedAt: new Date(),
        };

        await SemesterResult.create([semesterResultData], { session });
        attempt.result_id = semesterResultData._id
          ? semesterResultData._id
          : null;
      } else {
        attempt.result_id = existingSemesterResult._id;
      }

      let cleared = false;

      if (resultStatus === "PASS") {
        cleared = true;
        attempt.cleared = true;
        attempt.cleared_at = new Date();
        attempt.cleared_by = actorId;

        backlog.status = BACKLOG_STATUS.CLEARED;
        backlog.latest_result_status = "PASS";
        backlog.cleared_at = new Date();
        backlog.cleared_by = actorId;
        await backlog.save({ session });

        await auditLogService.logAudit(
          {
            collegeId: backlog.college_id,
            userId: actorId,
            userEmail: request?.user?.email || "system",
            userRole: actorRole,
            action: "BACKLOG_CLEARED",
            resourceType: "Backlog",
            resourceId: backlog._id,
            ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
            userAgent: request?.get?.("user-agent"),
            endpoint: request?.originalUrl,
            method: request?.method || "POST",
            statusCode: 200,
            metadata: {
              backlogId: backlog._id,
              studentId: backlog.student_id,
              subjectId: backlog.subject_id,
              subjectCode: backlog.subject_code,
              subjectName: backlog.subject_name,
              attemptId: attempt._id,
              attemptNumber: attempt.attempt_number,
              resultStatus: "PASS",
              clearedBy: actorId,
              clearedAt: attempt.cleared_at,
              previousStatus: BACKLOG_STATUS.ATTEMPTED,
              newStatus: BACKLOG_STATUS.CLEARED,
            },
          },
          { session },
        );
      } else if (resultStatus === "FAIL") {
        backlog.status = BACKLOG_STATUS.OPEN;
        backlog.latest_result_status = "FAIL";
        await backlog.save({ session });

        await auditLogService.logAudit(
          {
            collegeId: backlog.college_id,
            userId: actorId,
            userEmail: request?.user?.email || "system",
            userRole: actorRole,
            action: "BACKLOG_ATTEMPT_FAILED",
            resourceType: "BacklogAttempt",
            resourceId: attempt._id,
            ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
            userAgent: request?.get?.("user-agent"),
            endpoint: request?.originalUrl,
            method: request?.method || "POST",
            statusCode: 200,
            metadata: {
              backlogId: backlog._id,
              studentId: backlog.student_id,
              subjectId: backlog.subject_id,
              attemptId: attempt._id,
              attemptNumber: attempt.attempt_number,
              resultStatus: "FAIL",
              previousStatus: BACKLOG_STATUS.ATTEMPTED,
              newStatus: BACKLOG_STATUS.OPEN,
            },
          },
          { session },
        );
      } else {
        await auditLogService.logAudit(
          {
            collegeId: backlog.college_id,
            userId: actorId,
            userEmail: request?.user?.email || "system",
            userRole: actorRole,
            action: "BACKLOG_ATTEMPT_EVALUATED",
            resourceType: "BacklogAttempt",
            resourceId: attempt._id,
            ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
            userAgent: request?.get?.("user-agent"),
            endpoint: request?.originalUrl,
            method: request?.method || "POST",
            statusCode: 200,
            metadata: {
              backlogId: backlog._id,
              studentId: backlog.student_id,
              subjectId: backlog.subject_id,
              attemptId: attempt._id,
              attemptNumber: attempt.attempt_number,
              resultStatus: "INCOMPLETE",
              previousStatus: BACKLOG_STATUS.ATTEMPTED,
              newStatus: BACKLOG_STATUS.ATTEMPTED,
            },
          },
          { session },
        );
      }

      await attempt.save({ session });

      const studentUser = student.user_id;
      if (studentUser) {
        try {
          const notificationTitle =
            resultStatus === "PASS"
              ? "Backlog Cleared"
              : resultStatus === "FAIL"
                ? "Backlog Attempt Failed"
                : "Backlog Attempt Incomplete";
          const notificationMessage =
            resultStatus === "PASS"
              ? `Your backlog for ${backlog.subject_code || backlog.subject_name} has been cleared.`
              : resultStatus === "FAIL"
                ? `Your supplementary attempt for ${backlog.subject_code || backlog.subject_name} was not successful. The backlog remains open.`
                : `Your supplementary attempt for ${backlog.subject_code || backlog.subject_name} is incomplete. Please complete all marks before retrying.`;

          await Notification.create(
            {
              college_id: backlog.college_id,
              createdBy: actorId,
              createdByRole: actorRole,
              target: "INDIVIDUAL",
              target_users: [studentUser],
              title: notificationTitle,
              message: notificationMessage,
              type: "ACADEMIC",
              priority: resultStatus === "PASS" ? "HIGH" : "NORMAL",
              actionUrl: "/student/dashboard",
            },
            { session },
          );
        } catch (err) {
          // Notification failure must not corrupt backlog transaction
          console.error("Notification failed:", err.message);
        }
      }

      result = {
        attempt,
        backlog,
        isIdempotent: false,
        resultStatus,
        passed,
        backlogCleared: cleared,
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
};

const getAttempts = async (backlogId, collegeId) => {
  const backlog = await getBacklog(backlogId, collegeId);

  const attempts = await BacklogAttempt.find({
    backlog_id: backlogId,
    college_id: collegeId,
  })
    .sort({ attempt_number: 1 })
    .exec();

  return { backlog, attempts };
};

module.exports = {
  createAttempt,
  evaluateAttempt,
  getAttempts,
  EXAM_TYPE,
  BACKLOG_STATUS,
};
