const AttendanceSession = require("../models/attendanceSession.model");

/**
 * UPDATE ATTENDANCE SESSION
 */
exports.updateAttendanceSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { lectureDate, lectureNumber } = req.body;

    const collegeId = req.college_id;
    const teacherId = req.user.id;

    const session = await AttendanceSession.findOne({
      _id: sessionId,
      college_id: collegeId,
      teacher_id: teacherId,
      status: "OPEN",
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or already closed",
      });
    }

    if (lectureDate) session.lectureDate = new Date(lectureDate);
    if (lectureNumber) session.lectureNumber = lectureNumber;

    await session.save();

    res.json({
      message: "Attendance session updated successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 