const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Subject = require("../models/subject.model");

/**
 * TEACHER ATTENDANCE REPORT
 */
exports.getTeacherAttendanceReport = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const collegeId = req.college_id;

    // Fetch closed sessions handled by this teacher
    const sessions = await AttendanceSession.find({
      teacher_id: teacherId,
      college_id: collegeId,
      status: "CLOSED"
    })
      .populate("subject_id", "name code")
      .populate("course_id", "name")
      .populate("department_id", "name")
      .sort({ lectureDate: -1 });

    const report = [];

    for (const session of sessions) {
      const records = await AttendanceRecord.find({
        session_id: session._id
      });

      const presentCount = records.filter(
        (r) => r.status === "PRESENT"
      ).length;

      const total = records.length;
      const absentCount = total - presentCount;

      report.push({
        lectureDate: session.lectureDate,
        lectureNumber: session.lectureNumber,
        subject: session.subject_id.name,
        subjectCode: session.subject_id.code,
        course: session.course_id.name,
        department: session.department_id.name,
        totalStudents: total,
        present: presentCount,
        absent: absentCount,
        attendancePercentage: total
          ? Math.round((presentCount / total) * 100)
          : 0
      });
    }

    res.json({
      teacherId,
      totalLectures: report.length,
      report
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};