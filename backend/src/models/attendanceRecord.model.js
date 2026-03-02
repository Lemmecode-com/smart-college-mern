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
    },

    // Audit trail fields (FIX: Issue #9 - Add audit trail for attendance changes)
    lastModified: {
      type: Date,
      default: Date.now
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher"
    }
  },
  { timestamps: true }
);

// Unique index to prevent duplicate attendance records for same student in same session
attendanceRecordSchema.index(
  { session_id: 1, student_id: 1 },
  { unique: true }
);

// ⚡ PERFORMANCE: Indexes for common queries
attendanceRecordSchema.index({ student_id: 1, college_id: 1 }); // Student-wise attendance
attendanceRecordSchema.index({ college_id: 1, session_id: 1 }); // Session-wise records
attendanceRecordSchema.index({ status: 1 }); // Filter by status

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);