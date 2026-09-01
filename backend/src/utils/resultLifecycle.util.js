const AppError = require("../utils/AppError");
const SemesterResult = require("../models/semesterResult.model");
const { RESULT_STATUS } = require("../utils/constants");

/**
 * Lifecycle states (if any) that block further mutation of the underlying
 * StudentMarks that a SemesterResult depends on.
 *
 * A SemesterResult is immutable for marks-editing once it has left DRAFT.
 */
const BLOCKED_STATUSES = [RESULT_STATUS.LOCKED, RESULT_STATUS.PUBLISHED];

const MAX_UNLOCK_REASON_LENGTH = 500;

/**
 * Assert that a single loaded SemesterResult document is in a mutable state.
 *
 * - No document -> 404 (RESULT_NOT_FOUND)
 * - LOCKED / PUBLISHED -> 409 (RESULT_LOCKED_FOR_EDIT)
 * - DRAFT -> ok
 *
 * @param {Object} result - Mongoose SemesterResult document (or null)
 */
function assertResultMutable(result) {
  if (!result) {
    throw new AppError("SemesterResult not found", 404, "RESULT_NOT_FOUND");
  }

  if (BLOCKED_STATUSES.includes(result.status)) {
    throw new AppError(
      `Cannot modify marks while result is ${result.status}`,
      409,
      "RESULT_LOCKED_FOR_EDIT",
      { resultId: result._id, status: result.status },
    );
  }
}

/**
 * Assert that none of the (college, exam, student) results that a marks
 * mutation would affect are LOCKED or PUBLISHED.
 *
 * Used by every StudentMarks mutation path so that locking a result protects
 * the underlying marks regardless of which endpoint performs the write.
 *
 * @param {Object} params
 * @param {ObjectId/String} params.collegeId
 * @param {ObjectId/String} params.examId
 * @param {Array<ObjectId/String>} params.studentIds
 */
async function assertMarksMutable({ collegeId, examId, studentIds }) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return;
  }

  const blocked = await SemesterResult.findOne({
    college_id: collegeId,
    exam_id: examId,
    student_id: { $in: studentIds },
    status: { $in: BLOCKED_STATUSES },
  });

  if (blocked) {
    throw new AppError(
      "Cannot modify marks: a SemesterResult for this exam and student is locked or published",
      409,
      "RESULT_LOCKED_FOR_EDIT",
      { resultId: blocked._id, status: blocked.status },
    );
  }
}

/**
 * Validate an unlock reason using the project convention (mirrors
 * documentVerification.controller rejection reason validation).
 *
 * - Required, non-empty after trim
 * - Max 500 characters
 */
function validateUnlockReason(reason) {
  const trimmed = typeof reason === "string" ? reason.trim() : "";

  if (!trimmed) {
    throw new AppError("Unlock reason is required", 400, "MISSING_UNLOCK_REASON");
  }

  if (trimmed.length > MAX_UNLOCK_REASON_LENGTH) {
    throw new AppError(
      `Unlock reason must not exceed ${MAX_UNLOCK_REASON_LENGTH} characters`,
      400,
      "REASON_TOO_LONG",
    );
  }

  return trimmed;
}

module.exports = {
  RESULT_STATUS,
  BLOCKED_STATUSES,
  MAX_UNLOCK_REASON_LENGTH,
  assertResultMutable,
  assertMarksMutable,
  validateUnlockReason,
};
