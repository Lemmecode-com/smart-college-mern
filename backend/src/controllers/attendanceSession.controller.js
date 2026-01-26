const AttendanceSession = require("../models/attendanceSession.model");
const Timetable = require("../models/timetable.model");
const Student = require("../models/student.model");

/**
 * CREATE ATTENDANCE SESSION
 */
const createAttendanceSession = async (req, res) => {
  try {
    const { timetable_id, lectureDate, lectureNumber } = req.body;

    const teacherId = req.user.id;
    const collegeId = req.college_id;

    const slot = await Timetable.findOne({
      _id: timetable_id,
      college_id: collegeId,
      teacher_id: teacherId,
      status: "ACTIVE",
    });

    if (!slot) {
      return res.status(400).json({
        message: "Invalid timetable slot for this teacher",
      });
    }

    const existingSession = await AttendanceSession.findOne({
      timetable_id,
      lectureDate: new Date(lectureDate),
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Attendance already taken for this lecture",
      });
    }

    const totalStudents = await Student.countDocuments({
      college_id: collegeId,
      course_id: slot.course_id,
      status: "APPROVED",
    });

    if (totalStudents === 0) {
      return res.status(400).json({
        message: "No approved students found for this course",
      });
    }

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
      status: "OPEN",
    });

    res.status(201).json({
      message: "Attendance session created successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET ALL ATTENDANCE SESSIONS (Teacher)
 */
const getAttendanceSessions = async (req, res) => {
  try {
    const collegeId = req.college_id;
    const teacherId = req.user.id;

    const sessions = await AttendanceSession.find({
      college_id: collegeId,
      teacher_id: teacherId,
    }).sort({ lectureDate: -1, lectureNumber: -1 });

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET SINGLE ATTENDANCE SESSION
 */
const getAttendanceSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const collegeId = req.college_id;

    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: collegeId,
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found",
      });
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceSessionById,
};
