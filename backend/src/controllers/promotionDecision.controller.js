const ApiResponse = require("../utils/ApiResponse");
const AppError = require("../utils/AppError");
const {
  createPromotionDecision,
} = require("../services/promotionDecision.service");
const { getBacklogsForStudent } = require("../services/backlog.service");
const {
  submitPromotionRecommendation,
  approvePromotionDecision,
  rejectPromotionDecision,
} = require("../services/promotionWorkflow.service");
const {
  executePromotion,
} = require("../services/promotionExecution.service");
const PromotionDecision = require("../models/promotionDecision.model");

exports.getPromotionEligibility = async (req, res, next) => {
  try {
    const decision = await createPromotionDecision({
      studentId: req.params.studentId,
      collegeId: req.college_id,
      userId: req.user.id,
    });

    ApiResponse.success(
      res,
      decision,
      "Promotion eligibility decision calculated successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.getStudentBacklogs = async (req, res, next) => {
  try {
    const backlogs = await getBacklogsForStudent({
      studentId: req.params.studentId,
      collegeId: req.college_id,
      status: req.query.status,
    });
    ApiResponse.success(
      res,
      backlogs,
      "Student backlogs retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

const workflowInput = (req) => ({
  decisionId: req.params.decisionId,
  collegeId: req.college_id,
  actorId: req.user.id,
  actorRole: req.user.role,
  comment: req.body?.comment,
  request: req,
});

exports.recommendPromotionDecision = async (req, res, next) => {
  try {
    const decision = await submitPromotionRecommendation(workflowInput(req));
    ApiResponse.success(
      res,
      decision,
      "Promotion recommendation submitted successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.approvePromotionDecision = async (req, res, next) => {
  try {
    const decision = await approvePromotionDecision(workflowInput(req));
    ApiResponse.success(
      res,
      decision,
      "Promotion decision approved successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.rejectPromotionDecision = async (req, res, next) => {
  try {
    const decision = await rejectPromotionDecision({
      ...workflowInput(req),
      reason: req.body?.reason || req.body?.comment,
    });
    ApiResponse.success(
      res,
      decision,
      "Promotion decision rejected successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Execute a promotion decision.
 *
 * College Admin "Confirm Promotion" flow — simplified single-step execution:
 *
 *   DRAFT        → auto-approve (PROMOTE_APPROVED audit) → execute (PROMOTION_EXECUTED audit)
 *   RECOMMENDED  → auto-approve (PROMOTE_APPROVED audit) → execute (PROMOTION_EXECUTED audit)
 *   APPROVED     → execute directly                      → (PROMOTION_EXECUTED audit)
 *   PROMOTED     → idempotent — returns existing result
 *   REJECTED     → 409 PROMOTION_REJECTED
 *   anything else (BLOCKED, etc.) → 409 PROMOTION_NOT_APPROVABLE
 *
 * executePromotion() itself is NOT modified — it still requires APPROVED status.
 * The auto-approve step preserves the full audit trail (PROMOTION_APPROVED then
 * PROMOTION_EXECUTED) so the decision log always shows both events.
 *
 * Non-COLLEGE_ADMIN callers that reach DRAFT/RECOMMENDED will be rejected by
 * approvePromotionDecision's own assertRole() guard, keeping the existing
 * permission model intact.
 */
exports.executePromotionDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const collegeId = req.college_id;
    const actorId = req.user.id;
    const actorRole = req.user.role;

    // ── Execute: executePromotion handles all status guards and direct auto-confirmation
    //    within a single session query, eliminating redundant pre-flight round-trips.
    const result = await executePromotion({
      decisionId,
      collegeId,
      actorId,
      actorRole,
      actorName: req.user.name || req.user.email || "Admin",
      request: req,
      isDirectAutoConfirmation: true,
    });

    ApiResponse.success(res, result, "Promotion executed successfully");
  } catch (error) {
    next(error);
  }
};
