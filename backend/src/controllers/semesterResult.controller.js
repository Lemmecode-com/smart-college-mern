const SemesterResultService = require("../services/semesterResult.service");
const auditLogService = require("../services/auditLog.service");
const AppError = require("../utils/AppError");

/**
 * POST /api/results/generate
 *
 * Generate the semester result for a single student + exam.
 *
 * The request body accepts ONLY the identifiers needed to locate the work:
 *   { examId, studentId }
 *
 * Every aggregate value (counts, statuses, overall result, marks) is
 * calculated server-side from the Exam subject snapshot + StudentMarks via the
 * centralized ExamCalculationService. Client-supplied aggregate fields are
 * intentionally not read.
 */
exports.generateResult = async (req, res, next) => {
  try {
    const { examId, studentId } = req.body;

    if (!examId) {
      throw new AppError("examId is required", 400, "MISSING_EXAM_ID");
    }
    if (!studentId) {
      throw new AppError("studentId is required", 400, "MISSING_STUDENT_ID");
    }

    const result = await SemesterResultService.generateSemesterResult({
      collegeId: req.college_id,
      studentId,
      examId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "Semester result generated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/:resultId/lock
 *
 * Lock a DRAFT SemesterResult (DRAFT -> LOCKED). Locking finalizes the result
 * for review/publishing and blocks further modification of the underlying
 * StudentMarks.
 */
exports.lockResult = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    const result = await SemesterResultService.lockResult({
      resultId,
      collegeId: req.college_id,
      userId: req.user.id,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_LOCKED",
      resourceType: "SemesterResult",
      resourceId: result._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      newValues: {
        status: result.status,
        lockedBy: result.lockedBy,
        lockedAt: result.lockedAt,
      },
    });

    res.json({
      success: true,
      message: "Semester result locked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/:resultId/unlock
 *
 * Unlock a LOCKED SemesterResult (LOCKED -> DRAFT) so that marks corrections
 * can be made. A non-empty unlock reason (max 500 chars) is mandatory.
 */
exports.unlockResult = async (req, res, next) => {
  try {
    const { resultId } = req.params;
    const { reason } = req.body || {};

    const result = await SemesterResultService.unlockResult({
      resultId,
      collegeId: req.college_id,
      userId: req.user.id,
      reason,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_UNLOCKED",
      resourceType: "SemesterResult",
      resourceId: result._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: { status: "LOCKED" },
      newValues: { status: result.status },
      metadata: { unlockReason: result.unlockReason },
    });

    res.json({
      success: true,
      message: "Semester result unlocked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/:resultId/publish
 *
 * Publish a LOCKED SemesterResult (LOCKED -> PUBLISHED). Published results are
 * immutable; regenerate and marks edits are blocked thereafter.
 */
exports.publishResult = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    const result = await SemesterResultService.publishResult({
      resultId,
      collegeId: req.college_id,
      userId: req.user.id,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_PUBLISHED",
      resourceType: "SemesterResult",
      resourceId: result._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      oldValues: { status: "LOCKED" },
      newValues: {
        status: result.status,
        publishedBy: result.publishedBy,
        publishedAt: result.publishedAt,
      },
    });

    res.json({
      success: true,
      message: "Semester result published successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/my-results
 *
 * Student-scoped read. Returns only PUBLISHED results belonging to the
 * authenticated student. Identity is derived from req.user.id — never
 * trusted from query params or body.
 */
exports.getMyResults = async (req, res, next) => {
  try {
    const results = await SemesterResultService.getMyResults({
      collegeId: req.college_id,
      userId: req.user.id,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/:resultId
 *
 * Review a single SemesterResult (college-scoped). Read-only; mutation of a
 * locked/published result is blocked by the marks + generation layers.
 */
exports.getResult = async (req, res, next) => {
  try {
    const { resultId } = req.params;

    const result = await SemesterResultService.getResultById({
      resultId,
      collegeId: req.college_id,
    });

    if (!result) {
      throw new AppError("SemesterResult not found", 404, "RESULT_NOT_FOUND");
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
