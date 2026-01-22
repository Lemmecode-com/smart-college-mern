const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    code: {
      type: String,
      required: true,
      uppercase: true
    },

    semester: {
      type: Number,
      required: true
    },

    credits: {
      type: Number,
      required: true
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate subject per course & semester
subjectSchema.index(
  { college_id: 1, course_id: 1, code: 1 },
  { unique: true }
);

module.exports = mongoose.model("Subject", subjectSchema);
