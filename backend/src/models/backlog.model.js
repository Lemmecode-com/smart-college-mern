const mongoose = require("mongoose");

const backlogSchema = new mongoose.Schema(
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

    original_exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    original_result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SemesterResult",
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subject_code: { type: String, trim: true },
    subject_name: { type: String, trim: true },
    subject_type: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "COMPOSITE"],
    },
    original_marks_snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "ATTEMPTED", "CLEARED", "CANCELLED"],
      default: "OPEN",
      required: true,
    },
    attempt_count: { type: Number, min: 0, default: 0, required: true },
    latest_attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    latest_result_status: { type: String, default: null },
    cleared_at: { type: Date, default: null },
    cleared_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    promotion_decision_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionDecision",
      default: null,
    },
    promotion_history_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionHistory",
      default: null,
    },
    cleared_by_role: { type: String, default: null },
    clearance_remarks: { type: String, trim: true, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

backlogSchema.index({ student_id: 1, status: 1 });
backlogSchema.index({ college_id: 1, student_id: 1, status: 1 });
backlogSchema.index(
  {
    student_id: 1,
    course_id: 1,
    semester: 1,
    academicYear: 1,
    subject_id: 1,
    original_result_id: 1,
    status: 1,
  },
  { unique: true, partialFilterExpression: { status: "OPEN" } },
);

module.exports = mongoose.model("Backlog", backlogSchema);
