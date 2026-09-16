const PromotionDecision = require("../models/promotionDecision.model");
const PromotionHistory = require("../models/promotionHistory.model");
const SemesterResult = require("../models/semesterResult.model");
const Student = require("../models/student.model");
const Backlog = require("../models/backlog.model");
const AppError = require("../utils/AppError");
const { ROLE } = require("../utils/constants");
const auditLogService = require("./auditLog.service");

// Existing promotion routes use these roles. The academic hierarchy remains a
// business decision and can be changed here without changing transition logic.
const PROMOTION_WORKFLOW_ROLES = Object.freeze({
  RECOMMEND: Object.freeze([ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER]),
  APPROVE: Object.freeze([ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER]),
  REJECT: Object.freeze([ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER]),
});

const assertRole = (action, actorRole) => {
  const normalizedRole = String(actorRole || "").toUpperCase();
  if (!PROMOTION_WORKFLOW_ROLES[action].includes(normalizedRole)) {
    throw new AppError(
      `Role ${actorRole || "UNKNOWN"} cannot ${action.toLowerCase()} promotion decisions.`,
      403,
      "PROMOTION_WORKFLOW_FORBIDDEN",
    );
  }
};

const getDecision = async ({ decisionId, collegeId }) => {
  const decision = await PromotionDecision.findOne({
    _id: decisionId,
    college_id: collegeId,
  });
  if (!decision) {
    throw new AppError(
      "Promotion decision not found",
      404,
      "DECISION_NOT_FOUND",
    );
  }
  return decision;
};

const ensureReviewableOutcome = (decision) => {
  if (!["PASS", "ATKT"].includes(decision.promotion_outcome)) {
    throw new AppError(
      `Promotion outcome ${decision.promotion_outcome} is not eligible for approval.`,
      409,
      "PROMOTION_OUTCOME_NOT_APPROVABLE",
    );
  }
};

const auditTransition = async ({
  decision,
  action,
  actorId,
  actorRole,
  comment,
  request,
}) => {
  await auditLogService.logAudit({
    collegeId: decision.college_id,
    userId: actorId,
    userRole: actorRole,
    action,
    resourceType: "PromotionDecision",
    resourceId: decision._id,
    ipAddress: request?.ip || request?.socket?.remoteAddress || "internal",
    userAgent: request?.get?.("user-agent"),
    endpoint: request?.originalUrl,
    method: request?.method || "POST",
    statusCode: 200,
    metadata: {
      studentId: decision.student_id,
      promotionDecisionId: decision._id,
      promotionOutcome: decision.promotion_outcome,
      comment: comment || null,
      workflowStatus: decision.workflow_status,
    },
  });
};

const transition = async ({
  decision,
  action,
  actorId,
  actorRole,
  comment,
  fromStatuses,
  newStatus,
  actorField,
  auditAction,
  request,
}) => {
  const now = new Date();
  const actor = { user_id: actorId, at: now, comment: comment || null };
  const history = {
    action,
    performedBy: actorId,
    performedAt: now,
    previousStatus: decision.workflow_status,
    newStatus,
    comment: comment || null,
  };
  const updated = await PromotionDecision.findOneAndUpdate(
    {
      _id: decision._id,
      college_id: decision.college_id,
      workflow_status: { $in: fromStatuses },
    },
    {
      $set: { workflow_status: newStatus, [actorField]: actor },
      $push: { workflow_history: history },
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw new AppError(
      `Promotion decision cannot transition from ${decision.workflow_status}.`,
      409,
      "INVALID_PROMOTION_WORKFLOW_TRANSITION",
    );
  }
  await auditTransition({
    decision: updated,
    action: auditAction,
    actorId,
    actorRole,
    comment,
    request,
  });
  return updated;
};

const submitPromotionRecommendation = async ({
  decisionId,
  collegeId,
  actorId,
  actorRole,
  comment,
  request,
}) => {
  assertRole("RECOMMEND", actorRole);
  const decision = await getDecision({ decisionId, collegeId });
  ensureReviewableOutcome(decision);
  return transition({
    decision,
    action: "RECOMMEND",
    actorId,
    actorRole,
    comment,
    fromStatuses: ["DRAFT"],
    newStatus: "RECOMMENDED",
    actorField: "recommendation",
    auditAction: "PROMOTION_RECOMMENDED",
    request,
  });
};

const revalidateDecision = async (decision) => {
  const student = await Student.findOne({
    _id: decision.student_id,
    college_id: decision.college_id,
    course_id: decision.course_id,
  }).select("currentSemester currentAcademicYear");
  if (
    !student ||
    student.currentSemester !== decision.semester ||
    (student.currentAcademicYear &&
      student.currentAcademicYear !== decision.academicYear)
  ) {
    throw new AppError(
      "Student academic context no longer matches the promotion decision.",
      409,
      "STALE_PROMOTION_DECISION",
    );
  }

  const result = await SemesterResult.findOne({
    _id: decision.source_result_id,
    college_id: decision.college_id,
    student_id: decision.student_id,
    course_id: decision.course_id,
    semester: decision.semester,
    academicYear: decision.academicYear,
    status: "PUBLISHED",
  }).select("_id");
  if (!result) {
    throw new AppError(
      "The authoritative published result is no longer available.",
      409,
      "STALE_PROMOTION_DECISION",
    );
  }

  const conflictingPromotion = await PromotionHistory.exists({
    student_id: decision.student_id,
    course_id: decision.course_id,
    fromSemester: decision.semester,
    fromAcademicYear: decision.academicYear,
    status: "ACTIVE",
  });
  if (conflictingPromotion) {
    throw new AppError(
      "A promotion already exists for this academic context.",
      409,
      "PROMOTION_ALREADY_EXECUTED",
    );
  }
};

const approvePromotionDecision = async ({
  decisionId,
  collegeId,
  actorId,
  actorRole,
  comment,
  request,
}) => {
  assertRole("APPROVE", actorRole);
  const decision = await getDecision({ decisionId, collegeId });
  ensureReviewableOutcome(decision);
  await revalidateDecision(decision);

  const update = {};
  if (decision.promotion_outcome === "ATKT") {
    const backlogs = await Backlog.find({
      student_id: decision.student_id,
      college_id: decision.college_id,
      original_result_id: decision.source_result_id,
      status: "OPEN",
    }).select("_id");
    update.backlog_ids = backlogs.map((backlog) => backlog._id);
  }

  if (Object.keys(update).length > 0) {
    await PromotionDecision.updateOne(
      { _id: decision._id, workflow_status: "RECOMMENDED" },
      { $set: update },
    );
  }

  return transition({
    decision: await PromotionDecision.findById(decision._id),
    action: "APPROVE",
    actorId,
    actorRole,
    comment,
    fromStatuses: ["RECOMMENDED", "UNDER_REVIEW"],
    newStatus: "APPROVED",
    actorField: "approval",
    auditAction: "PROMOTION_APPROVED",
    request,
  });
};

const rejectPromotionDecision = async ({
  decisionId,
  collegeId,
  actorId,
  actorRole,
  reason,
  request,
}) => {
  assertRole("REJECT", actorRole);
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (!trimmedReason) {
    throw new AppError(
      "A rejection reason is required.",
      400,
      "REJECTION_REASON_REQUIRED",
    );
  }
  const decision = await getDecision({ decisionId, collegeId });
  return transition({
    decision,
    action: "REJECT",
    actorId,
    actorRole,
    comment: trimmedReason,
    fromStatuses: ["RECOMMENDED", "UNDER_REVIEW"],
    newStatus: "REJECTED",
    actorField: "rejection",
    auditAction: "PROMOTION_REJECTED",
    request,
  });
};

module.exports = {
  PROMOTION_WORKFLOW_ROLES,
  submitPromotionRecommendation,
  approvePromotionDecision,
  rejectPromotionDecision,
  revalidateDecision,
};
