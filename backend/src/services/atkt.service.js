const { resolveMaxAllowedKTs } = require("../utils/promotionPolicy.util");

/**
 * Count KT subjects from an authoritative SemesterResult snapshot.
 * Only subject results with status FAIL count; PASS and INCOMPLETE do not.
 */
const calculateKTCount = (semesterResult) => {
  const failedSubjects = (semesterResult?.subjects || []).filter(
    (subjectResult) => subjectResult?.status === "FAIL",
  );

  return {
    ktCount: failedSubjects.length,
    failedSubjectIds: failedSubjects
      .map((subjectResult) => subjectResult?.subject)
      .filter(Boolean),
  };
};

const isWithinKTLimit = (ktCount, policy) =>
  ktCount <= resolveMaxAllowedKTs(policy);

module.exports = {
  calculateKTCount,
  isWithinKTLimit,
};
