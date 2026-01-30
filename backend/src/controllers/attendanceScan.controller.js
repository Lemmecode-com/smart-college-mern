const jwt = require("jsonwebtoken");

const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Student = require("../models/student.model");

/**
 * SCAN QR & MARK ATTENDANCE
 * Teacher-side API
 */
exports.scanQrAndMarkAttendance = async (req, res) => {
  try {
    const { qrToken, sessionId } = req.body;

    // 1️⃣ Decode & verify QR token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, process.env.QR_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired QR code" });
    }

    const { studentId, collegeId, type } = decoded;

    if (type !== "ATTENDANCE") {
      return res.status(400).json({ message: "Invalid QR type" });
    }

    // 2️⃣ Validate attendance session
    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: collegeId,
      status: "OPEN"
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found or closed"
      });
    }

    // 3️⃣ Validate student
    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId,
      status: "APPROVED"
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not eligible for attendance"
      });
    }

    // 4️⃣ Prevent duplicate attendance
    const alreadyMarked = await AttendanceRecord.findOne({
      session_id: sessionId,
      student_id: studentId
    });

    if (alreadyMarked) {
      return res.status(400).json({
        message: "Attendance already marked"
      });
    }

    // 5️⃣ Mark attendance as PRESENT
    const record = await AttendanceRecord.create({
      college_id: collegeId,
      session_id: sessionId,
      student_id: studentId,
      status: "PRESENT",
      markedBy: session.teacher_id
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      student: {
        id: student._id,
        name: student.fullName
      },
      recordId: record._id
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
