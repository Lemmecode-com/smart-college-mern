const Student = require("../models/student.model");
const StudentFee = require("../models/studentFee.model");
const PromotionPolicy = require("../models/promotionPolicy.model");
const PromotionDecision = require("../models/promotionDecision.model");
const AppError = require("../utils/AppError");
const {
  resolveAuthoritativeResult,
  RESULT_AUTHORITY_STATUS,
} = require("./resultAuthority.service");
const { calculateKTCount, isWithinKTLimit } = require("./atkt.service");
const { getAttendanceDataForStudents } = require("./attendance.service");
const {
  DEFAULT_MAX_ALLOWED_KTS,
  resolveMaxAllowedKTs,
} = require("../utils/promotionPolicy.util");

const DEFAULT_ATTENDANCE_THRESHOLD = 75;
const ATTENDANCE_STATUS = {
  ELIGIBLE: "ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  ATTENDANCE_NOT_AVAILABLE: "ATTENDANCE_NOT_AVAILABLE",
};

const resolvePromotionPolicy = async (collegeId) => {
  const policy = await PromotionPolicy.getActivePolicy(collegeId);
  const minAttendancePercentage =
    policy?.minAttendancePercentage ?? DEFAULT_ATTENDANCE_THRESHOLD;
  const maxAllowedKTs = resolveMaxAllowedKTs(policy);

  return {
    policyId: policy?._id || null,
    policyVersion: policy?.updatedAt?.toISOString() || "DEFAULT-v1",
    snapshot: {
      minAttendancePercentage,
      maxAllowedKTs,
      scopedSemesters: policy?.scopedSemesters || [],
    },
  };
};

const evaluateAttendanceData = ({
  attendanceData,
  requiredPercentage = DEFAULT_ATTENDANCE_THRESHOLD,
  overrideAttendanceCheck = false,
  overrideAttendanceReason,
}) => {
  const totalSessions = Number(attendanceData?.totalSessions || 0);
  const percentage = Number(attendanceData?.percentage || 0);
  const status =
    totalSessions === 0
      ? ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE
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
    passed: status === ATTENDANCE_STATUS.ELIGIBLE || overridden,
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

const calculateFeeClearanceData = (fee, overrideFeeCheck = false) => {
  const totalFee = Number(fee?.totalFee || 0);
  const paidAmount = Number(fee?.paidAmount || 0);
  const pendingAmount = totalFee - paidAmount;
  let status = "PENDING";
  let cleared = false;

  if (fee) {
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
  }

  return {
    status,
    totalFee,
    paidAmount,
    pendingAmount,
    requiredClearance: true,
    cleared,
    passed: cleared || Boolean(overrideFeeCheck),
    overridden: Boolean(overrideFeeCheck && !cleared),
  };
};

const evaluateFeeClearance = async ({
  studentId,
  collegeId,
  overrideFeeCheck = false,
}) => {
  const fee = await StudentFee.findOne({
    student_id: studentId,
    college_id: collegeId,
  }).select("totalFee paidAmount installments");

  return calculateFeeClearanceData(fee, overrideFeeCheck);
};

const emptyAttendanceSnapshot = (requiredPercentage) => ({
  percentage: 0,
  requiredPercentage,
  totalSessions: 0,
  status: ATTENDANCE_STATUS.ATTENDANCE_NOT_AVAILABLE,
  passed: false,
  overridden: false,
  overrideReason: null,
});

const emptyFeeSnapshot = () => calculateFeeClearanceData(null);

const calculatePromotionDecision = ({
  authoritativeResult,
  policy,
  attendance,
  feeClearance,
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
  const feeSnapshot = feeClearance || emptyFeeSnapshot();
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

  const { ktCount, failedSubjectIds } = calculateKTCount(result);
  const overallResult = result.overallResult;
  const withinKTLimit = isWithinKTLimit(ktCount, policy?.snapshot);
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
  } else if (overallResult === "INCOMPLETE") {
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

  return {
    ...base,
    failedSubjectIds,
    failedSubjectCount: ktCount,
    ktCount,
    promotionOutcome,
    decisionReason,
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
  const policy = await resolvePromotionPolicy(collegeId);
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
  });
  const calculated = calculatePromotionDecision({
    authoritativeResult,
    policy,
    attendance,
    feeClearance,
  });
  const lookup = {
    college_id: collegeId,
    student_id: student._id,
    course_id: student.course_id,
    semester: student.currentSemester,
    academicYear: student.currentAcademicYear,
    source_result_id: calculated.sourceResultId,
  };
  const existing = await PromotionDecision.findOne(lookup);
  if (existing) return existing;

  return PromotionDecision.create({
    ...lookup,
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
    policy_snapshot: policy.snapshot,
    createdBy: userId,
  });
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
};
