const SemesterResultService = require("../services/semesterResult.service");
const auditLogService = require("../services/auditLog.service");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

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
 * GET /api/results?examId=xxx
 *
 * Exam-level result listing for the Coordinator. Returns a summary
 * (total/passed/failed/lastUpdated) plus every SemesterResult row for the exam,
 * college-scoped. Read-only.
 */
exports.getResultsByExam = async (req, res, next) => {
  try {
    const { examId } = req.query;

    if (!examId) {
      throw new AppError("examId query parameter is required", 400, "MISSING_EXAM_ID");
    }

    const data = await SemesterResultService.getResultsByExam({
      collegeId: req.college_id,
      examId,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/generate-exam
 *
 * Generate SemesterResults for every approved student in the exam. Body: { examId }.
 * Reuses the per-student generation service; LOCKED/PUBLISHED results are skipped.
 */
exports.generateResultsForExam = async (req, res, next) => {
  try {
    const { examId } = req.body;

    if (!examId || typeof examId !== "string" || !examId.trim()) {
      logger.logWarning("generateResultsForExam called with missing/invalid examId", {
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        collegeId: req.college_id,
        bodyKeys: Object.keys(req.body || {}),
      });
      throw new AppError("examId is required", 400, "MISSING_EXAM_ID");
    }

    const summary = await SemesterResultService.generateResultsForExam({
      collegeId: req.college_id,
      examId,
      userId: req.user.id,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_LOCKED",
      resourceType: "Exam",
      resourceId: examId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      metadata: {
        totalStudents: summary.totalStudents,
        generated: summary.generated,
        skipped: summary.skipped,
        errorCount: summary.errors.length,
      },
    });

    res.json({
      success: true,
      message: `Results generated: ${summary.generated} generated, ${summary.skipped} skipped`,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/lock-exam
 *
 * Lock every DRAFT SemesterResult for the exam (DRAFT -> LOCKED, bulk).
 * Body: { examId }.
 */
exports.lockResultsForExam = async (req, res, next) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      throw new AppError("examId is required", 400, "MISSING_EXAM_ID");
    }

    const result = await SemesterResultService.lockResultsForExam({
      collegeId: req.college_id,
      examId,
      userId: req.user.id,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_LOCKED",
      resourceType: "Exam",
      resourceId: examId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      metadata: { lockedCount: result.modified },
    });

    res.json({
      success: true,
      message: `${result.modified} result(s) locked`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/publish-exam
 *
 * Publish every LOCKED SemesterResult for the exam (LOCKED -> PUBLISHED, bulk).
 * Body: { examId }.
 */
exports.publishResultsForExam = async (req, res, next) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      throw new AppError("examId is required", 400, "MISSING_EXAM_ID");
    }

    const result = await SemesterResultService.publishResultsForExam({
      collegeId: req.college_id,
      examId,
      userId: req.user.id,
    });

    await auditLogService.logAudit({
      collegeId: req.college_id,
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: "RESULT_PUBLISHED",
      resourceType: "Exam",
      resourceId: examId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: 200,
      metadata: { publishedCount: result.modified },
    });

    res.json({
      success: true,
      message: `${result.modified} result(s) published`,
      data: result,
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
