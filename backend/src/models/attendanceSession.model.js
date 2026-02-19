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

    // ✅ SESSION SNAPSHOT (Preserves history)
    // Immutable copy of slot data at time of session creation
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
    }
  },
  { timestamps: true }
);

attendanceSessionSchema.index(
  { slot_id: 1, lectureDate: 1, lectureNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
