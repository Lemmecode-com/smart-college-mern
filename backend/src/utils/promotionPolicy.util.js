const DEFAULT_MAX_ALLOWED_KTS = 3;

/**
 * The previous promotion contract required the fee to be fully cleared, so 100%
 * is the backward-compatible default for the configurable minimum fee percentage.
 */
const DEFAULT_MIN_FEE_PAID_PERCENTAGE = 100;

const DEFAULT_ATTENDANCE_THRESHOLD = 75;
const DEFAULT_POLICY_VERSION = "DEFAULT-v1";

const resolveMaxAllowedKTs = (policy) =>
  policy?.maxAllowedKTs ?? DEFAULT_MAX_ALLOWED_KTS;

/**
 * Resolves the minimum fee-paid percentage from a policy document or a stored
 * policy snapshot. Legacy documents without the field resolve to the full
 * payment requirement, keeping pre-existing behaviour intact.
 */
const resolveMinimumFeePaidPercentage = (policyOrValue) => {
  const raw =
    typeof policyOrValue === "number"
      ? policyOrValue
      : policyOrValue?.minimumFeePaidPercentage;

  if (raw === undefined || raw === null || !Number.isFinite(Number(raw))) {
    return DEFAULT_MIN_FEE_PAID_PERCENTAGE;
  }

  return Math.min(100, Math.max(0, Number(raw)));
};

const resolveKTRuleForSemester = (policy, fromSemester) => {
  if (!policy || !policy.ktRules || !Array.isArray(policy.ktRules)) {
    return null;
  }
  return policy.ktRules.find((rule) => rule.fromSemester === fromSemester) || null;
};

const resolveKTLimitForSemester = (policy, fromSemester) => {
  const rule = resolveKTRuleForSemester(policy, fromSemester);
  if (rule && typeof rule.maxAllowedKTs === "number") {
    return rule.maxAllowedKTs;
  }
  return resolveMaxAllowedKTs(policy);
};

const resolveSubjectTypeLimits = (policy, fromSemester) => {
  const rule = resolveKTRuleForSemester(policy, fromSemester);
  if (rule && rule.subjectTypeLimits) {
    return rule.subjectTypeLimits;
  }
  return null;
};

const requiresPreviousYearClearance = (policy, fromSemester) => {
  const rule = resolveKTRuleForSemester(policy, fromSemester);
  return rule?.requirePreviousYearClearance === true;
};
const normalizeKtRules = (rules = []) =>
  (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const raw = typeof rule?.toObject === "function" ? rule.toObject() : rule;
      return {
        fromSemester: raw?.fromSemester ?? null,
        toSemester: raw?.toSemester ?? null,
        maxAllowedKTs: raw?.maxAllowedKTs ?? null,
        requirePreviousYearClearance: !!raw?.requirePreviousYearClearance,
        subjectTypeLimits: {
          THEORY: raw?.subjectTypeLimits?.THEORY ?? null,
          PRACTICAL: raw?.subjectTypeLimits?.PRACTICAL ?? null,
          COMPOSITE: raw?.subjectTypeLimits?.COMPOSITE ?? null,
        },
      };
    })
    .sort((left, right) => (left.fromSemester ?? 0) - (right.fromSemester ?? 0));

/**
 * Resolves the authoritative promotion policy for a given course within a college.
 * Order of precedence:
 *   1. Active course-specific policy: { collegeId, course_id: courseId, isActive: true }
 *   2. Active college-level policy:   { collegeId, course_id: null, isActive: true }
 *   3. System defaults
 *
 * Invariant: NEVER returns a policy belonging to a different course.
 *
 * @param {ObjectId|string} collegeId
 * @param {ObjectId|string|null} [courseId]
 * @param {ClientSession|null} [session]
 * @returns {Promise<Object>} Uniform resolved policy descriptor
 */
const resolveAuthoritativePolicy = async (collegeId, courseId = null, session = null) => {
  const mongoose = require("mongoose");
  const PromotionPolicy =
    mongoose.models.PromotionPolicy ||
    require("../models/promotionPolicy.model");

  let policy = null;

  if (courseId) {
    let query = PromotionPolicy.findOne({
      collegeId,
      course_id: courseId,
      isActive: true,
    });
    if (session) query = query.session(session);
    policy = await query.exec();
  }

  if (!policy) {
    let query = PromotionPolicy.findOne({
      collegeId,
      course_id: null,
      isActive: true,
    });
    if (session) query = query.session(session);
    policy = await query.exec();
  }

  const minAttendancePercentage =
    policy?.minAttendancePercentage ?? DEFAULT_ATTENDANCE_THRESHOLD;
  const maxAllowedKTs = resolveMaxAllowedKTs(policy);
  const minimumFeePaidPercentage = resolveMinimumFeePaidPercentage(policy);
  const scopedSemesters = policy?.scopedSemesters || [];
  const ktRules = policy?.ktRules || [];
  const policyId = policy?._id || null;
  const policyVersion = policy?.updatedAt
    ? policy.updatedAt.toISOString()
    : DEFAULT_POLICY_VERSION;

  const snapshot = {
    course_id: courseId || null,
    minAttendancePercentage,
    maxAllowedKTs,
    minimumFeePaidPercentage,
    scopedSemesters,
    ktRules,
  };

  return {
    policyId,
    policyVersion,
    minAttendancePercentage,
    maxAllowedKTs,
    minimumFeePaidPercentage,
    scopedSemesters,
    ktRules,
    course_id: courseId || null,
    isDefault: !policy,
    rawPolicy: policy || null,
    snapshot,
  };
};

module.exports = {
  DEFAULT_MAX_ALLOWED_KTS,
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
  DEFAULT_ATTENDANCE_THRESHOLD,
  DEFAULT_POLICY_VERSION,
  resolveMaxAllowedKTs,
  resolveMinimumFeePaidPercentage,
  resolveKTRuleForSemester,
  resolveKTLimitForSemester,
  resolveSubjectTypeLimits,
  requiresPreviousYearClearance,
  resolveAuthoritativePolicy,
  normalizeKtRules,
};
