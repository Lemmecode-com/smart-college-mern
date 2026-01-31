const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");

exports.editAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendance } = req.body;

    const collegeId = req.college_id;
    const teacherId = req.user.id;

    // 1️⃣ Validate session
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

    // 2️⃣ Update attendance
    const updatedRecords = [];

    for (const item of attendance) {
      const record = await AttendanceRecord.findOneAndUpdate(
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
          upsert: true,
          new: true
        }
      );

      updatedRecords.push(record);
    }

    // ✅ IMPORTANT: return data in response
    return res.status(200).json({
      message: "Attendance updated successfully",
      sessionId,
      totalUpdated: updatedRecords.length,
      attendance: updatedRecords
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating attendance",
      error: error.message
    });
  }
};
