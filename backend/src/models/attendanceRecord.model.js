const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema(
  {
    college_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true
    },

    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true
    },

    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      required: true
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    }
  },
  { timestamps: true }
);

attendanceRecordSchema.index(
  { session_id: 1, student_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
