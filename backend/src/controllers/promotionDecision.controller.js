const ApiResponse = require("../utils/ApiResponse");
const {
  createPromotionDecision,
} = require("../services/promotionDecision.service");
const { getBacklogsForStudent } = require("../services/backlog.service");
const {
  submitPromotionRecommendation,
  approvePromotionDecision,
  rejectPromotionDecision,
} = require("../services/promotionWorkflow.service");
const { executePromotion } = require("../services/promotionExecution.service");

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

exports.executePromotionDecision = async (req, res, next) => {
  try {
    const result = await executePromotion({
      decisionId: req.params.decisionId,
      collegeId: req.college_id,
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name || req.user.email || "Admin",
      request: req,
    });
    ApiResponse.success(res, result, "Promotion executed successfully");
  } catch (error) {
    next(error);
  }
};
