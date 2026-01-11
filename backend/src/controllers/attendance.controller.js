const Attendance = require("../models/attendance.model");
const Course = require("../models/course.model");

/**
 * ==========================
 * TEACHER → MARK ATTENDANCE
 * ==========================
 */
exports.markAttendance = async (req, res) => {
  try {
    const { courseId, date, records } = req.body;

    if (!courseId || !date || !records?.length) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // ✅ Ensure teacher owns the course
    const course = await Course.findOne({
      _id: courseId,
      teacherId: req.user.id,
    });

    if (!course) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const docs = records.map((r) => ({
      studentId: r.studentId,
      courseId,
      markedBy: req.user.id,
      date,
      status: r.status,
    }));

    await Attendance.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Attendance already marked for this date",
      });
    }
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==================================
 * VIEW ATTENDANCE (ROLE BASED)
 * ==================================
 */
exports.getAttendance = async (req, res) => {
  try {
    const { date, courseId } = req.query;

    const filter = {};

    if (date) filter.date = date;
    if (courseId) filter.courseId = courseId;

    // 🔒 ROLE-BASED FILTERING (CRITICAL FIX)
    if (req.user.role === "teacher") {
      filter.markedBy = req.user.id;
    }

    if (req.user.role === "student") {
      filter.studentId = req.user.id;
    }

    const records = await Attendance.find(filter)
      .populate("studentId", "name rollNo")
      .populate("courseId", "name")
      .populate("markedBy", "name role")
      .sort({ date: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
