// const AttendanceSession = require("../models/attendanceSession.model");
// const Student = require("../models/student.model");
// const Subject = require("../models/subject.model");

// /**
//  * CREATE ATTENDANCE SESSION (LECTURE)
//  * Teacher only
//  */
// exports.createAttendanceSession = async (req, res) => {
//   try {
//     const {
//       department_id,
//       course_id,
//       subject_id,
//       lectureDate,
//       lectureNumber
//     } = req.body;

//     const teacherId = req.user.id;
//     const collegeId = req.college_id;

//     // 1️⃣ Validate subject belongs to college
//     const subject = await Subject.findOne({
//       _id: subject_id,
//       college_id: collegeId
//     });

//     if (!subject) {
//       return res.status(404).json({
//         message: "Invalid subject for this college"
//       });
//     }

//     // 2️⃣ Prevent duplicate lecture session
//     const existingSession = await AttendanceSession.findOne({
//       college_id: collegeId,
//       subject_id,
//       lectureDate: new Date(lectureDate),
//       lectureNumber
//     });

//     if (existingSession) {
//       return res.status(400).json({
//         message: "Attendance session already exists for this lecture"
//       });
//     }

//     // 3️⃣ Count APPROVED students for this course
//     const totalStudents = await Student.countDocuments({
//       college_id: collegeId,
//       course_id,
//       status: "APPROVED"
//     });

//     if (totalStudents === 0) {
//       return res.status(400).json({
//         message: "No approved students found for this course"
//       });
//     }

//     // 4️⃣ Create session
//     const session = await AttendanceSession.create({
//       college_id: collegeId,
//       department_id,
//       course_id,
//       subject_id,
//       teacher_id: teacherId,
//       lectureDate: new Date(lectureDate),
//       lectureNumber,
//       totalStudents,
//       status: "OPEN"
//     });

//     res.status(201).json({
//       message: "Attendance session created successfully",
//       session
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




const AttendanceSession = require("../models/attendanceSession.model");
const Timetable = require("../models/timetable.model");
const Student = require("../models/student.model");

/**
 * CREATE ATTENDANCE SESSION (LECTURE)
 * Teacher only
 * Timetable-integrated
 */
exports.createAttendanceSession = async (req, res) => {
  try {
    const { timetable_id, lectureDate, lectureNumber } = req.body;

    const teacherId = req.user.id;
    const collegeId = req.college_id;

    // 1️⃣ Validate timetable slot
    const slot = await Timetable.findOne({
      _id: timetable_id,
      college_id: collegeId,
      teacher_id: teacherId,
      status: "ACTIVE"
    });

    if (!slot) {
      return res.status(400).json({
        message: "Invalid timetable slot for this teacher"
      });
    }

    // 2️⃣ Prevent duplicate attendance for same slot + date
    const existingSession = await AttendanceSession.findOne({
      timetable_id,
      lectureDate: new Date(lectureDate)
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Attendance already taken for this lecture"
      });
    }

    // 3️⃣ Count APPROVED students for this course
    const totalStudents = await Student.countDocuments({
      college_id: collegeId,
      course_id: slot.course_id,
      status: "APPROVED"
    });

    if (totalStudents === 0) {
      return res.status(400).json({
        message: "No approved students found for this course"
      });
    }

    // 4️⃣ Create attendance session (AUTO-FILLED FROM TIMETABLE)
    const session = await AttendanceSession.create({
      college_id: collegeId,
      department_id: slot.department_id,
      course_id: slot.course_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id,
      timetable_id: slot._id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
      totalStudents,
      status: "OPEN"
    });

    res.status(201).json({
      message: "Attendance session created successfully",
      session
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
