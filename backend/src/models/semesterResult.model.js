const mongoose = require("mongoose");
const { RESULT_STATUS } = require("../utils/constants");

/**
 * Snapshot of a single subject's calculated outcome inside a generated
 * SemesterResult. The `subject` reference is the source of truth for identity;
 * subjectName/subjectCode are snapshotted at generation time so a result
 * remains readable even if the underlying Subject is renamed later.
 */
const subjectResultSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    subjectName: {
      type: String,
    },

    subjectCode: {
      type: String,
    },

    subjectType: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "COMPOSITE"],
      required: false,
    },

    // Raw marks as entered (mirrors StudentMarks). null === not entered.
    internalMarks: {
      type: Number,
    },

    externalMarks: {
      type: Number,
    },

    totalMarks: {
      type: Number,
    },

    internalPassed: {
      type: Boolean,
    },

    externalPassed: {
      type: Boolean,
    },

    passed: {
      type: Boolean,
      required: true,
    },

    status: {
      type: String,
      enum: ["PASS", "FAIL", "INCOMPLETE"],
      required: true,
    },

    // True when a StudentMarks document existed for the student+exam+subject at
    // generation time. False => no marks were recorded => status forced INCOMPLETE.
    marksRecorded: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false },
);

const semesterResultSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
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

    // One entry per applicable Exam subject, each produced by
    // ExamCalculationService.calculateSubjectResult using the Exam subject
    // snapshot (NOT the live Subject document).
    subjects: {
      type: [subjectResultSchema],
      default: [],
    },

    totalSubjects: {
      type: Number,
      required: true,
      default: 0,
    },

    passedSubjects: {
      type: Number,
      required: true,
      default: 0,
    },

    failedSubjects: {
      type: Number,
      required: true,
      default: 0,
    },

    incompleteSubjects: {
      type: Number,
      required: true,
      default: 0,
    },

    overallResult: {
      type: String,
      enum: ["PASS", "FAIL", "INCOMPLETE"],
      required: true,
    },

    // Result lifecycle: DRAFT -> LOCKED -> PUBLISHED.
    // - DRAFT: editable, regenerable.
    // - LOCKED: finalized; underlying StudentMarks may not be modified.
    // - PUBLISHED: publicly visible; immutable.
    status: {
      type: String,
      enum: Object.values(RESULT_STATUS),
      required: true,
      default: RESULT_STATUS.DRAFT,
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    lockedAt: {
      type: Date,
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

    // Reason captured when a LOCKED result is returned to DRAFT (for corrections).
    // Retained after re-locking to preserve an audit trail; full history lives in
    // the AuditLog service (RESULT_LOCKED / RESULT_UNLOCKED / RESULT_PUBLISHED).
    unlockReason: {
      type: String,
      trim: true,
    },

    // Point-in-time of the calculation so consumers know how fresh the data is.
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
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

// One result per student per exam (tenant-isolated). Generation upserts so
// repeated runs never create duplicates.
semesterResultSchema.index(
  { college_id: 1, student_id: 1, exam_id: 1 },
  { unique: true },
);

semesterResultSchema.index({ college_id: 1, exam_id: 1 });
semesterResultSchema.index({ college_id: 1, student_id: 1 });
semesterResultSchema.index({ college_id: 1, status: 1 });
semesterResultSchema.index({ overallResult: 1 });

module.exports = mongoose.model("SemesterResult", semesterResultSchema);
