const mongoose = require("mongoose");
const PromotionDecision = require("../models/promotionDecision.model");
const PromotionHistory = require("../models/promotionHistory.model");
const SemesterResult = require("../models/semesterResult.model");
const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const FeeStructure = require("../models/feeStructure.model");
const Course = require("../models/course.model");
const Backlog = require("../models/backlog.model");
const Notification = require("../models/notification.model");
const AuditLog = require("../models/auditLog.model");
const AppError = require("../utils/AppError");
const { RESULT_STATUS } = require("../utils/constants");
const {
  academicYearRepresentations,
} = require("../utils/academicYear.util");
const { PROMOTION_WORKFLOW_ROLES } = require("./promotionWorkflow.service");
const { calculateKTCount, isWithinKTLimit } = require("./atkt.service");
const {
  resolveKTLimitForSemester,
  resolveSubjectTypeLimits,
  requiresPreviousYearClearance,
  resolveMinimumFeePaidPercentage,
  resolveAuthoritativePolicy,
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
  normalizeKtRules,
} = require("../utils/promotionPolicy.util");
const { calculatePreviousAcademicYear } = require("./promotionDecision.service");
const {
  calculateFeeClearanceData,
  evaluateAttendanceData,
} = require("./promotionDecision.service");
const { getAttendanceDataForStudents } = require("./attendance.service");
const { createBacklogsForPromotionDecision } = require("./backlog.service");
const {
  checkTimetableAvailabilityAfterPromotion,
} = require("./promotionTimetable.service");
const { normalizeAcademicYear } = require("./studentFee.service");
const logger = require("../utils/logger");

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


// The decision's top-level course_id is the authoritative course context.
// The snapshot course_id is used only as a fallback for records created
// before the field existed.
const resolveDecisionCourseId = (decision) =>
  decision?.course_id || decision?.policy_snapshot?.course_id || null;

/**
 * Resolve the policy that currently applies to a decision's course.
 * Order: course-specific -> college-level (course_id: null) -> global defaults.
 * Never resolves a policy belonging to a different course.
 */
const getCurrentPolicy = async (collegeId, courseId, session) => {
  return resolveAuthoritativePolicy(collegeId, courseId, session);
};

const loadAuthoritativeResult = async (decision, session) => {
  const academicYearReps = academicYearRepresentations(decision.academicYear);
  const results = await SemesterResult.find({
    _id: decision.source_result_id,
    college_id: decision.college_id,
    student_id: decision.student_id,
    course_id: decision.course_id,
    semester: decision.semester,
    academicYear: academicYearReps
      ? { $in: academicYearReps }
      : decision.academicYear,
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
    student.currentAcademicYear !== decision.academicYear ||
    !["APPROVED", "ENROLLED"].includes(student.status)
  ) {
    throw new AppError(
      "Student academic state no longer matches the approved decision.",
      409,
      "STUDENT_STATE_CHANGED",
    );
  }

  // ── Rule 1: Reuse modal eligibility result if under 60 seconds old AND live checks pass
  const decisionAgeMs = Date.now() - new Date(decision.updatedAt || decision.createdAt).getTime();
  const isRecentUnder60s = decisionAgeMs <= 60000 && decision.workflow_status !== "REJECTED";

  let fastPathEligible = false;
  let policy = null;
  let currentFee = null;

  if (isRecentUnder60s) {
    const [existingPromo, feeDoc, currentPolicy, authoritativeResult] =
      await Promise.all([
        PromotionHistory.exists({
          student_id: student._id,
          fromSemester: decision.semester,
        }).session(session),
        StudentFee.findOne({
          student_id: student._id,
          college_id: decision.college_id,
        })
          .select("totalFee paidAmount installments")
          .session(session)
          .lean(),
        getCurrentPolicy(
          decision.college_id,
          resolveDecisionCourseId(decision),
          session,
        ),
        loadAuthoritativeResult(decision, session),
      ]);

    const feeUnchanged = Boolean(
      feeDoc &&
        feeDoc.totalFee === decision.fee_clearance_snapshot?.totalFee &&
        feeDoc.paidAmount === decision.fee_clearance_snapshot?.paidAmount,
    );

    const policyUnchanged = Boolean(
      currentPolicy &&
        currentPolicy.policyVersion === decision.policy_version &&
        currentPolicy.minAttendancePercentage ===
          decision.policy_snapshot?.minAttendancePercentage &&
        currentPolicy.maxAllowedKTs ===
          decision.policy_snapshot?.maxAllowedKTs,
    );

    if (!existingPromo && feeUnchanged && policyUnchanged) {
      // Fast path: Reuse modal eligibility result without running heavy multi-table attendance aggregations
      return {
        result: authoritativeResult,
        policy: currentPolicy,
        attendance: decision.attendance_snapshot,
        fee: feeDoc,
        feeClearance: decision.fee_clearance_snapshot,
      };
    }

    currentFee = feeDoc;
    policy = currentPolicy;
  }

  // Fallback to full evaluation if > 60s or any live check failed
  const attendancePromise = getAttendanceDataForStudents([student], decision.college_id);

  const result = await loadAuthoritativeResult(decision, session);
  policy = await getCurrentPolicy(
    decision.college_id,
    resolveDecisionCourseId(decision),
    session,
  );
  const policySnapshot = decision.policy_snapshot;
  const currentKtRules = policy.ktRules || [];
  const snapshotKtRules = policySnapshot.ktRules || [];
  if (
    policy.minAttendancePercentage !== policySnapshot.minAttendancePercentage ||
    policy.maxAllowedKTs !== policySnapshot.maxAllowedKTs ||
    // Resolved on both sides so a snapshot stored before this field existed
    // compares against the previous full-clearance requirement instead of
    // being treated as stale.
    policy.minimumFeePaidPercentage !==
      resolveMinimumFeePaidPercentage(policySnapshot) ||
    JSON.stringify(normalizeKtRules(currentKtRules)) !==
      JSON.stringify(normalizeKtRules(snapshotKtRules))
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
      : result.overallResult === "FAIL" && isWithinKTLimit(kt.ktCount, policy, decision.semester)
        ? "ATKT"
        : result.overallResult;
  if (expectedOutcome !== decision.promotion_outcome) {
    throw new AppError(
      "The current result outcome no longer matches the approved decision.",
      409,
      "STALE_DECISION",
    );
  }

  // Revalidate semester-specific KT limit using current active policy
  const resolvedMaxAllowedKTs = resolveKTLimitForSemester(policy, decision.semester);
  if (kt.ktCount > resolvedMaxAllowedKTs) {
    throw new AppError(
      `KT count ${kt.ktCount} exceeds the current semester-specific limit of ${resolvedMaxAllowedKTs}.`,
      409,
      "KT_LIMIT_EXCEEDED",
    );
  }

  // Revalidate subject-type KT limits using current active policy
  const subjectTypeLimits = resolveSubjectTypeLimits(policy, decision.semester);
  if (subjectTypeLimits && kt.ktCountByType) {
    for (const [type, limit] of Object.entries(subjectTypeLimits)) {
      if (typeof limit === "number" && kt.ktCountByType[type] > limit) {
        throw new AppError(
          `${type} KT count ${kt.ktCountByType[type]} exceeds the current subject-type limit of ${limit}.`,
          409,
          "SUBJECT_TYPE_KT_LIMIT_EXCEEDED",
        );
      }
    }
  }

  // Revalidate previous-year clearance if required by current policy
  const previousYearClearanceRequired = requiresPreviousYearClearance(policy, decision.semester);
  if (previousYearClearanceRequired) {
    const previousAcademicYear = calculatePreviousAcademicYear(student.currentAcademicYear);
    if (previousAcademicYear) {
      const unclearedBacklogs = await Backlog.find({
        student_id: student._id,
        college_id: decision.college_id,
        academicYear: previousAcademicYear,
        status: { $ne: "CLEARED" },
      }).session(session).lean();

      if (unclearedBacklogs.length > 0) {
        throw new AppError(
          "Previous-year backlogs are not fully cleared.",
          409,
          "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED",
        );
      }
    }
  }

  const [attendanceDataRaw, fee] = await Promise.all([
    attendancePromise,
    StudentFee.findOne({
      student_id: decision.student_id,
      college_id: decision.college_id,
    })
      .select("totalFee paidAmount installments")
      .session(session)
      .exec(),
  ]);

  const attendanceData = (attendanceDataRaw || [])[0];
  const attendance = evaluateAttendanceData({
    attendanceData,
    requiredPercentage: policy.minAttendancePercentage,
  });
  const feeClearance = calculateFeeClearanceData(
    fee,
    false,
    policy.minimumFeePaidPercentage ?? DEFAULT_MIN_FEE_PAID_PERCENTAGE,
  );
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

/**
 * Attempt to find a matching FeeStructure and create a new StudentFee record
 * for the student's new semester/academic year, inside the promotion transaction.
 *
 * Lookup order (mirrors the legacy assignFeeAfterPromotion helper):
 *   1. college + course + category + academicYear  (year-specific, preferred)
 *   2. college + course + category                 (generic fallback)
 *
 * Returns:
 *   { newFeeAssigned, newFeeStructureId, newStudentFeeId, feeAssignmentWarning }
 *
 * The operation is intentionally non-fatal: when no FeeStructure is found the
 * promotion still succeeds and a warning is stored in PromotionHistory so
 * administrators can assign fees manually.  Any unexpected DB error IS re-thrown
 * so the outer transaction can roll back cleanly.
 */
/**
 * Never creates a new StudentFee on promotion.
 * Authoritative Business Rule: A fee structure applies for the ENTIRE duration
 * of the course (e.g. 3 years / 6 semesters). Promotion (semester change, year change, any)
 * must NEVER create a new StudentFee or new installments. One StudentFee per student per course.
 */
const assignNewSemesterFee = async () => {
  return {
    newFeeAssigned: false,
    newFeeStructureId: null,
    newStudentFeeId: null,
    feeAssignmentWarning: null,
    reason: "Course fee applies for entire duration; no new fee created on promotion",
  };
};

const createExecutionAudit = async ({
  decision,
  actorId,
  actorRole,
  fromSemester,
  toSemester,
  promotionDate,
  preEncryptedAudit,
  isDirectAutoConfirmation,
  session,
}) => {
  const transitions = isDirectAutoConfirmation
    ? [
        {
          action: "RECOMMEND",
          actorId,
          actorRole,
          timestamp: decision.recommendation?.at || promotionDate,
          comment: "Auto-recommended as part of direct promotion confirmation",
        },
        {
          action: "APPROVE",
          actorId,
          actorRole,
          timestamp: decision.approval?.at || promotionDate,
          comment: "Auto-approved as part of direct promotion confirmation",
        },
        {
          action: "EXECUTE",
          actorId,
          actorRole,
          timestamp: promotionDate,
          comment: "Promotion executed",
        },
      ]
    : [
        {
          action: "RECOMMEND",
          actorId: decision.recommendation?.user_id || actorId,
          timestamp: decision.recommendation?.at || promotionDate,
          comment: decision.recommendation?.comment || null,
        },
        {
          action: "APPROVE",
          actorId: decision.approval?.user_id || actorId,
          timestamp: decision.approval?.at || promotionDate,
          comment: decision.approval?.comment || null,
        },
        {
          action: "EXECUTE",
          actorId,
          actorRole,
          timestamp: promotionDate,
          comment: "Promotion executed",
        },
      ];

  await AuditLog.create(
    [
      {
        collegeId: decision.college_id,
        userId: actorId,
        userRole: actorRole,
        action: "PROMOTION_EXECUTED",
        resourceType: "PromotionDecision",
        resourceId: decision._id,
        ipAddress: preEncryptedAudit.ipAddress,
        userAgent: preEncryptedAudit.userAgent,
        endpoint: preEncryptedAudit.endpoint,
        userEmail: preEncryptedAudit.userEmail,
        method: "POST",
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
          transitions,
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
  isDirectAutoConfirmation = false,
}) => {
  assertExecutionRole(actorRole);

  // Pre-encrypt sensitive audit fields BEFORE opening the database transaction lock
  // to eliminate heavy PBKDF2 crypto overhead during the transaction.
  const rawIp = request?.ip || request?.socket?.remoteAddress || "127.0.0.1";
  const rawUserAgent = request?.get?.("user-agent") || "";
  const rawEndpoint = request?.originalUrl || "/api/v1/promotions/execute";
  const rawUserEmail = request?.user?.email || "";

  const preEncryptedAudit = {
    ipAddress: AuditLog.encryptField(rawIp),
    userAgent: rawUserAgent ? AuditLog.encryptField(rawUserAgent) : undefined,
    endpoint: rawEndpoint ? AuditLog.encryptField(rawEndpoint) : undefined,
    userEmail: rawUserEmail ? AuditLog.encryptField(rawUserEmail) : undefined,
  };

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
      if (isDirectAutoConfirmation) {
        if (decision.workflow_status === "REJECTED") {
          throw new AppError(
            "A rejected promotion decision cannot be executed.",
            409,
            "PROMOTION_REJECTED",
          );
        }
        if (
          !["DRAFT", "RECOMMENDED", "UNDER_REVIEW", "APPROVED"].includes(
            decision.workflow_status,
          )
        ) {
          throw new AppError(
            `Promotion decision in status "${decision.workflow_status}" cannot be executed.`,
            409,
            "PROMOTION_NOT_APPROVABLE",
          );
        }
      }

      const allowedStatuses = isDirectAutoConfirmation
        ? ["DRAFT", "RECOMMENDED", "UNDER_REVIEW", "APPROVED"]
        : ["APPROVED"];

      if (!allowedStatuses.includes(decision.workflow_status)) {
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

      const [student, course] = await Promise.all([
        Student.findOne({
          _id: decision.student_id,
          college_id: decision.college_id,
          course_id: decision.course_id,
          status: { $in: ["APPROVED", "ENROLLED"] },
        }).session(session),
        Course.findById(decision.course_id)
          .select("durationSemesters")
          .session(session),
      ]);
      if (!student) {
        throw new AppError(
          "Student not found in the decision college.",
          404,
          "STUDENT_STATE_CHANGED",
        );
      }

      const current = await revalidateDecision({ decision, student, session });
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

      // Assign new-semester fee structure inside the transaction so that any
      // DB error rolls back the full promotion atomically.
      const feeAssignment = await assignNewSemesterFee({
        student,
        decision,
        fromAcademicYear: decision.academicYear || student.currentAcademicYear,
        newAcademicYear,
        session,
      });

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
            // Fee assignment for the next semester
            newFeeAssigned: feeAssignment.newFeeAssigned,
            newFeeStructureId: feeAssignment.newFeeStructureId,
            newStudentFeeId: feeAssignment.newStudentFeeId,
            feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
          },
        ],
        { session },
      );
      const promotionHistory = history[0];

      // Atomic single update for student: sets new semester/year/academic year and
      // pushes promotion history in one DB trip instead of two sequential writes.
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
          $push: { promotionHistory: promotionHistory._id },
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

      const historyEntries = [];
      const updateSet = {
        workflow_status: "PROMOTED",
        promotedAt: promotionDate,
        promotedBy: actorId,
        executionAt: promotionDate,
        executionBy: actorId,
        promotion_history_id: promotionHistory._id,
        backlog_ids: backlogs.map((backlog) => backlog._id),
      };

      if (isDirectAutoConfirmation) {
        if (decision.workflow_status === "DRAFT") {
          updateSet.recommendation = {
            user_id: actorId,
            at: promotionDate,
            comment: "Auto-recommended as part of direct promotion confirmation",
          };
          historyEntries.push({
            action: "RECOMMEND",
            performedBy: actorId,
            performedAt: promotionDate,
            previousStatus: "DRAFT",
            newStatus: "RECOMMENDED",
            comment: "Auto-recommended as part of direct promotion confirmation",
          });
        }
        if (
          ["DRAFT", "RECOMMENDED", "UNDER_REVIEW"].includes(
            decision.workflow_status,
          )
        ) {
          updateSet.approval = {
            user_id: actorId,
            at: promotionDate,
            comment: "Auto-approved as part of direct promotion confirmation",
          };
          historyEntries.push({
            action: "APPROVE",
            performedBy: actorId,
            performedAt: promotionDate,
            previousStatus:
              decision.workflow_status === "DRAFT"
                ? "RECOMMENDED"
                : decision.workflow_status,
            newStatus: "APPROVED",
            comment: "Auto-approved as part of direct promotion confirmation",
          });
        }
      }

      historyEntries.push({
        action: "APPROVE",
        performedBy: actorId,
        performedAt: promotionDate,
        previousStatus: "APPROVED",
        newStatus: "PROMOTED",
        comment: "Promotion executed",
      });

      const promotedDecision = await PromotionDecision.findOneAndUpdate(
        {
          _id: decision._id,
          college_id: decision.college_id,
          workflow_status: { $in: allowedStatuses },
        },
        {
          $set: updateSet,
          $push: {
            workflow_history: { $each: historyEntries },
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

      await createExecutionAudit({
        decision: promotedDecision,
        actorId,
        actorRole,
        fromSemester,
        toSemester,
        promotionDate,
        preEncryptedAudit,
        isDirectAutoConfirmation,
        session,
      });

      student.currentSemester = toSemester;
      student.currentYear = Math.ceil(toSemester / 2);
      student.currentAcademicYear = newAcademicYear;
      student.lastPromotionDate = promotionDate;
      if (Array.isArray(student.promotionHistory)) {
        student.promotionHistory.push(promotionHistory._id);
      }

      result = {
        decision: promotedDecision,
        student,
        promotionHistory,
        previousSemester: fromSemester,
        newSemester: toSemester,
        promotionOutcome: decision.promotion_outcome,
        ktCount: decision.kt_count,
        executionStatus: "PROMOTED",
        idempotent: false,
        newFeeAssigned: feeAssignment.newFeeAssigned,
        newFeeStructureId: feeAssignment.newFeeStructureId,
        newStudentFeeId: feeAssignment.newStudentFeeId,
        feeAssignmentWarning: feeAssignment.feeAssignmentWarning,
      };
      shouldNotify = true;
    });

    if (shouldNotify && result?.student) {
      sendPromotionNotification({
        student: result.student,
        decision: result.decision,
        actorId,
        actorRole,
        toSemester: result.newSemester,
        newAcademicYear: result.student.currentAcademicYear,
      }).catch((err) => {
        logger.logError("[EXECUTE_PROMOTION] Promotion notification failed", {
          error: err?.message,
        });
      });

      // Issue #533: Non-blocking timetable availability check & HOD notification
      checkTimetableAvailabilityAfterPromotion({
        student: result.student,
        actorId,
        actorRole,
        collegeId: result.decision.college_id,
        toSemester: result.newSemester,
        newAcademicYear: result.student.currentAcademicYear,
      }).catch((err) => {
        logger.logError(
          "[EXECUTE_PROMOTION] Timetable availability check failed",
          { error: err?.message },
        );
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
  assignNewSemesterFee,
};
