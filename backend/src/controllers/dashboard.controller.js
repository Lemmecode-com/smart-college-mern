const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Course = require("../models/course.model");
const Department = require("../models/department.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const StudentFee = require("../models/studentFee.model");
const College = require("../models/college.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Notification = require("../models/notification.model");
const NotificationRead = require("../models/notificationRead.model");
const AppError = require("../utils/AppError");

/**
 * 👨‍🎓 STUDENT DASHBOARD
 */
exports.studentDashboard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const collegeId = req.college_id;

    if (!userId || !collegeId) {
      throw new AppError("User ID or College ID missing", 400, "INVALID_REQUEST");
    }

    /* =====================================================
       1️⃣ STUDENT PROFILE
    ===================================================== */

    // ✅ Use user_id instead of _id
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId,
    })
      .populate("course_id", "name")
      .populate("department_id", "name");

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    /* =====================================================
       2️⃣ ATTENDANCE RECORDS (OPTIMIZED WITH AGGREGATION)
    ===================================================== */

    // ⚡ PERFORMANCE: Use aggregation instead of loading all records
    const attendanceStats = await AttendanceRecord.aggregate([
      {
        $match: {
          student_id: student._id,
          college_id: collegeId
        }
      },
      {
        $lookup: {
          from: "attendancesessions",
          localField: "session_id",
          foreignField: "_id",
          as: "session"
        }
      },
      {
        $unwind: "$session"
      },
      {
        $lookup: {
          from: "subjects",
          localField: "session.subject_id",
          foreignField: "_id",
          as: "subject"
        }
      },
      {
        $unwind: "$subject"
      },
      {
        $group: {
          _id: "$subject._id",
          subjectName: { $first: "$subject.name" },
          subjectCode: { $first: "$subject.code" },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] }
          }
        }
      }
    ]);

    // Calculate overall attendance
    const total = attendanceStats.reduce((sum, s) => sum + s.total, 0);
    const present = attendanceStats.reduce((sum, s) => sum + s.present, 0);
    const absent = total - present; // ✅ Calculate absent
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Format subject-wise attendance with null safety
    const subjectWiseAttendance = attendanceStats.map(stat => ({
      subject: stat.subjectName || "Unknown",
      code: stat.subjectCode || "N/A",
      total: stat.total || 0,
      present: stat.present || 0,
      percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
    }));

    /* =====================================================
       4️⃣ TODAY TIMETABLE (FILTERED BY COURSE + SEMESTER)
    ===================================================== */

    const todayName = new Date()
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase(); // MON, TUE etc

    const todaySlots = await TimetableSlot.find({
      college_id: collegeId,
      day: todayName,
      semester: student.semester,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .sort({ startTime: 1 });

    const todayTimetable = todaySlots.map((slot) => ({
      subject: slot.subject_id?.name || "No Subject",
      code: slot.subject_id?.code || "N/A",
      teacher: slot.teacher_id?.name || "TBA",
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room || "TBA",
      slotType: slot.slotType || "Regular",
    }));

    /* =====================================================
       5️⃣ FEE SUMMARY
    ===================================================== */

    const fee = await StudentFee.findOne({
      student_id: student._id,  // ✅ Use student._id (not user_id)
    });

    let feeSummary = null;

    if (fee) {
      const due = fee.totalFee - fee.paidAmount;

      feeSummary = {
        totalFee: fee.totalFee,
        paid: fee.paidAmount,
        due,
        paymentStatus:
          due === 0 ? "PAID" : due < fee.totalFee ? "PARTIAL" : "DUE",
      };
    }

    /* =====================================================
       6️⃣ LATEST NOTIFICATIONS
    ===================================================== */

    const readRecords = await NotificationRead.find({
      user_id: student.user_id,  // ✅ Use student.user_id
    }).select("notification_id");

    const readIds = readRecords.map((r) => r.notification_id);

    const latestNotifications = await Notification.find({
      college_id: student.college_id,
      isActive: true,
      target: { $in: ["ALL", "STUDENTS"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }],
      _id: { $nin: readIds },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    latestNotifications: latestNotifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      actionUrl: n.actionUrl,
      createdAt: n.createdAt,
    }));

    /* =====================================================
       7️⃣ FINAL RESPONSE
    ===================================================== */

    res.json({
      student: {
        name: student.fullName || "Student",
        enrollmentNumber: student.enrollmentNumber || "N/A",
        course: student.course_id?.name || "Not Assigned",
        department: student.department_id?.name || "Not Assigned",
        semester: student.currentSemester || student.semester || 1,
      },

      attendanceSummary: {
        total: total || 0,
        present: present || 0,
        absent: absent || 0,
        percentage: percentage || 0,
        warning: percentage < 75,
      },

      subjectWiseAttendance,
      todayTimetable,
      feeSummary,
      latestNotifications: latestNotifications || [],
    });
  } catch (error) {
    console.error('❌ [DASHBOARD] Student Dashboard Error:', error);
    console.error('❌ [DASHBOARD] Error Stack:', error.stack);
    next(error);
  }
};

/**
 * 👩‍🏫 TEACHER DASHBOARD
 */
exports.teacherDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const collegeId = req.college_id;

    // 🔹 Get Teacher Info
    const teacher = await Teacher.findOne({
      user_id: userId,
      college_id: collegeId,
    }).select("name email employeeId");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // 🔹 Get Sessions
    const sessions = await AttendanceSession.find({
      teacher_id: teacher._id,
      college_id: collegeId,
    })
      .populate("course_id", "name code")
      .populate("subject_id", "name code")
      .populate("department_id", "name code")
      .sort({ createdAt: -1 });

    // 🔹 Attendance Records
    const records = await AttendanceRecord.find({
      markedBy: teacher._id,
    });

    // 🔹 Stats Calculations
    const totalLecturesTaken = sessions.length;
    const openSessions = sessions.filter((s) => s.status === "OPEN").length;
    const closedSessions = sessions.filter((s) => s.status === "CLOSED").length;

    const totalPresent = records.filter((r) => r.status === "PRESENT").length;
    const totalAbsent = records.filter((r) => r.status === "ABSENT").length;

    const attendanceMarked = records.length;

    const attendancePercentage =
      attendanceMarked > 0
        ? ((totalPresent / attendanceMarked) * 100).toFixed(2)
        : 0;

    const totalStudentsHandled = sessions.reduce(
      (sum, s) => sum + (s.totalStudents || 0),
      0,
    );

    res.json({
      teacher: {
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
      },
      stats: {
        totalLecturesTaken,
        openSessions,
        closedSessions,
        attendanceMarked,
        totalStudentsHandled,
        totalPresent,
        totalAbsent,
        attendancePercentage,
      },
      recentLectures: sessions.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 👩‍🏫 COLLEGE ADMIN DASHBOARD
 */
exports.collegeAdminDashboard = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const [
      college,
      students,
      teachers,
      departments,
      courses,
      pendingAdmissions,
    ] = await Promise.all([
      College.findById(collegeId).select(
        "name code email establishedYear logo",
      ),
      Student.find({ college_id: collegeId }).select("fullName status"),
      Teacher.find({ college_id: collegeId }).select("fullName email"),
      Department.find({ college_id: collegeId }),
      Course.find({ college_id: collegeId }),
      Student.find({ college_id: collegeId, status: "PENDING" }).select(
        "fullName",
      ),
    ]);

    res.json({
      college: {
        id: college?._id,
        name: college?.name,
        code: college?.code,
        email: college?.email,
        establishedYear: college?.establishedYear,
        logo: college?.logo,
      },

      stats: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalDepartments: departments.length,
        totalCourses: courses.length,
        pendingAdmissions: pendingAdmissions.length,
      },

      recentStudents: students.slice(-5),
      pendingAdmissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 🧑‍💼 SUPER ADMIN DASHBOARD
 */
exports.superAdminDashboard = async (req, res) => {
  const [colleges, students, teachers] = await Promise.all([
    College.find().select("name status"),
    Student.countDocuments(),
    Teacher.countDocuments(),
  ]);

  res.json({
    stats: {
      totalColleges: colleges.length,
      totalStudents: students,
      totalTeachers: teachers,
    },
    colleges,
  });
};