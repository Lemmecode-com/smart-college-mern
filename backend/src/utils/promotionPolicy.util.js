const DEFAULT_MAX_ALLOWED_KTS = 3;

/**
 * The previous promotion contract required the fee to be fully cleared, so 100%
 * is the backward-compatible default for the configurable minimum fee percentage.
 */
const DEFAULT_MIN_FEE_PAID_PERCENTAGE = 100;

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

module.exports = {
  DEFAULT_MAX_ALLOWED_KTS,
  DEFAULT_MIN_FEE_PAID_PERCENTAGE,
  resolveMaxAllowedKTs,
  resolveMinimumFeePaidPercentage,
  resolveKTRuleForSemester,
  resolveKTLimitForSemester,
  resolveSubjectTypeLimits,
  requiresPreviousYearClearance,
};
