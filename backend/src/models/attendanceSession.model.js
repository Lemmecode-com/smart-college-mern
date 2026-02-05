// const mongoose = require("mongoose");

// const attendanceSessionSchema = new mongoose.Schema(
//   {
//     college_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "College",
//       required: true,
//     },

//     department_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Department",
//       required: true,
//     },

//     course_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Course",
//       required: true,
//     },

//     subject_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Subject",
//       required: true,
//     },

//     teacher_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Teacher",
//       required: true,
//     },

//     lectureDate: {
//       type: Date,
//       required: true,
//     },

//     lectureNumber: {
//       type: Number,
//       required: true,
//     },

//     timetable_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Timetable",
//       required: true,
//     },

//     totalStudents: {
//       type: Number,
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["OPEN", "CLOSED"],
//       default: "OPEN",
//     },
//   },
//   { timestamps: true }
// );

// // Prevent duplicate lecture attendance
// attendanceSessionSchema.index(
//   { college_id: 1, subject_id: 1, lectureDate: 1, lectureNumber: 1 },
//   { unique: true }
// );

// module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);

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

    timetable_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
    },
    slot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimetableSlot",
      required: true,
    },

    lectureDate: { type: Date, required: true },

    totalStudents: { type: Number, required: true },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
  },
  { timestamps: true },
);

// ✅ Prevent duplicate attendance per slot per day
attendanceSessionSchema.index({ slot_id: 1, lectureDate: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
