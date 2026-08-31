const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
    },

    semester: {
      type: Number,
      required: true,
      min: [1, "Semester must be at least 1"],
      max: [8, "Semester cannot exceed 8"]
    },

    credits: {
      type: Number,
      required: true,
      min: [0, "Credits cannot be negative"]
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: false,
    },

    // ================= EXAM / MARKS CONFIGURATION =================
    // Configuration only (no student marks stored here).
    // subjectType drives which marks fields are applicable.
    // Representation: null/undefined = not configured (legacy subjects).
    // Marks are stored as-provided; null is NOT coerced to 0 and 0 is NOT
    // coerced to null, matching existing NOVAA schema conventions.
    subjectType: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "COMPOSITE"],
      required: false,
    },

    internalMaxMarks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      required: false,
    },

    externalMaxMarks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      required: false,
    },

    internalPassMarks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      required: false,
    },

    externalPassMarks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      required: false,
    },

    passMarks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      required: false,
    },
    // ==============================================================

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate subject per course & semester
subjectSchema.index({ college_id: 1, course_id: 1, code: 1 }, { unique: true });

// Composite index for HOD Subject Coverage queries
// Supports: GET /hod/subjects/coverage
// Query pattern: { department_id, teacher_id, status }
subjectSchema.index(
  { department_id: 1, teacher_id: 1, status: 1 },
  { background: true }
);

module.exports = mongoose.model("Subject", subjectSchema);