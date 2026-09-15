const mongoose = require("mongoose");

const attendanceSnapshotSchema = new mongoose.Schema(
  {
    percentage: { type: Number, required: true },
    requiredPercentage: { type: Number, required: true },
    totalSessions: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["ELIGIBLE", "NOT_ELIGIBLE", "ATTENDANCE_NOT_AVAILABLE"],
      required: true,
    },
    passed: { type: Boolean, required: true },
    overridden: { type: Boolean, required: true, default: false },
    overrideReason: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const feeClearanceSnapshotSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["FULLY_PAID", "PARTIALLY_PAID", "PENDING"],
      required: true,
    },
    totalFee: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    pendingAmount: { type: Number, required: true, default: 0 },
    requiredClearance: { type: Boolean, required: true, default: true },
    cleared: { type: Boolean, required: true },
    passed: { type: Boolean, required: true },
    overridden: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const policySnapshotSchema = new mongoose.Schema(
  {
    minAttendancePercentage: { type: Number, required: true },
    maxAllowedKTs: { type: Number, required: true },
    scopedSemesters: { type: [Number], default: [] },
  },
  { _id: false },
);

const workflowActorSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    at: { type: Date, required: true },
    comment: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const workflowHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["RECOMMEND", "APPROVE", "REJECT"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedAt: { type: Date, required: true },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    comment: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const promotionDecisionSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true, trim: true },

    source_result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SemesterResult",
      default: null,
    },
    source_exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },
    result_status: {
      type: String,
      enum: ["PUBLISHED", "NO_RESULT", "AMBIGUOUS_RESULT"],
      required: true,
    },

    failed_subject_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    failed_subject_count: { type: Number, required: true, default: 0 },
    kt_count: { type: Number, required: true, default: 0 },

    promotion_outcome: {
      type: String,
      enum: [
        "PASS",
        "ATKT",
        "FAIL",
        "INCOMPLETE",
        "NO_RESULT",
        "AMBIGUOUS_RESULT",
        "BLOCKED",
      ],
      required: true,
    },
    decision_reason: { type: String, required: true },

    workflow_status: {
      type: String,
      enum: [
        "DRAFT",
        "RECOMMENDED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "PROMOTED",
        "BLOCKED",
        "REVERSED",
      ],
      default: "DRAFT",
      required: true,
    },
    recommendation: { type: workflowActorSchema, default: null },
    approval: { type: workflowActorSchema, default: null },
    rejection: { type: workflowActorSchema, default: null },
    workflow_history: { type: [workflowHistorySchema], default: [] },
    backlog_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Backlog",
      },
    ],
    promotedAt: { type: Date, default: null },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    executionAt: { type: Date, default: null },
    executionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    promotion_history_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionHistory",
      default: null,
    },

    attendance_snapshot: {
      type: attendanceSnapshotSchema,
      required: true,
    },
    fee_clearance_snapshot: {
      type: feeClearanceSnapshotSchema,
      required: true,
    },

    policy_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionPolicy",
      default: null,
    },
    policy_version: { type: String, required: true },
    policy_snapshot: { type: policySnapshotSchema, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

promotionDecisionSchema.index(
  {
    college_id: 1,
    student_id: 1,
    course_id: 1,
    semester: 1,
    academicYear: 1,
    source_result_id: 1,
  },
  { unique: true },
);

promotionDecisionSchema.index({ workflow_status: 1, college_id: 1 });

module.exports = mongoose.model("PromotionDecision", promotionDecisionSchema);
