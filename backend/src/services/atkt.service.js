const { resolveMaxAllowedKTs, resolveKTLimitForSemester, resolveSubjectTypeLimits } = require("../utils/promotionPolicy.util");

/**
 * Count KT subjects from an authoritative SemesterResult snapshot.
 * Only subject results with status FAIL count; PASS and INCOMPLETE do not.
 */
const calculateKTCount = (semesterResult) => {
  const failedSubjects = (semesterResult?.subjects || []).filter(
    (subjectResult) => subjectResult?.status === "FAIL",
  );

  const ktCount = failedSubjects.length;
  const failedSubjectIds = failedSubjects
    .map((subjectResult) => subjectResult?.subject)
    .filter(Boolean);

  // Count by subject type
  const ktCountByType = {
    THEORY: 0,
    PRACTICAL: 0,
    COMPOSITE: 0,
  };

  for (const subject of failedSubjects) {
    const type = subject.subjectType;
    if (type && ktCountByType.hasOwnProperty(type)) {
      ktCountByType[type]++;
    }
  }

  return {
    ktCount,
    failedSubjectIds,
    ktCountByType,
  };
};

const isWithinKTLimit = (ktCount, policy, fromSemester) => {
  // Support both legacy (number) and new (object with ktCount/ktCountByType) formats
  const totalKtCount = typeof ktCount === "object" && ktCount.ktCount !== undefined
    ? ktCount.ktCount
    : ktCount;

  // First check overall limit
  const maxAllowed = fromSemester !== undefined
    ? resolveKTLimitForSemester(policy, fromSemester)
    : resolveMaxAllowedKTs(policy);
  
  if (totalKtCount > maxAllowed) {
    return false;
  }

  // Then check subject-type-specific limits if configured
  if (fromSemester !== undefined) {
    const subjectTypeLimits = resolveSubjectTypeLimits(policy, fromSemester);
    if (subjectTypeLimits && typeof ktCount === "object" && ktCount.ktCountByType) {
      for (const [type, limit] of Object.entries(subjectTypeLimits)) {
        if (typeof limit === "number" && ktCount.ktCountByType[type] > limit) {
          return false;
        }
      }
    }
  }

  return true;
};

module.exports = {
  calculateKTCount,
  isWithinKTLimit,
};
