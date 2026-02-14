const mongoose = require("mongoose");

const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Course = require("../models/course.model");
const Subject = require("../models/subject.model");

/* =========================================================
   CREATE ATTENDANCE SESSION (Teacher)
========================================================= */
exports.createAttendanceSession = async (req, res) => {
  try {
    const { slot_id, lectureDate, lectureNumber } = req.body;

    if (!lectureNumber) {
      return res.status(400).json({
        message: "lectureNumber is required",
      });
    }

    const collegeId = req.college_id;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Resolve teacher
    let teacher = await Teacher.findOne({ user_id: userId });
    if (!teacher && userEmail) {
      teacher = await Teacher.findOne({ email: userEmail });
    }

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not linked with user",
      });
    }

    // Validate slot
    const slot = await TimetableSlot.findOne({
      _id: slot_id,
      teacher_id: teacher._id,
      college_id: collegeId,
    });

    if (!slot) {
      return res.status(400).json({
        message: "Invalid timetable slot for this teacher",
      });
    }

    if (!slot.department_id || !slot.course_id) {
      return res.status(500).json({
        message: "Slot data incomplete. Please recreate slot.",
      });
    }

    // Prevent duplicate
    const existing = await AttendanceSession.findOne({
      slot_id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
    });

    if (existing) {
      return res.status(400).json({
        message: "Attendance already created for this lecture",
      });
    }

    // Count students
    const totalStudents = await Student.countDocuments({
      college_id: collegeId,
      course_id: slot.course_id,
      status: "APPROVED",
    });

    // Create session
    const session = await AttendanceSession.create({
      college_id: collegeId,
      department_id: slot.department_id,
      course_id: slot.course_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id,
      slot_id: slot._id,
      lectureDate: new Date(lectureDate),
      lectureNumber,
      totalStudents,
      status: "OPEN",
    });

    res.status(201).json({
      message: "Attendance session created successfully",
      session,
    });

  } catch (error) {
    console.error("Create Attendance Session Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET ALL ATTENDANCE SESSIONS (Logged-in Teacher)
   GET /attendance/sessions
========================================================= */
exports.getAttendanceSessions = async (req, res) => {
  try {
    // 1️⃣ Resolve teacher from logged-in user
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found for this user",
      });
    }

    // 2️⃣ Fetch sessions for this teacher
    const sessions = await AttendanceSession.find({
      college_id: req.college_id,
      teacher_id: teacher._id,
    })
      .populate("subject_id", "name code")
      .populate("course_id", "name")
      .sort({ lectureDate: -1, lectureNumber: -1 });

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Get Attendance Sessions Error:", error.message);
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
   UPDATE ATTENDANCE SESSION (Only OPEN, Owner Teacher)
   PUT /attendance/sessions/:sessionId
========================================================= */
exports.updateAttendanceSession = async (req, res) => {
  try {
    const { lectureDate, lectureNumber } = req.body;
    const collegeId = req.college_id;

    /* ================= Resolve Teacher ================= */
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    /* ================= Find Session ================= */
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,   // ✅ FIX
      status: "OPEN",
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or already closed",
      });
    }

    /* ================= Update ================= */
    if (lectureDate) {
      session.lectureDate = new Date(lectureDate);
    }

    if (lectureNumber) {
      session.lectureNumber = lectureNumber;
    }

    await session.save();

    res.status(200).json({
      message: "Attendance session updated successfully",
      session,
    });

  } catch (error) {
    console.error("Update Attendance Session Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET STUDENTS FOR ATTENDANCE (AUTO – Course Wise)
   GET /attendance/sessions/:sessionId/students
========================================================= */
exports.getStudentsForAttendance = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Validate session ownership
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      return res.status(404).json({
        message: "Attendance session not found or access denied",
      });
    }

    // Fetch students
    const students = await Student.find({
      college_id: collegeId,
      course_id: session.course_id,
      status: "APPROVED",
    }).select("_id fullName email");

    res.status(200).json(students);

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
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or closed",
      });
    }

    for (let item of attendance) {
      await AttendanceRecord.findOneAndUpdate(
        {
          session_id: session._id,
          student_id: item.student_id,
        },
        {
          college_id: collegeId,
          session_id: session._id,
          student_id: item.student_id,
          status: item.status,
          markedBy: teacher._id,
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      message: "Attendance saved successfully",
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
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Validate session
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "OPEN",
    });

    if (!session) {
      return res.status(400).json({
        message: "Session not found or already closed",
      });
    }

    const updated = [];

    for (const item of attendance) {
      const record = await AttendanceRecord.findOneAndUpdate(
        {
          session_id: session._id,
          student_id: item.student_id,
          college_id: collegeId,
        },
        {
          status: item.status,
          markedBy: teacher._id,
        },
        { upsert: true, new: true }
      );

      updated.push(record);
    }

    res.status(200).json({
      message: "Attendance updated successfully",
      updatedCount: updated.length,
      attendance: updated,
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
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Delete only own OPEN session
    const session = await AttendanceSession.findOneAndDelete({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,   // ✅ FIX
      status: "OPEN",
    });

    if (!session) {
      return res.status(400).json({
        message: "Cannot delete closed or invalid session",
      });
    }

    // Remove related attendance records
    await AttendanceRecord.deleteMany({
      session_id: session._id,
    });

    res.status(200).json({
      message: "Attendance session deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   CLOSE ATTENDANCE SESSION (Teacher only, OPEN only)
   PUT /attendance/sessions/:sessionId/close
========================================================= */
exports.closeAttendanceSession = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    // Find OPEN session owned by teacher
    const session = await AttendanceSession.findOne({
      _id: req.params.sessionId,
      college_id: collegeId,
      teacher_id: teacher._id,   // ✅ FIX
      status: "OPEN",
    });

    if (!session) {
      return res.status(404).json({
        message: "Session not found or already closed",
      });
    }

    // Fetch all students for the course
    const students = await Student.find({
      college_id: collegeId,
      course_id: session.course_id,
      status: "APPROVED",
    }).select("_id");

    // Find present students
    const presentRecords = await AttendanceRecord.find({
      session_id: session._id,
    });

    const presentIds = presentRecords.map(r => r.student_id.toString());

    // Auto-mark ABSENT
    const absentees = students
      .filter(s => !presentIds.includes(s._id.toString()))
      .map(s => ({
        college_id: collegeId,
        session_id: session._id,
        student_id: s._id,
        status: "ABSENT",
        markedBy: teacher._id,
      }));

    if (absentees.length > 0) {
      await AttendanceRecord.insertMany(absentees);
    }

    session.totalStudents = students.length;
    session.status = "CLOSED";
    await session.save();

    res.status(200).json({
      message: "Attendance session closed successfully",
      totalStudents: students.length,
      present: presentIds.length,
      absent: absentees.length,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET ATTENDANCE RECORDS OF A SESSION
   GET /attendance/sessions/:sessionId/records
========================================================= */
exports.getAttendanceRecordsBySession = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const records = await AttendanceRecord.find({
      session_id: req.params.sessionId,
      college_id: collegeId,
    })
      .populate("student_id", "fullName email")
      .populate({
        path: "markedBy",
        select: "name"
      })
      .sort({ createdAt: -1 });

    res.status(200).json(records);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET TEACHER ATTENDANCE REPORT (PRODUCTION GRADE)
   GET /attendance/report
========================================================= */
exports.getAttendanceReport = async (req, res) => {
  try {
    const collegeId = req.college_id;
    const teacherId = req.teacher_id;

    const { courseId, subjectId, startDate, endDate } = req.query;

    /* ================= MATCH CONDITIONS ================= */
    const match = {
      college_id: new mongoose.Types.ObjectId(collegeId),
      teacher_id: new mongoose.Types.ObjectId(teacherId),
    };

    if (courseId) {
      match.course_id = new mongoose.Types.ObjectId(courseId);
    }

    if (subjectId) {
      match.subject_id = new mongoose.Types.ObjectId(subjectId);
    }

    if (startDate && endDate) {
      match.lectureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    /* ================= FETCH SESSIONS ================= */
    const sessions = await AttendanceSession.find(match)
      .populate("subject_id", "name")
      .sort({ lectureDate: -1 });

    const sessionIds = sessions.map(s => s._id);

    /* ================= FETCH RECORDS ================= */
    const records = await AttendanceRecord.find({
      session_id: { $in: sessionIds },
    });

    /* ================= BUILD SESSION-WISE DATA ================= */
    const sessionReport = sessions.map(session => {
      const sessionRecords = records.filter(r =>
        r.session_id.toString() === session._id.toString()
      );

      const total = sessionRecords.length;
      const present = sessionRecords.filter(r => r.status === "PRESENT").length;
      const absent = sessionRecords.filter(r => r.status === "ABSENT").length;

      const percentage =
        total > 0 ? (present / total) * 100 : 0;

      return {
        _id: session._id,
        date: session.lectureDate,
        subject: session.subject_id?.name || "N/A",
        lectureNumber: session.lectureNumber,
        present,
        absent,
        percentage,
      };
    });

    /* ================= SUMMARY ================= */
    const totalLectures = sessions.length;
    const totalStudents = records.length;
    const totalPresent = records.filter(r => r.status === "PRESENT").length;
    const totalAbsent = records.filter(r => r.status === "ABSENT").length;

    res.json({
      summary: {
        totalLectures,
        totalStudents,
        totalPresent,
        totalAbsent,
      },
      sessions: sessionReport,
    });

  } catch (error) {
    console.error("Attendance report error:", error);
    res.status(500).json({
      message: "Failed to load attendance report",
    });
  }
};

/* =========================================================
   GET STUDENT ATTENDANCE REPORT (PRODUCTION GRADE)
   GET /attendance/student
========================================================= */
/* exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const student = req.student;

    const { subjectId, startDate, endDate } = req.query;

    let sessionFilter = {
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
    };

    if (subjectId) {
      sessionFilter.subject_id = subjectId;
    }

    if (startDate && endDate) {
      sessionFilter.lectureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const sessions = await AttendanceSession.find(sessionFilter)
      .populate("subject_id", "name code")
      .sort({ lectureDate: -1 });

    const report = [];

    let total = 0;
    let present = 0;
    let absent = 0;

    for (const session of sessions) {
      const record = await AttendanceRecord.findOne({
        session_id: session._id,
        student_id: student._id,
      });

      if (!record) continue;

      total++;

      if (record.status === "PRESENT") present++;
      if (record.status === "ABSENT") absent++;

      report.push({
        date: session.lectureDate,
        subject: session.subject_id.name,
        subjectCode: session.subject_id.code,
        lectureNumber: session.lectureNumber,
        status: record.status,
      });
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const todaysSessions = await AttendanceSession.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
      lectureDate: today,
    }).populate("subject_id", "name code");

    const todaysReport = [];

    for (const session of todaysSessions) {
      const record = await AttendanceRecord.findOne({
        session_id: session._id,
        student_id: student._id,
      });

      todaysReport.push({
        subject: session.subject_id.name,
        lectureNumber: session.lectureNumber,
        status: record ? record.status : "NOT MARKED",
      });
    }

    res.json({
      summary: {
        totalLectures: total,
        present,
        absent,
        percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
      },
      sessions: report,
      today: todaysReport,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load attendance report" });
  }
}; */

exports.getStudentAttendanceReport = async (req, res) => {
  try {
    const student = req.student;

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const sessions = await AttendanceSession.find({
      college_id: req.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
    }).populate("subject_id", "name code");

    let total = 0;
    let present = 0;
    let absent = 0;

    const sessionReport = [];
    const subjectMap = {}; // 🔥 For subject-wise breakdown

    for (const session of sessions) {
      const record = await AttendanceRecord.findOne({
        session_id: session._id,
        student_id: student._id,
      });

      if (!record) continue;

      total++;

      if (record.status === "PRESENT") present++;
      if (record.status === "ABSENT") absent++;

      // Session-wise
      sessionReport.push({
        date: session.lectureDate,
        subject: session.subject_id.name,
        subjectCode: session.subject_id.code,
        lectureNumber: session.lectureNumber,
        status: record.status,
      });

      // 🔥 Subject-wise aggregation
      const subjectId = session.subject_id._id.toString();

      if (!subjectMap[subjectId]) {
        subjectMap[subjectId] = {
          subject: session.subject_id.name,
          code: session.subject_id.code,
          total: 0,
          present: 0,
        };
      }

      subjectMap[subjectId].total++;

      if (record.status === "PRESENT") {
        subjectMap[subjectId].present++;
      }
    }

    // 🔥 Convert subjectMap to array
    const subjectBreakdown = Object.values(subjectMap).map((sub) => {
      const percentage =
        sub.total > 0
          ? ((sub.present / sub.total) * 100).toFixed(2)
          : 0;

      return {
        ...sub,
        percentage,
        warning: percentage < 75, // ⚠ below 75%
      };
    });

    res.json({
      summary: {
        totalLectures: total,
        present,
        absent,
        percentage:
          total > 0 ? ((present / total) * 100).toFixed(2) : 0,
      },
      sessions: sessionReport,
      subjectWise: subjectBreakdown,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load attendance report",
    });
  }
};

/* =========================================================
  GET TEACHER'S COURSES FOR ATTENDANCE REPORT (PRODUCTION GRADE)
========================================================= */
exports.getTeacherCourses = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,   // ✅ FIXED
      college_id: collegeId,  // ✅ VERY IMPORTANT
    });

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found",
      });
    }

    if (!teacher.courses || teacher.courses.length === 0) {
      return res.json([]);
    }

    const courses = await Course.find({
      _id: { $in: teacher.courses },
      college_id: collegeId,
    }).select("name");

    res.status(200).json(courses);

  } catch (error) {
    console.error("Fetch courses error:", error);
    res.status(500).json({
      message: "Failed to fetch courses",
    });
  }
};

/* =========================================================
  GET TEACHER'S SUBJECTS FOR ATTENDANCE REPORT (PRODUCTION GRADE)
========================================================= */
exports.getTeacherSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    // Fetch subjects directly from Subject collection
    const subjects = await Subject.find({
      college_id: collegeId,
      course_id: courseId,
      teacher_id: teacher._id,  // important
      status: "ACTIVE"
    }).select("_id name code");

    res.json(subjects);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
