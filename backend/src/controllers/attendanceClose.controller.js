const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Student = require("../models/student.model");

/**
 * CLOSE ATTENDANCE SESSION
 * Teacher only
 */
exports.closeAttendanceSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const collegeId = req.college_id;

    // 1️⃣ Find OPEN session
    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: collegeId,
      status: "OPEN"
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found or already closed"
      });
    }

    // 2️⃣ Get all APPROVED students for the course
    const students = await Student.find({
      college_id: collegeId,
      course_id: session.course_id,
      status: "APPROVED"
    }).select("_id");

    // 3️⃣ Find already PRESENT students
    const presentRecords = await AttendanceRecord.find({
      session_id: sessionId
    }).select("student_id");

    const presentStudentIds = presentRecords.map(
      (r) => r.student_id.toString()
    );

    // 4️⃣ Mark ABSENT for students who didn’t scan
    const absentRecords = students
      .filter(
        (s) => !presentStudentIds.includes(s._id.toString())
      )
      .map((s) => ({
        college_id: collegeId,
        session_id: sessionId,
        student_id: s._id,
        status: "ABSENT",
        markedBy: session.teacher_id
      }));

    if (absentRecords.length > 0) {
      await AttendanceRecord.insertMany(absentRecords);
    }

    // 5️⃣ Close session
    session.status = "CLOSED";
    await session.save();

    res.json({
      message: "Attendance session closed successfully",
      totalStudents: students.length,
      present: presentStudentIds.length,
      absent: absentRecords.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
