const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Timetable = require("../models/timetable.model");
const Student = require("../models/student.model");

/* =========================================================
   CREATE ATTENDANCE SESSION (Teacher → Slot + Date)
   POST /attendance/sessions
========================================================= */
exports.createAttendanceSession = async (req, res) => {
  try {
    const { timetable_id, lectureDate, lectureNumber } = req.body;

    const collegeId = req.college_id;
    const teacherId = req.user.id;

    // 1️⃣ Validate timetable slot ownership
    const slot = await Timetable.findOne({
      _id: timetable_id,
      college_id: collegeId,
      teacher_id: teacherId,
      status: "ACTIVE"
    });

    if (!slot) {
      return res.status(400).json({
        message: "Invalid timetable slot for this teacher"
      });
    }

    // 2️⃣ Prevent duplicate session
    const exists = await AttendanceSession.findOne({
      timetable_id,
      lectureDate: new Date(lectureDate),
      lectureNumber
    });

    if (exists) {
      return res.status(400).json({
        message: "Attendance session already exists for this lecture"
      });
    }

    // 3️⃣ Count students (course-wise)
    const totalStudents = await Student.countDocuments({
      college_id: collegeId,
      course_id: slot.course_id,
      status: "APPROVED"
    });

    if (totalStudents === 0) {
      return res.status(400).json({
        message: "No approved students found for this course"
      });
    }

    // 4️⃣ Create session
    const session = await AttendanceSession.create({
      college_id: collegeId,
      department_id: slot.department_id,
      course_id: slot.course_id,
      subject_id: slot.subject_id,
      teacher_id: teacherId,
      timetable_id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
      totalStudents,
      status: "OPEN"
    });

    res.status(201).json({
      message: "Attendance session created successfully",
      session
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET ALL ATTENDANCE SESSIONS (Teacher)
   GET /attendance/sessions
========================================================= */
exports.getAttendanceSessions = async (req, res) => {
  try {
    const sessions = await AttendanceSession.find({
      college_id: req.college_id,
      teacher_id: req.user.id
    })
      .populate("subject_id", "name code")
      .populate("course_id", "name")
      .sort({ lectureDate: -1, lectureNumber: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET SINGLE ATTENDANCE SESSION
   GET /attendance/sessions/:sessionId
========================================================= */
exports.getAttendanceSessionById = async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id
    })
      .populate("subject_id", "name code")
      .populate("course_id", "name");

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found"
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   UPDATE ATTENDANCE SESSION (Only OPEN)
   PUT /attendance/sessions/:sessionId
========================================================= */
exports.updateAttendanceSession = async (req, res) => {
  try {
    const { lectureDate, lectureNumber } = req.body;

    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id,
      teacher_id: req.user.id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or already closed"
      });
    }

    if (lectureDate) session.lectureDate = new Date(lectureDate);
    if (lectureNumber) session.lectureNumber = lectureNumber;

    await session.save();

    res.json({
      message: "Attendance session updated successfully",
      session
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   DELETE ATTENDANCE SESSION (Teacher only, OPEN only)
   DELETE /attendance/sessions/:sessionId
========================================================= */
exports.deleteAttendanceSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findOneAndDelete({
      _id: req.params.sessionId,
      college_id: req.college_id,
      teacher_id: req.user.id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Cannot delete closed or invalid session"
      });
    }

    await AttendanceRecord.deleteMany({
      session_id: session._id
    });

    res.json({
      message: "Attendance session deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   CLOSE ATTENDANCE SESSION
   PUT /attendance/sessions/:sessionId/close
========================================================= */
exports.closeAttendanceSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id,
      teacher_id: req.user.id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(404).json({
        message: "Session not found or already closed"
      });
    }

    // Fetch all students
    const students = await Student.find({
      college_id: req.college_id,
      course_id: session.course_id,
      status: "APPROVED"
    }).select("_id");

    // Present students
    const presentRecords = await AttendanceRecord.find({
      session_id: session._id
    });

    const presentIds = presentRecords.map(r => r.student_id.toString());

    // Mark ABSENT
    const absentees = students
      .filter(s => !presentIds.includes(s._id.toString()))
      .map(s => ({
        college_id: req.college_id,
        session_id: session._id,
        student_id: s._id,
        status: "ABSENT",
        markedBy: session.teacher_id
      }));

    if (absentees.length) {
      await AttendanceRecord.insertMany(absentees);
    }

    session.status = "CLOSED";
    await session.save();

    res.json({
      message: "Attendance session closed successfully",
      totalStudents: students.length,
      present: presentIds.length,
      absent: absentees.length
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET STUDENTS FOR ATTENDANCE (AUTO – Course Wise)
   GET /attendance/sessions/:sessionId/students
========================================================= */
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found"
      });
    }

    const students = await Student.find({
      college_id: req.college_id,
      course_id: session.course_id,
      status: "APPROVED"
    }).select("_id fullName email");

    res.json(students);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   MARK ATTENDANCE (Initial)
   POST /attendance/sessions/:sessionId/mark
========================================================= */
exports.markAttendance = async (req, res) => {
  try {
    const { attendance } = req.body;

    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Attendance session not found or closed"
      });
    }

    const records = attendance.map(item => ({
      college_id: req.college_id,
      session_id: session._id,
      student_id: item.student_id,
      status: item.status,
      markedBy: session.teacher_id
    }));

    await AttendanceRecord.insertMany(records);

    res.json({
      message: "Attendance marked successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   EDIT ATTENDANCE (While OPEN)
   PUT /attendance/sessions/:sessionId/edit
========================================================= */
exports.editAttendance = async (req, res) => {
  try {
    const { attendance } = req.body;

    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: req.college_id,
      teacher_id: req.user.id,
      status: "OPEN"
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or already closed"
      });
    }

    const updated = [];

    for (const item of attendance) {
      const record = await AttendanceRecord.findOneAndUpdate(
        {
          session_id: session._id,
          student_id: item.student_id,
          college_id: req.college_id
        },
        {
          status: item.status,
          markedBy: req.user.id
        },
        { upsert: true, new: true }
      );

      updated.push(record);
    }

    res.json({
      message: "Attendance updated successfully",
      updatedCount: updated.length,
      attendance: updated
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
