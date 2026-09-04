const mongoose = require("mongoose");

/**
 * Exam Schedule (Exam Timetable)
 *
 * A separate model from Exam to keep the existing Exam CRUD/Marks/Results flow
 * untouched. Each Exam has at most one ExamSchedule (1:1 by exam_id unique).
 *
 * Lifecycle:
 *   - DRAFT:      editable; subjects may be partially scheduled.
 *   - PUBLISHED:  read-only in this step; requires every Exam subject to have
 *                 examDate, startTime and endTime assigned at publish time.
 *
 * Note: This step intentionally does NOT include student/teacher/room conflict
 * detection. Those will be added in a later step.
 */

const examScheduleSubjectSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    examDate: {
      type: Date,
      required: false,
    },
    startTime: {
      type: String,
      required: false,
    },
    endTime: {
      type: String,
      required: false,
    },
    room: {
      type: String,
      required: false,
      trim: true,
    },
    session: {
      type: String,
      enum: ["FORENOON", "AFTERNOON"],
      required: false,
    },
  },
  { _id: false },
);

const examScheduleSchema = new mongoose.Schema(
  {
    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      unique: true,
    },

    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },

    subjects: {
      type: [examScheduleSubjectSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    publishedAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true },
);

// Tenant isolation index.
examScheduleSchema.index({ college_id: 1, status: 1 });
// Lookups by exam_id are already covered by the unique index, but the compound
// tenant-aware variant makes college-scoped lookups explicit.
examScheduleSchema.index({ college_id: 1, exam_id: 1 });

module.exports = mongoose.model("ExamSchedule", examScheduleSchema);