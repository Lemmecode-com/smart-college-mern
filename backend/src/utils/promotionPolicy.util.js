const DEFAULT_MAX_ALLOWED_KTS = 3;

const resolveMaxAllowedKTs = (policy) =>
  policy?.maxAllowedKTs ?? DEFAULT_MAX_ALLOWED_KTS;

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
  resolveMaxAllowedKTs,
  resolveKTRuleForSemester,
  resolveKTLimitForSemester,
  resolveSubjectTypeLimits,
  requiresPreviousYearClearance,
};
