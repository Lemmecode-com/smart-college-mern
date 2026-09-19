const mongoose = require("mongoose");

const studentMarksSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    exam_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    internalMarks: {
      type: Number,
      required: false,
      min: [0, "Marks cannot be negative"],
    },

    externalMarks: {
      type: Number,
      required: false,
      min: [0, "Marks cannot be negative"],
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

studentMarksSchema.index(
  { college_id: 1, exam_id: 1, subject_id: 1, student_id: 1 },
  { unique: true }
);

studentMarksSchema.index({ college_id: 1, exam_id: 1 });
studentMarksSchema.index({ college_id: 1, subject_id: 1 });
studentMarksSchema.index({ college_id: 1, student_id: 1 });

module.exports = mongoose.model("StudentMarks", studentMarksSchema);
