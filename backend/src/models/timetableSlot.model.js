const mongoose = require("mongoose");

const TimetableSlotSchema = new mongoose.Schema(
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

    timetable_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
    },

    day: {
      type: String,
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      required: true,
    },

    startTime: {
      type: String, // "09:00"
      required: true,
    },

    endTime: {
      type: String, // "10:00"
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

    /* semester field removed — semester is stored on Timetable, not per-slot */

    room: String,

    division: {
      type: String,
      default: null,
      trim: true,
    },

    slotType: {
      type: String,
      enum: ["LECTURE", "LAB"],
      default: "LECTURE",
    },

    lectureDate: {
      type: Date,
      required: false,
      index: true,
    },
  },
  { timestamps: true },
);

// Composite index for Today's Schedule queries (HOD Dashboard)
// Supports: GET /hod/today-schedule
// Query pattern: { college_id, department_id, lectureDate, startTime }
TimetableSlotSchema.index(
  { college_id: 1, department_id: 1, lectureDate: 1, startTime: 1 },
  { background: true }
);

// Composite index for Teacher Workload queries
// Supports: GET /hod/teachers/workload
// Query pattern: { teacher_id, timetable_id }
TimetableSlotSchema.index(
  { teacher_id: 1, timetable_id: 1 },
  { background: true }
);

// Index for Timetable Health conflict detection
TimetableSlotSchema.index(
  { timetable_id: 1, day: 1, startTime: 1, endTime: 1, teacher_id: 1 },
  { background: true }
);

TimetableSlotSchema.index(
  { timetable_id: 1, day: 1, startTime: 1, endTime: 1, division: 1 },
  { background: true }
);

module.exports = mongoose.model("TimetableSlot", TimetableSlotSchema);