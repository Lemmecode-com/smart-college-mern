const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
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

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableSlot",
      required: true,
    },

    lectureDate: {
      type: Date,
      required: true,
    },

    lectureNumber: {
      type: Number,
      required: true,
    },

    totalStudents: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },

    // Auto-close tracking (FIX: Flow 3 - Attendance Auto-Close Notification)
    autoClosed: {
      type: Boolean,
      default: false,
    },

    autoClosedAt: {
      type: Date,
    },

    // ✅ SESSION SNAPSHOT (Preserves history)
    // Immutable copy of slot data at time of session creation
    // FIX: DATA-003 - Added version tracking for sync management
    slotSnapshot: {
      subject_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      subject_name: {
        type: String,
        required: true,
      },
      subject_code: {
        type: String,
        required: true,
      },
      teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      teacher_name: {
        type: String,
        required: true,
      },
      day: {
        type: String,
        enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        required: true,
      },
      startTime: {
        type: String,
        required: true,
      },
      endTime: {
        type: String,
        required: true,
      },
      room: String,
      slotType: {
        type: String,
        enum: ["LECTURE", "LAB"],
        required: true,
      }
    },

    // Snapshot version tracking (FIX: DATA-003)
    snapshotVersion: {
      type: Number,
      default: 1,
    },

    syncedAt: {
      type: Date,
    },

    // Track if snapshot was manually verified/updated
    snapshotVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

attendanceSessionSchema.index(
  { slot_id: 1, lectureDate: 1, lectureNumber: 1 },
  { unique: true }
);

// 🔥 PERFORMANCE: Indexes for common queries
// Teacher dashboard - find sessions by teacher
attendanceSessionSchema.index({ teacher_id: 1, college_id: 1 });

// Teacher dashboard - find open/closed sessions by teacher
attendanceSessionSchema.index({ teacher_id: 1, status: 1, college_id: 1 });

// Date-based queries - recent sessions
attendanceSessionSchema.index({ lectureDate: -1 });

// College-wise date filtering
attendanceSessionSchema.index({ college_id: 1, lectureDate: -1 });

// Common filter combinations
attendanceSessionSchema.index({ college_id: 1, status: 1 });

// Course-wise sessions
attendanceSessionSchema.index({ college_id: 1, course_id: 1, lectureDate: -1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);