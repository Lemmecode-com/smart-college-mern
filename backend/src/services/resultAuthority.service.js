const SemesterResult = require("../models/semesterResult.model");
const { RESULT_STATUS } = require("../utils/constants");
const {
  academicYearRepresentations,
} = require("../utils/academicYear.util");

const RESULT_AUTHORITY_STATUS = {
  FOUND: "FOUND",
  NO_RESULT: "NO_RESULT",
  AMBIGUOUS_RESULT: "AMBIGUOUS_RESULT",
};

/**
 * Resolve the only result that promotion is allowed to consume for one
 * student/course/semester/academic-year context.
 *
 * DRAFT and LOCKED results are intentionally excluded. The bounded query is
 * enough to distinguish zero, one, and multiple published candidates without
 * choosing an arbitrary historical result.
 *
 * Academic-year matching is format-agnostic: the stored value may use either
 * the full representation ("2026-2027") or the short representation
 * ("2026-27"). Both are derived from the input academic year and matched
 * exactly via $in — no substring or regex matching is used, so unrelated
 * academic years never produce false positives.
 */
exports.resolveAuthoritativeResult = async ({
  collegeId,
  studentId,
  courseId,
  semester,
  academicYear,
}) => {
  const academicYearReps = academicYearRepresentations(academicYear);

  if (!academicYearReps) {
    return { status: RESULT_AUTHORITY_STATUS.NO_RESULT };
  }

  const results = await SemesterResult.find({
    college_id: collegeId,
    student_id: studentId,
    course_id: courseId,
    semester,
    academicYear: { $in: academicYearReps },
    status: RESULT_STATUS.PUBLISHED,
  })
    .limit(2)
    .exec();

  if (results.length === 0) {
    return { status: RESULT_AUTHORITY_STATUS.NO_RESULT };
  }

  if (results.length > 1) {
    return { status: RESULT_AUTHORITY_STATUS.AMBIGUOUS_RESULT };
  }

  return {
    status: RESULT_AUTHORITY_STATUS.FOUND,
    result: results[0],
  };
};

exports.RESULT_AUTHORITY_STATUS = RESULT_AUTHORITY_STATUS;
