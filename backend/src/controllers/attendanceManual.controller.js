const Student = require("../models/student.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");

/**
 * GET STUDENTS FOR MANUAL ATTENDANCE
 */
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const { course_id } = req.query;

    const students = await Student.find({
      college_id: req.college_id,
      course_id,
      status: "APPROVED"
    }).select("fullName email");

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * MARK MANUAL ATTENDANCE
 */
exports.markManualAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendance } = req.body;
    // attendance = [{ student_id, status }]

    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: req.college_id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Attendance session not found or closed"
      });
    }

    const records = attendance.map((item) => ({
      college_id: req.college_id,
      session_id: sessionId,
      student_id: item.student_id,
      status: item.status,
      markedBy: session.teacher_id
    }));

    await AttendanceRecord.insertMany(records);

    res.json({ message: "Attendance marked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.editAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendance } = req.body;

    const collegeId = req.college_id;
    const teacherId = req.user.id;

    // 1️⃣ Validate OPEN session & ownership
    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: collegeId,
      teacher_id: teacherId,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Attendance session not found or already closed"
      });
    }

    // 2️⃣ Update attendance records
    for (const item of attendance) {
      await AttendanceRecord.findOneAndUpdate(
        {
          session_id: sessionId,
          student_id: item.student_id,
          college_id: collegeId
        },
        {
          status: item.status,
          markedBy: teacherId
        },
        {
          upsert: true,   // create if missing
          new: true
        }
      );
    }

    res.json({
      message: "Attendance updated successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};