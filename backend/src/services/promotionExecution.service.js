const mongoose = require("mongoose");
const PromotionDecision = require("../models/promotionDecision.model");
const PromotionHistory = require("../models/promotionHistory.model");
const SemesterResult = require("../models/semesterResult.model");
const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const Course = require("../models/course.model");
const PromotionPolicy = require("../models/promotionPolicy.model");
const Backlog = require("../models/backlog.model");
const Notification = require("../models/notification.model");
const AuditLog = require("../models/auditLog.model");
const AppError = require("../utils/AppError");
const { ROLE, RESULT_STATUS } = require("../utils/constants");
const { PROMOTION_WORKFLOW_ROLES } = require("./promotionWorkflow.service");
const { calculateKTCount, isWithinKTLimit } = require("./atkt.service");
const { resolveMaxAllowedKTs } = require("../utils/promotionPolicy.util");
const {
  calculateFeeClearanceData,
  evaluateAttendanceData,
} = require("./promotionDecision.service");
const { getAttendanceDataForStudents } = require("./attendance.service");
const { createBacklogsForPromotionDecision } = require("./backlog.service");

const assertExecutionRole = (actorRole) => {
  const normalizedRole = String(actorRole || "").toUpperCase();
  if (!PROMOTION_WORKFLOW_ROLES.APPROVE.includes(normalizedRole)) {
    throw new AppError(
      `Role ${actorRole || "UNKNOWN"} cannot execute promotion decisions.`,
      403,
      "PROMOTION_EXECUTION_FORBIDDEN",
    );
  }
};

const getDecision = async ({ decisionId, collegeId, session }) => {
  const decision = await PromotionDecision.findOne({
    _id: decisionId,
    college_id: collegeId,
  })
    .session(session)
    .exec();
  if (!decision) {
    throw new AppError("Promotion decision not found", 404, "NO_DECISION");
  }
  return decision;
};

const getExistingPromotion = async (decision, session) => {
  const history = await PromotionHistory.findOne({
    promotion_decision_id: decision._id,
  })
    .session(session)
    .exec();
  const student = await Student.findById(decision.student_id)
    .session(session)
    .exec();
  return {
    decision,
    student,
    promotionHistory: history,
    idempotent: true,
    executionStatus: "ALREADY_PROMOTED",
  };
};

const sameIds = (left = [], right = []) => {
  const normalize = (values) => values.map(String).sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const getCurrentPolicy = async (collegeId, session) => {
  const policy = await PromotionPolicy.findOne({
    collegeId,
    isActive: true,
  })
    .session(session)
    .exec();
  return {
    minAttendancePercentage: policy?.minAttendancePercentage ?? 75,
    maxAllowedKTs: resolveMaxAllowedKTs(policy),
  };
};

const loadAuthoritativeResult = async (decision, session) => {
  const results = await SemesterResult.find({
    _id: decision.source_result_id,
    college_id: decision.college_id,
    student_id: decision.student_id,
    course_id: decision.course_id,
    semester: decision.semester,
    academicYear: decision.academicYear,
    status: RESULT_STATUS.PUBLISHED,
  })
    .limit(2)
    .session(session)
    .exec();
  if (results.length !== 1) {
    throw new AppError(
      "The approved decision no longer has exactly one authoritative published result.",
      409,
      "STALE_DECISION",
    );
  }
  return results[0];
};

const revalidateDecision = async ({ decision, student, session }) => {
  if (
    student.currentSemester !== decision.semester ||
    student.currentAcademicYear !== decision.academicYear
  ) {
    throw new AppError(
      "Student academic state no longer matches the approved decision.",
      409,
      "STUDENT_STATE_CHANGED",
    );
  }

  const result = await loadAuthoritativeResult(decision, session);
  const policy = await getCurrentPolicy(decision.college_id, session);
  if (
    policy.minAttendancePercentage !==
      decision.policy_snapshot.minAttendancePercentage ||
    policy.maxAllowedKTs !== decision.policy_snapshot.maxAllowedKTs
  ) {
    throw new AppError(
      "The promotion policy changed after approval.",
      409,
      "STALE_DECISION",
    );
  }

  const kt = calculateKTCount(result);
  if (
    kt.ktCount !== decision.kt_count ||
    !sameIds(kt.failedSubjectIds, decision.failed_subject_ids)
  ) {
    throw new AppError(
      "The authoritative result no longer matches the approved decision.",
      409,
      "STALE_DECISION",
    );
  }

  const expectedOutcome =
    result.overallResult === "PASS"
      ? "PASS"
      : result.overallResult === "FAIL" && isWithinKTLimit(kt.ktCount, policy)
        ? "ATKT"
        : result.overallResult;
  if (expectedOutcome !== decision.promotion_outcome) {
    throw new AppError(
      "The current result outcome no longer matches the approved decision.",
      409,
      "STALE_DECISION",
    );
  }

  const attendanceData = (
    await getAttendanceDataForStudents([student], decision.college_id)
  )[0];
  const attendance = evaluateAttendanceData({
    attendanceData,
    requiredPercentage: policy.minAttendancePercentage,
  });
  const fee = await StudentFee.findOne({
    student_id: decision.student_id,
    college_id: decision.college_id,
  })
    .select("totalFee paidAmount installments")
    .session(session)
    .exec();
  const feeClearance = calculateFeeClearanceData(fee);
  if (
    attendance.status !== decision.attendance_snapshot.status ||
    attendance.passed !== decision.attendance_snapshot.passed ||
    feeClearance.status !== decision.fee_clearance_snapshot.status ||
    feeClearance.passed !== decision.fee_clearance_snapshot.passed
  ) {
    throw new AppError(
      "Attendance or fee clearance no longer matches the approved decision.",
      409,
      "STALE_DECISION",
    );
  }
  if (!attendance.passed || !feeClearance.passed) {
    throw new AppError(
      "Current attendance or fee clearance does not permit promotion.",
      409,
      "PROMOTION_NOT_ELIGIBLE",
    );
  }

  return { result, policy, attendance, fee, feeClearance };
};

const calculateNextAcademicYear = (semester, academicYear) => {
  const [yearStart] = String(academicYear).split("-").map(Number);
  const nextYearStart = semester % 2 === 0 ? yearStart + 1 : yearStart;
  return `${nextYearStart}-${nextYearStart + 1}`;
};

const createExecutionAudit = async ({
  decision,
  actorId,
  actorRole,
  request,
  fromSemester,
  toSemester,
  session,
}) => {
  await AuditLog.create(
    [
      {
        collegeId: decision.college_id,
        userId: actorId,
        userRole: actorRole,
        action: "PROMOTION_EXECUTED",
        resourceType: "PromotionDecision",
        resourceId: decision._id,
        ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
        userAgent: request?.get?.("user-agent"),
        endpoint: request?.originalUrl,
        method: request?.method || "POST",
        statusCode: 200,
        metadata: {
          studentId: decision.student_id,
          promotionDecisionId: decision._id,
          sourceResultId: decision.source_result_id,
          outcome: decision.promotion_outcome,
          ktCount: decision.kt_count,
          fromSemester,
          toSemester,
          actorId,
        },
      },
    ],
    { session },
  );
};

const sendPromotionNotification = async ({
  student,
  decision,
  actorId,
  actorRole,
  toSemester,
  newAcademicYear,
}) => {
  if (!student.user_id) return null;
  try {
    return await Notification.findOneAndUpdate(
      {
        promotionDecisionId: decision._id,
        target_users: student.user_id,
      },
      {
        $setOnInsert: {
          promotionDecisionId: decision._id,
          college_id: decision.college_id,
          createdByRole: actorRole,
          createdBy: actorId,
          target: "INDIVIDUAL",
          target_users: [student.user_id],
          title: "Promotion Confirmed",
          message: `You have been promoted to Semester ${toSemester} (${newAcademicYear}).`,
          type: "ACADEMIC",
          priority: "HIGH",
          actionUrl: "/student/dashboard",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  } catch (error) {
    // Notification delivery is outside the transaction by design.
    return null;
  }
};

const executePromotion = async ({
  decisionId,
  collegeId,
  actorId,
  actorRole,
  actorName = "Admin",
  request,
}) => {
  assertExecutionRole(actorRole);
  const session = await mongoose.startSession();
  let result;
  let shouldNotify = false;

  try {
    await session.withTransaction(async () => {
      const decision = await getDecision({ decisionId, collegeId, session });
      if (decision.workflow_status === "PROMOTED") {
        result = await getExistingPromotion(decision, session);
        return;
      }
      if (decision.workflow_status !== "APPROVED") {
        throw new AppError(
          "Only an approved promotion decision can be executed.",
          409,
          "PROMOTION_NOT_APPROVED",
        );
      }
      if (!["PASS", "ATKT"].includes(decision.promotion_outcome)) {
        throw new AppError(
          `Promotion outcome ${decision.promotion_outcome} cannot be executed.`,
          409,
          "PROMOTION_NOT_ELIGIBLE",
        );
      }

      const student = await Student.findOne({
        _id: decision.student_id,
        college_id: decision.college_id,
        course_id: decision.course_id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }).session(session);
      if (!student) {
        throw new AppError(
          "Student not found in the decision college.",
          404,
          "STUDENT_STATE_CHANGED",
        );
      }

      const current = await revalidateDecision({ decision, student, session });
      const course = await Course.findById(decision.course_id)
        .select("durationSemesters")
        .session(session);
      const maxSemester = course?.durationSemesters || 8;
      if (student.currentSemester >= maxSemester) {
        throw new AppError(
          "Final-semester promotion requires a separate business decision.",
          409,
          "FINAL_SEMESTER_PROMOTION_NOT_SUPPORTED",
        );
      }
      const fromSemester = student.currentSemester;
      const toSemester = fromSemester + 1;
      const newAcademicYear = calculateNextAcademicYear(
        fromSemester,
        student.currentAcademicYear,
      );

      let backlogs = [];
      if (decision.promotion_outcome === "ATKT") {
        backlogs = await createBacklogsForPromotionDecision(decision, {
          session,
        });
        if (backlogs.length !== decision.kt_count) {
          throw new AppError(
            "ATKT backlogs could not be verified for every failed subject.",
            409,
            "BACKLOGS_NOT_READY",
          );
        }
      }

      const promotionDate = new Date();
      const studentUpdate = await Student.updateOne(
        {
          _id: student._id,
          college_id: decision.college_id,
          currentSemester: decision.semester,
          currentAcademicYear: decision.academicYear,
        },
        {
          $set: {
            currentSemester: toSemester,
            currentYear: Math.ceil(toSemester / 2),
            currentAcademicYear: newAcademicYear,
            lastPromotionDate: promotionDate,
          },
        },
        { session },
      );
      if (studentUpdate.modifiedCount !== 1) {
        throw new AppError(
          "Student state changed before promotion could execute.",
          409,
          "STUDENT_STATE_CHANGED",
        );
      }

      const history = await PromotionHistory.create(
        [
          {
            student_id: student._id,
            college_id: decision.college_id,
            course_id: decision.course_id,
            fromSemester,
            toSemester,
            fromAcademicYear: decision.academicYear,
            toAcademicYear: newAcademicYear,
            feeStatus: current.feeClearance.status,
            totalFee: current.feeClearance.totalFee,
            paidAmount: current.feeClearance.paidAmount,
            pendingAmount: current.feeClearance.pendingAmount,
            attendancePercentage: current.attendance.percentage,
            attendanceStatus: current.attendance.status,
            attendanceCheckedAt: promotionDate,
            attendanceOverridden: false,
            attendanceOverrideReason: null,
            promotedBy: actorId,
            promotedByName: actorName,
            promotionDate,
            remarks: `Approved decision ${decision._id}`,
            promotion_decision_id: decision._id,
            source_result_id: current.result._id,
            promotionOutcome: decision.promotion_outcome,
            kt_count: decision.kt_count,
            failed_subject_ids: decision.failed_subject_ids,
            backlog_ids: backlogs.map((backlog) => backlog._id),
          },
        ],
        { session },
      );
      const promotionHistory = history[0];

      const promotedDecision = await PromotionDecision.findOneAndUpdate(
        {
          _id: decision._id,
          college_id: decision.college_id,
          workflow_status: "APPROVED",
        },
        {
          $set: {
            workflow_status: "PROMOTED",
            promotedAt: promotionDate,
            promotedBy: actorId,
            executionAt: promotionDate,
            executionBy: actorId,
            promotion_history_id: promotionHistory._id,
            backlog_ids: backlogs.map((backlog) => backlog._id),
          },
          $push: {
            workflow_history: {
              action: "APPROVE",
              performedBy: actorId,
              performedAt: promotionDate,
              previousStatus: "APPROVED",
              newStatus: "PROMOTED",
              comment: "Promotion executed",
            },
          },
        },
        { new: true, runValidators: true, session },
      );
      if (!promotedDecision) {
        throw new AppError(
          "Promotion decision was changed before execution completed.",
          409,
          "PROMOTION_EXECUTION_CONFLICT",
        );
      }

      await Student.updateOne(
        { _id: student._id, college_id: decision.college_id },
        { $push: { promotionHistory: promotionHistory._id } },
        { session },
      );
      await createExecutionAudit({
        decision: promotedDecision,
        actorId,
        actorRole,
        request,
        fromSemester,
        toSemester,
        session,
      });

      result = {
        decision: promotedDecision,
        student: await Student.findById(student._id).session(session),
        promotionHistory,
        previousSemester: fromSemester,
        newSemester: toSemester,
        promotionOutcome: decision.promotion_outcome,
        ktCount: decision.kt_count,
        executionStatus: "PROMOTED",
        idempotent: false,
      };
      shouldNotify = true;
    });

    if (shouldNotify && result?.student) {
      await sendPromotionNotification({
        student: result.student,
        decision: result.decision,
        actorId,
        actorRole,
        toSemester: result.newSemester,
        newAcademicYear: result.student.currentAcademicYear,
      });
    }
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  executePromotion,
  revalidateDecision,
  calculateNextAcademicYear,
};
