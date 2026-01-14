const Attendance = require("../models/attendance.model");
const TeacherSubject = require("../models/teacherSubject.model");
const Subject = require("../models/subject.model");
const Student = require("../models/student.model");

/**
 * MARK ATTENDANCE (Teacher only)
 */
exports.markAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, records } = req.body;
    const userId = req.user.id;

    if (!subjectId || !date || !records || !records.length) {
      return res.status(400).json({
        message: "Subject, date and records are required"
      });
    }

    /**
     * Verify teacher is assigned to subject
     */
    const assignment = await TeacherSubject.findOne({
      subjectId,
      teacherId: userId
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this subject"
      });
    }

    /**
     * Validate subject
     */
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(400).json({ message: "Invalid subject" });
    }

    /**
     * Prepare attendance records
     */
    const attendanceDocs = records.map((r) => ({
      studentId: r.studentId,
      subjectId,
      teacherId: userId,
      date,
      status: r.status
    }));

    await Attendance.insertMany(attendanceDocs);

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully"
    });
  } catch (err) {
    // Duplicate attendance error
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Attendance already marked for this date and subject"
      });
    }
    next(err);
  }
};

/**
 * GET ATTENDANCE (Role-based)
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const { date, studentId, subjectId } = req.query;
    const role = req.user.role;

    let filter = {};

    // Student → only own data
    if (role === "student") {
      filter.studentId = req.user.id;
    }

    // Parent → only linked students (handled in parent dashboard later)

    if (studentId) filter.studentId = studentId;
    if (subjectId) filter.subjectId = subjectId;
    if (date) filter.date = date;

    const attendance = await Attendance.find(filter)
      .populate("studentId", "name rollNo")
      .populate("subjectId", "name code")
      .populate("teacherId", "name")
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance
    });
  } catch (err) {
    next(err);
  }
};
