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
        message: "Attendance session not found or closed",
      });
    }

    const records = attendance.map(item => ({
      college_id: collegeId,
      session_id: session._id,
      student_id: item.student_id,
      status: item.status,
      markedBy: teacher._id,
    }));

    await AttendanceRecord.insertMany(records);

    res.status(200).json({
      message: "Attendance marked successfully",
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
    const { subjectId, courseId, startDate, endDate } = req.query;

    // Resolve teacher
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    // Dynamic match stage
    let match = {
      college_id: collegeId,
      teacher_id: teacher._id,
      status: "CLOSED", // Only closed sessions for report
    };

    if (subjectId)
      match.subject_id = new mongoose.Types.ObjectId(subjectId);

    if (courseId)
      match.course_id = new mongoose.Types.ObjectId(courseId);

    if (startDate && endDate) {
      match.lectureDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const sessions = await AttendanceSession.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "attendancerecords",
          localField: "_id",
          foreignField: "session_id",
          as: "records",
        },
      },

      {
        $addFields: {
          present: {
            $size: {
              $filter: {
                input: "$records",
                as: "r",
                cond: { $eq: ["$$r.status", "PRESENT"] },
              },
            },
          },
          absent: {
            $size: {
              $filter: {
                input: "$records",
                as: "r",
                cond: { $eq: ["$$r.status", "ABSENT"] },
              },
            },
          },
        },
      },

      {
        $lookup: {
          from: "subjects",
          localField: "subject_id",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },

      {
        $project: {
          date: "$lectureDate",
          subject: "$subject.name",
          lectureNumber: 1,
          present: 1,
          absent: 1,
          percentage: {
            $cond: [
              { $eq: [{ $add: ["$present", "$absent"] }, 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$present",
                      { $add: ["$present", "$absent"] },
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },

      { $sort: { date: -1 } },
    ]);

    // Summary calculation
    const summary = sessions.reduce(
      (acc, s) => {
        acc.totalLectures += 1;
        acc.totalPresent += s.present;
        acc.totalAbsent += s.absent;
        acc.totalStudents += s.present + s.absent;
        return acc;
      },
      {
        totalLectures: 0,
        totalStudents: 0,
        totalPresent: 0,
        totalAbsent: 0,
      }
    );

    res.json({ summary, sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherCourses = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher not found" });
    }

    // Get courses from timetable slots
    const slots = await TimetableSlot.find({
      teacher_id: teacher._id,
      college_id: collegeId,
    }).select("course_id");

    const courseIds = [...new Set(slots.map(s => s.course_id.toString()))];

    const courses = await Course.find({
      _id: { $in: courseIds },
    }).select("_id name");

    res.json(courses);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

    // Get subjects from timetable slots
    const slots = await TimetableSlot.find({
      teacher_id: teacher._id,
      college_id: collegeId,
      course_id: courseId,
    }).select("subject_id");

    const subjectIds = [...new Set(slots.map(s => s.subject_id.toString()))];

    const subjects = await Subject.find({
      _id: { $in: subjectIds },
    }).select("_id name code");

    res.json(subjects);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
