const mongoose = require("mongoose");

const TimetableSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    semester: {
      type: Number,
      required: true
    },

    academicYear: {
      type: String, // "2025-2026"
      required: true
    },

    name: {
      type: String,
      required: true, // human readable
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher" // HOD
    }
  },
  { timestamps: true }
);

TimetableSchema.index(
  { college_id: 1, course_id: 1, semester: 1, academicYear: 1 },
  { unique: true }
);


module.exports = mongoose.model("Timetable", TimetableSchema);