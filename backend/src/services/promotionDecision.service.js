const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const PromotionPolicy = require("../models/promotionPolicy.model");
const PromotionDecision = require("../models/promotionDecision.model");
const Backlog = require("../models/backlog.model");
const BacklogAttempt = require("../models/backlogAttempt.model");
const Exam = require("../models/exam.model");
const AppError = require("../utils/AppError");
const { evaluateAttempt } = require("./backlogAttempt.service");
const {
  resolveAuthoritativeResult,
  RESULT_AUTHORITY_STATUS,
} = require("./resultAuthority.service");
const { calculateKTCount, isWithinKTLimit } = require("./atkt.service");
const { getAttendanceDataForStudents } = require("./attendance.service");
const {
  DEFAULT_MAX_ALLOWED_KTS,
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
  resolveMaxAllowedKTs,
  resolveMinimumFeePaidPercentage,
  resolveKTLimitForSemester,
  requiresPreviousYearClearance,
} = require("../utils/promotionPolicy.util");

const DEFAULT_ATTENDANCE_THRESHOLD = 75;
const ATTENDANCE_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ATTENDANCE_NOT_AVAILABLE: "ATTENDANCE_NOT_AVAILABLE",
};

const calculatePreviousAcademicYear = (academicYear) => {
  if (!academicYear || typeof academicYear !== "string") return null;
  const parts = academicYear.split("-").map(Number);
  if (parts.length !== 2 || parts.some((p) => Number.isNaN(p))) return null;
  const [start, end] = parts;
  return `${start - 1}-${end - 1}`;
};

const resolvePromotionPolicy = async (collegeId, courseId) => {
  const policy = await PromotionPolicy.getActivePolicy(collegeId, courseId);
  const minAttendancePercentage =
    policy?.minAttendancePercentage ?? DEFAULT_ATTENDANCE_THRESHOLD;
  const maxAllowedKTs = resolveMaxAllowedKTs(policy);
  const minimumFeePaidPercentage = resolveMinimumFeePaidPercentage(policy);

  return {
    policyId: policy?._id || null,
    policyVersion: policy?.updatedAt?.toISOString() || "DEFAULT-v1",
    snapshot: {
      // Always the student's course context, even when the resolved policy
      // came from the college-level fallback.
      course_id: courseId || null,
      minAttendancePercentage,
      maxAllowedKTs,
      minimumFeePaidPercentage,
      scopedSemesters: policy?.scopedSemesters || [],
      ktRules: policy?.ktRules || [],
    },
  };
};

const evaluateAttendanceData = ({
  attendanceData,
  requiredPercentage = DEFAULT_ATTENDANCE_THRESHOLD,
  overrideAttendanceCheck = false,
  overrideAttendanceReason,
}) => {
  const isZeroRequirement = Number(requiredPercentage) === 0;
  const totalSessions = Number(attendanceData?.totalSessions || 0);
  const percentage = Number(attendanceData?.percentage || 0);
  const status =
    totalSessions === 0
      ? (
          isZeroRequirement
            ? ATTENDANCE_STATUS.ELIGIBLE
            : ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE
        )
      : percentage >= requiredPercentage
        ? ATTENDANCE_STATUS.ELIGIBLE
        : ATTENDANCE_STATUS.NOT_ELIGIBLE;

  if (overrideAttendanceCheck && status === ATTENDANCE_STATUS.NOT_ELIGIBLE) {
    throw new AppError(
      "Attendance override is not allowed when attendance is below the required threshold.",
      400,
      "ATTENDANCE_OVERRIDE_NOT_ALLOWED",
    );
  }

  const trimmedReason =
    typeof overrideAttendanceReason === "string"
      ? overrideAttendanceReason.trim()
      : "";
  const overridden = Boolean(
    overrideAttendanceCheck &&
    status === ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE,
  );

  if (overridden && trimmedReason.length < 10) {
    throw new AppError(
      "Attendance override reason is required and must be at least 10 characters.",
      400,
      "ATTENDANCE_OVERRIDE_REASON_REQUIRED",
    );
  }

  return {
    percentage,
    requiredPercentage,
    totalSessions,
    status,
    passed:
      isZeroRequirement ||
      status === ATTENDANCE_STATUS.ELIGIBLE ||
      overridden,
    overridden,
    overrideReason: overridden ? trimmedReason : null,
  };
};

const evaluateAttendance = async ({
  student,
  collegeId,
  requiredPercentage,
  overrideAttendanceCheck,
  overrideAttendanceReason,
}) => {
  const attendanceData = (
    await getAttendanceDataForStudents([student], collegeId)
  )[0];

  return evaluateAttendanceData({
    attendanceData,
    requiredPercentage,
    overrideAttendanceCheck,
    overrideAttendanceReason,
  });
};

/**
 * Derives the fee eligibility for a promotion decision from the authoritative
 * StudentFee record. Nothing is summed here — `paidAmount` and `totalFee` are
 * read straight from StudentFee, and the existing installment-derived clearance
 * is preserved as-is.
 *
 * `minimumFeePaidPercentage` is the policy-configurable minimum share of the
 * total fee that must be paid. It defaults to 100 so a caller that does not
 * pass a policy keeps the previous full-clearance requirement.
 */
const calculateFeeClearanceData = (
  fee,
  overrideFeeCheck = false,
  minimumFeePaidPercentage = DEFAULT_MIN_FEE_PAID_PERCENTAGE,
) => {
  const totalFee = Number(fee?.totalFee || 0);
  const paidAmount = Number(fee?.paidAmount || 0);
  const pendingAmount = totalFee - paidAmount;
  const requiredPaidPercentage = resolveMinimumFeePaidPercentage(
    minimumFeePaidPercentage,
  );
  let status = "PENDING";
  let cleared = false;
  let paidPercentage = 0;
  // Distinguishes "no fee is applicable" from "0 % of the fee was paid".
  let hasFeeData = false;

  if (fee) {
    hasFeeData = true;

    if (paidAmount >= totalFee) {
      status = "FULLY_PAID";
    } else if (paidAmount > 0) {
      status = "PARTIALLY_PAID";
    }

    if (fee.installments?.length > 0) {
      cleared = fee.installments.every(
        (installment) => installment.status === "PAID",
      );
    } else {
      cleared = paidAmount >= totalFee;
    }

    // totalFee <= 0 means nothing is outstanding, matching the previous
    // behaviour where `paidAmount >= totalFee` cleared the check.
    paidPercentage =
      totalFee > 0
        ? Math.min(100, Math.max(0, (paidAmount / totalFee) * 100))
        : 100;
  }

  const meetsPaidPercentage =
    hasFeeData && paidPercentage + 1e-9 >= requiredPaidPercentage;

  return {
    status,
    totalFee,
    paidAmount,
    pendingAmount,
    paidPercentage,
    requiredPaidPercentage,
    requiredClearance: true,
    cleared,
    meetsPaidPercentage,
    passed: meetsPaidPercentage || cleared || Boolean(overrideFeeCheck),
    overridden: Boolean(
      overrideFeeCheck && !meetsPaidPercentage && !cleared,
    ),
  };
};

const evaluateFeeClearance = async ({
  studentId,
  collegeId,
  overrideFeeCheck = false,
  minimumFeePaidPercentage = DEFAULT_MIN_FEE_PAID_PERCENTAGE,
}) => {
  const fee = await StudentFee.findOne({
    student_id: studentId,
    college_id: collegeId,
  }).select("totalFee paidAmount installments");

  return calculateFeeClearanceData(
    fee,
    overrideFeeCheck,
    minimumFeePaidPercentage,
  );
};

const emptyAttendanceSnapshot = (requiredPercentage) => {
  const isZeroRequirement = Number(requiredPercentage) === 0;
  return {
    percentage: 0,
    requiredPercentage,
    totalSessions: 0,
    status: isZeroRequirement
      ? ATTENDANCE_STATUS.ELIGIBLE
      : ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE,
    passed: isZeroRequirement,
    overridden: false,
    overrideReason: null,
  };
};

const emptyFeeSnapshot = (
  minimumFeePaidPercentage = DEFAULT_MIN_FEE_PAID_PERCENTAGE,
) => calculateFeeClearanceData(null, false, minimumFeePaidPercentage);

const calculatePromotionDecision = async ({
  authoritativeResult,
  policy,
  attendance,
  feeClearance,
  currentSemester,
  studentId,
  collegeId,
  academicYear,
  userId,
}) => {
  const authorityStatus = authoritativeResult?.status;
  const result = authoritativeResult?.result;
  const resultStatus =
    authorityStatus === RESULT_AUTHORITY_STATUS.FOUND
      ? result?.status
      : authorityStatus;
  const attendanceSnapshot =
    attendance ||
    emptyAttendanceSnapshot(
      policy?.snapshot?.minAttendancePercentage ?? DEFAULT_ATTENDANCE_THRESHOLD,
    );
  const feeSnapshot =
    feeClearance ||
    emptyFeeSnapshot(
      resolveMinimumFeePaidPercentage(policy?.snapshot),
    );
  const base = {
    sourceResultId: result?._id || null,
    sourceExamId: result?.exam_id || null,
    resultStatus,
    failedSubjectIds: [],
    failedSubjectCount: 0,
    ktCount: 0,
    promotionOutcome: authorityStatus,
    decisionReason: authorityStatus,
    attendanceSnapshot,
    feeClearanceSnapshot: feeSnapshot,
  };

  if (authorityStatus !== RESULT_AUTHORITY_STATUS.FOUND) {
    return base;
  }

  const ktResult = calculateKTCount(result);
  const { ktCount, failedSubjectIds, ktCountByType } = ktResult;
  const overallResult = result.overallResult;
  const resolvedMaxAllowedKTs = currentSemester !== undefined
    ? resolveKTLimitForSemester(policy?.snapshot, currentSemester)
    : resolveMaxAllowedKTs(policy?.snapshot);
  const withinKTLimit = isWithinKTLimit(ktResult, policy?.snapshot, currentSemester);
  const academicOutcome =
    overallResult === "PASS"
      ? "PASS"
      : overallResult === "FAIL" && withinKTLimit
        ? "ATKT"
        : overallResult;

  let promotionOutcome = academicOutcome;
  let decisionReason = academicOutcome;

  if (overallResult === "FAIL" && !withinKTLimit) {
    promotionOutcome = "BLOCKED";
    decisionReason = "KT_LIMIT_EXCEEDED";
  }

  // Check previous-year clearance if required by policy
  const previousYearClearanceRequired = currentSemester !== undefined
    ? requiresPreviousYearClearance(policy?.snapshot, currentSemester)
    : false;

  let previousYearClearancePassed = true;
  if (
    previousYearClearanceRequired &&
    promotionOutcome !== "BLOCKED" &&
    studentId &&
    collegeId
  ) {
    const previousAcademicYear = calculatePreviousAcademicYear(academicYear);
    if (previousAcademicYear) {
      // Synchronize / auto-evaluate any pending backlog attempts from published exams
      const candidateBacklogs = await Backlog.find({
        student_id: studentId,
        college_id: collegeId,
        academicYear: previousAcademicYear,
        status: { $ne: "CLEARED" },
      });

      for (const b of candidateBacklogs) {
        if (b.status === "ATTEMPTED" && b.latest_attempt_id) {
          const attempt = await BacklogAttempt.findById(b.latest_attempt_id);
          if (attempt) {
            if (attempt.result_status === "PASS") {
              b.status = "CLEARED";
              b.latest_result_status = "PASS";
              b.cleared_at = attempt.cleared_at || new Date();
              await b.save();
            } else if (attempt.result_status === "INCOMPLETE") {
              const exam = await Exam.findById(attempt.exam_id).select("status").lean();
              if (exam && exam.status === "PUBLISHED") {
                try {
                  await evaluateAttempt({
                    attemptId: attempt._id,
                    collegeId,
                    actorId: userId || collegeId,
                    actorRole: "COLLEGE_ADMIN",
                  });
                } catch (evalErr) {
                  // Keep current status if evaluation fails
                }
              }
            }
          }
        }
      }

      const unclearedBacklogs = await Backlog.find({
        student_id: studentId,
        college_id: collegeId,
        academicYear: previousAcademicYear,
        status: { $ne: "CLEARED" },
      }).lean();

      if (unclearedBacklogs.length > 0) {
        previousYearClearancePassed = false;
        promotionOutcome = "BLOCKED";
        decisionReason = "PREVIOUS_YEAR_BACKLOG_NOT_CLEARED";
      }
    }
  }

  if (promotionOutcome !== "BLOCKED") {
    if (overallResult === "INCOMPLETE") {
      promotionOutcome = "INCOMPLETE";
      decisionReason = "RESULT_INCOMPLETE";
    } else if (!attendanceSnapshot.passed) {
      promotionOutcome = "BLOCKED";
      decisionReason =
        attendanceSnapshot.status === ATTENDANCE_STATUS.NOT_ELIGIBLE
          ? "ATTENDANCE_INSUFFICIENT"
          : "ATTENDANCE_NOT_AVAILABLE";
    } else if (!feeSnapshot.passed) {
      promotionOutcome = "BLOCKED";
      decisionReason = "FEE_NOT_CLEARED";
    } else {
      decisionReason = "ELIGIBLE";
    }
  }

  return {
    ...base,
    failedSubjectIds,
    failedSubjectCount: ktCount,
    ktCount,
    promotionOutcome,
    decisionReason,
    resolvedMaxAllowedKTs,
    previousYearClearanceRequired,
    previousYearClearancePassed,
  };
};

const getStudentForDecision = async ({ studentId, collegeId }) => {
  const student = await Student.findOne({
    _id: studentId,
    college_id: collegeId,
    status: { $in: ["APPROVED", "ENROLLED"] },
  });

  if (!student) {
    throw new AppError(
      "Student not found or not approved",
      404,
      "STUDENT_NOT_FOUND",
    );
  }

  return student;
};

const createPromotionDecision = async ({
  studentId,
  collegeId,
  userId,
  overrideFeeCheck = false,
  overrideAttendanceCheck = false,
  overrideAttendanceReason,
}) => {
  const student = await getStudentForDecision({ studentId, collegeId });
  const policy = await resolvePromotionPolicy(collegeId, student.course_id);
  const identity = {
    collegeId,
    studentId: student._id,
    courseId: student.course_id,
    semester: student.currentSemester,
    academicYear: student.currentAcademicYear,
  };
  const authoritativeResult = await resolveAuthoritativeResult(identity);
  const attendance = await evaluateAttendance({
    student,
    collegeId,
    requiredPercentage: policy.snapshot.minAttendancePercentage,
    overrideAttendanceCheck,
    overrideAttendanceReason,
  });
  const feeClearance = await evaluateFeeClearance({
    studentId: student._id,
    collegeId,
    overrideFeeCheck,
    minimumFeePaidPercentage: policy.snapshot.minimumFeePaidPercentage,
  });
  const calculated = await calculatePromotionDecision({
    authoritativeResult,
    policy,
    attendance,
    feeClearance,
    currentSemester: student.currentSemester,
    studentId: student._id,
    collegeId,
    academicYear: student.currentAcademicYear,
    userId,
  });
  const lookup = {
    college_id: collegeId,
    student_id: student._id,
    course_id: student.course_id,
    semester: student.currentSemester,
    academicYear: student.currentAcademicYear,
    source_result_id: calculated.sourceResultId,
  };

  const policySnapshotToStore = {
    ...policy.snapshot,
    resolvedMaxAllowedKTs: calculated.resolvedMaxAllowedKTs,
    previousYearClearanceRequired: calculated.previousYearClearanceRequired,
    previousYearClearancePassed: calculated.previousYearClearancePassed,
  };

  const freshFields = {
    source_exam_id: calculated.sourceExamId,
    result_status: calculated.resultStatus,
    failed_subject_ids: calculated.failedSubjectIds,
    failed_subject_count: calculated.failedSubjectCount,
    kt_count: calculated.ktCount,
    promotion_outcome: calculated.promotionOutcome,
    decision_reason: calculated.decisionReason,
    workflow_status:
      calculated.promotionOutcome === "BLOCKED" ? "BLOCKED" : "DRAFT",
    attendance_snapshot: calculated.attendanceSnapshot,
    fee_clearance_snapshot: calculated.feeClearanceSnapshot,
    policy_id: policy.policyId,
    policy_version: policy.policyVersion,
    policy_snapshot: policySnapshotToStore,
  };

  const existing = await PromotionDecision.findOne(lookup);

  if (existing) {
    // RCA-2 fix: refresh the stored snapshot with freshly-calculated data
    // instead of returning a stale cached record.
    //
    // Idempotency is preserved — the update targets the single existing
    // document (the unique index on the lookup key guarantees one record),
    // so no duplicate PromotionDecision is created.
    //
    // Workflow states set by human actions (RECOMMENDED, UNDER_REVIEW,
    // APPROVED, REJECTED, PROMOTED, REVERSED) are preserved when the academic
    // outcome remains unchanged: only the pure data snapshots (attendance,
    // fee, policy) are refreshed for those.
    //
    // However, if the underlying academic outcome has changed (e.g. policy
    // limits modified, KT count or marks changed), a reviewable decision
    // (RECOMMENDED, UNDER_REVIEW, APPROVED) must be updated to reflect the
    // current calculation so that stale outcomes do not cause execution 409s.
    // If the new outcome is BLOCKED, workflow_status becomes BLOCKED.
    // Otherwise it resets to DRAFT so it can follow the updated workflow cleanly.
    const PROCEEDED_STATUSES = [
      "RECOMMENDED",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "PROMOTED",
      "REVERSED",
    ];

    const REVIEWABLE_STATUSES = ["RECOMMENDED", "UNDER_REVIEW", "APPROVED"];
    const outcomeDiffers =
      REVIEWABLE_STATUSES.includes(existing.workflow_status) &&
      calculated.promotionOutcome !== existing.promotion_outcome;

    let update;
    if (outcomeDiffers) {
      update = {
        ...freshFields,
        workflow_status:
          calculated.promotionOutcome === "BLOCKED" ? "BLOCKED" : "DRAFT",
        recommendation: null,
        approval: null,
      };
    } else if (PROCEEDED_STATUSES.includes(existing.workflow_status)) {
      update = {
        attendance_snapshot: calculated.attendanceSnapshot,
        fee_clearance_snapshot: calculated.feeClearanceSnapshot,
        policy_id: policy.policyId,
        policy_version: policy.policyVersion,
        policy_snapshot: policySnapshotToStore,
      };
    } else {
      update = freshFields;
    }

    return PromotionDecision.findByIdAndUpdate(
      existing._id,
      { $set: update },
      { new: true, runValidators: true },
    ).populate("failed_subject_ids", "name code");
  }

    const created = await PromotionDecision.create({
    ...lookup,
    ...freshFields,
    createdBy: userId,
  });
  return created.populate("failed_subject_ids", "name code");
};

/**
 * Strips all internal, administrative, actor, and reviewer metadata from a
 * PromotionDecision document, producing a safe, read-only payload for student view.
 */
const sanitizeStudentPromotionDecision = (decision) => {
  if (!decision) return null;

  const attendance = decision.attendance_snapshot
    ? {
        percentage: decision.attendance_snapshot.percentage,
        requiredPercentage: decision.attendance_snapshot.requiredPercentage,
        status: decision.attendance_snapshot.status,
        passed: decision.attendance_snapshot.passed,
      }
    : null;

  const feeClearance = decision.fee_clearance_snapshot
    ? {
        status: decision.fee_clearance_snapshot.status,
        cleared: decision.fee_clearance_snapshot.cleared,
        passed: decision.fee_clearance_snapshot.passed,
      }
    : null;

  return {
    status: decision.workflow_status,
    outcome: decision.promotion_outcome,
    decisionReason: decision.decision_reason,
    semester: decision.semester,
    academicYear: decision.academicYear,
    ktCount: decision.kt_count ?? 0,
    failedSubjectCount: decision.failed_subject_count ?? 0,
    attendance,
    feeClearance,
    evaluatedAt: decision.updatedAt || decision.createdAt || null,
    promotedAt: decision.promotedAt || null,
  };
};

/**
 * Resolves the authenticated student's authoritative PromotionDecision for the
 * requested semester (or currentSemester if not specified) and returns a sanitized
 * view. Student identity is strictly derived from the authenticated userId.
 */
const getStudentPromotionStatus = async ({ collegeId, userId, semester }) => {
  const student = await Student.findOne({
    user_id: userId,
    college_id: collegeId,
  }).select("_id course_id currentSemester");

  if (!student) {
    throw new AppError("Student profile not found", 404, "STUDENT_NOT_FOUND");
  }

  let targetSemester = student.currentSemester;
  if (semester !== undefined && semester !== null && semester !== "") {
    const parsedSemester = Number(semester);
    if (
      !Number.isInteger(parsedSemester) ||
      parsedSemester < 1 ||
      parsedSemester > 8
    ) {
      throw new AppError(
        "Invalid semester. Semester must be an integer between 1 and 8.",
        400,
        "INVALID_SEMESTER",
      );
    }
    targetSemester = parsedSemester;
  }

  const decision = await PromotionDecision.findOne({
    college_id: collegeId,
    student_id: student._id,
    course_id: student.course_id,
    semester: targetSemester,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!decision) {
    return null;
  }

  return sanitizeStudentPromotionDecision(decision);
};

module.exports = {
  DEFAULT_MAX_ALLOWED_KTS,
  resolvePromotionPolicy,
  evaluateAttendance,
  evaluateAttendanceData,
  evaluateFeeClearance,
  calculateFeeClearanceData,
  calculatePromotionDecision,
  createPromotionDecision,
  calculatePreviousAcademicYear,
  sanitizeStudentPromotionDecision,
  getStudentPromotionStatus,
};

