const mongoose = require("mongoose");

/**
 * Immutable record of one supplementary/re-exam attempt against a Backlog.
 *
 * Each attempt is a separate document so the full history is preserved:
 *   - attempt 1 FAIL
 *   - attempt 2 PASS  -> backlog CLEARED
 * Both attempt rows remain queryable forever.
 *
 * The attempt result is produced by the centralized ExamCalculationService;
 * this model only stores the snapshot produced at evaluation time.
 */
const backlogAttemptSchema = new mongoose.Schema(
  {
    backlog_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Backlog",
      required: true,
      index: true,
    },

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

    attempt_number: {
      type: Number,
      required: true,
      min: 1,
    },

    // The supplementary/re-exam Exam this attempt was taken under.
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    exam_name: { type: String, trim: true },
    exam_type: { type: String, trim: true, default: null },

    // The generated SemesterResult for this attempt (separate from the
    // original authoritative regular result).
    result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SemesterResult",
      default: null,
    },

    // Marks snapshot at evaluation time.
    internal_marks: { type: Number, default: null },
    external_marks: { type: Number, default: null },
    total_marks: { type: Number, default: null },

    // Outcome from ExamCalculationService.
    result_status: {
      type: String,
      enum: ["PASS", "FAIL", "INCOMPLETE"],
      required: true,
    },
    passed: { type: Boolean, required: true },

    // Actor who initiated the attempt / evaluated it.
    attempted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attempted_at: { type: Date, default: null },
    evaluated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    evaluated_at: { type: Date, default: null },

    // When true, this attempt is the one that cleared the backlog.
    cleared: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

// One attempt row per (backlog, attempt_number) — prevents duplicate attempts.
backlogAttemptSchema.index({ backlog_id: 1, attempt_number: 1 }, { unique: true });

// College-scoped student attempt history.
backlogAttemptSchema.index({ college_id: 1, student_id: 1 });

module.exports = mongoose.model("BacklogAttempt", backlogAttemptSchema);