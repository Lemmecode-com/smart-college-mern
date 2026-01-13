// const mongoose = require("mongoose");

// const AttendanceSchema = new mongoose.Schema(
//   {
//     studentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Student",
//       required: true,
//     },

//     courseId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Course",
//       required: true,
//     },

//     markedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User", // Teacher
//       required: true,
//     },

//     date: {
//       type: String, // YYYY-MM-DD
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["Present", "Absent"],
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// // ✅ Prevent duplicate attendance PER TEACHER
// AttendanceSchema.index(
//   { studentId: 1, courseId: 1, date: 1, markedBy: 1 },
//   { unique: true }
// );

// module.exports = mongoose.model("Attendance", AttendanceSchema);


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
      ref: "User",
      required: true
    },
    date: {
      type: Date,
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

// ❌ prevent duplicate attendance
attendanceSchema.index(
  { studentId: 1, subjectId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
