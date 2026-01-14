const Attendance = require("../models/attendance.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");

/* =========================
   MARK ATTENDANCE (TEACHER)
========================= */
exports.markAttendance = async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;
    // records = [{ studentId, status }]

    if (!subjectId || !date || !records?.length) {
      return res.status(400).json({
        message: "subjectId, date and records are required"
      });
    }

    /* 🔒 FUTURE DATE VALIDATION */
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (attendanceDate > today) {
      return res.status(400).json({
        message: "Cannot mark attendance for a future date"
      });
    }

    /* 🔐 TEACHER VALIDATION */
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found"
      });
    }

    /* 🔐 SUBJECT ASSIGNMENT CHECK */
    if (!teacher.subjectIds.includes(subjectId)) {
      return res.status(403).json({
        message: "You are not assigned to this subject"
      });
    }

    /* 🧾 PREPARE ATTENDANCE RECORDS */
    const attendanceDocs = records.map((r) => ({
      studentId: r.studentId,
      subjectId,
      teacherId: teacher._id,
      date,
      status: r.status
    }));

    /* 💾 SAVE (UNIQUE INDEX PREVENTS DUPLICATES) */
    await Attendance.insertMany(attendanceDocs);

    res.status(201).json({
      message: "Attendance marked successfully"
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Attendance already marked for this date"
      });
    }

    res.status(500).json({
      message: "Failed to mark attendance",
      error: err.message
    });
  }
};

/* =========================
   STUDENT: VIEW OWN
========================= */
exports.getMyAttendance = async (req, res) => {
  const attendance = await Attendance.find({
    studentId: req.user.studentId
  })
    .populate("subjectId", "name")
    .sort({ date: -1 });

  res.json(attendance);
};

/* =========================
   PARENT: VIEW CHILD
========================= */
exports.getChildAttendance = async (req, res) => {
  const students = await Student.find({
    parentId: req.user.parentId
  }).select("_id");

  const attendance = await Attendance.find({
    studentId: { $in: students.map(s => s._id) }
  })
    .populate("studentId", "name rollNo")
    .populate("subjectId", "name")
    .sort({ date: -1 });

  res.json(attendance);
};

/* =========================
   ADMIN / COLLEGE ADMIN
========================= */
exports.getAttendanceReport = async (req, res) => {
  const { date, subjectId } = req.query;

  const filter = {};
  if (date) filter.date = date;
  if (subjectId) filter.subjectId = subjectId;

  const attendance = await Attendance.find(filter)
    .populate("studentId", "name rollNo")
    .populate("subjectId", "name")
    .populate("teacherId", "name");

  res.json(attendance);
};