const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true
    },
    status: {
      type: String,
      enum: ["Present", "Absent"],
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate attendance
attendanceSchema.index(
  { studentId: 1, subjectId: 1, date: 1 },
  { unique: true }
);

// ✅ EXPORT THE MODEL (THIS WAS MISSING)
module.exports = mongoose.model("Attendance", attendanceSchema);
