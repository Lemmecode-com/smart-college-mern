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

    /* semester: {
      type: Number,
      required: true,
    }, */

    room: String,

    slotType: {
      type: String,
      enum: ["LECTURE", "LAB"],
      default: "LECTURE",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TimetableSlot", TimetableSlotSchema);
