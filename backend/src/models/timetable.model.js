const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    // 🔹 Academic Mapping
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

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },

    // 🔹 Time Definition (Weekly)
    dayOfWeek: {
      type: String,
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      required: true
    },

    startTime: {
      type: String, // "10:00"
      required: true
    },

    endTime: {
      type: String, // "11:00"
      required: true
    },

    // 🔹 Context
    academicYear: {
      type: String, // "2024-2025"
      required: true
    },

    semester: {
      type: Number,
      required: true
    },

    lectureType: {
      type: String,
      enum: ["THEORY", "PRACTICAL"],
      default: "THEORY"
    },

    room: {
      type: String // Optional
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate slot for same course + subject + time
timetableSchema.index(
  {
    college_id: 1,
    course_id: 1,
    dayOfWeek: 1,
    startTime: 1
  },
  { unique: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
