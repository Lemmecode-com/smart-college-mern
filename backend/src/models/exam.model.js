const mongoose = require("mongoose");

// Snapshot of the applicable Subject exam/marks configuration at exam-creation
// time. The Subject reference is the source of truth for identity; these values
// capture the configuration the Exam depends on without duplicating the whole
// Subject document (teacher, department, etc.).
const examSubjectSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectType: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "COMPOSITE"],
      required: false,
    },
    internalMaxMarks: { type: Number },
    externalMaxMarks: { type: Number },
    internalPassMarks: { type: Number },
    externalPassMarks: { type: Number },
    passMarks: { type: Number },
  },
  { _id: false },
);

const examSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    semester: {
      type: Number,
      required: true,
      min: [1, "Semester must be at least 1"],
      max: [8, "Semester cannot exceed 8"],
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    subjects: {
      type: [examSubjectSchema],
      default: [],
    },

    // Simple lifecycle for this step. "PUBLISHED" only refers to exam
    // configuration visibility — NOT result publishing (handled in a later step).
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

examSchema.index({ college_id: 1, course_id: 1, semester: 1 });
examSchema.index({ college_id: 1, status: 1 });

module.exports = mongoose.model("Exam", examSchema);
