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
/**
 * 👨‍🎓 STUDENT DASHBOARD
 */
/* exports.studentDashboard = async (req, res) => {
  const studentId = req.user.id;

  const attendance = await AttendanceRecord.find({ student_id: studentId });
  const fee = await StudentFee.findOne({ student_id: studentId });

  res.json({
    attendanceSummary: {
      total: attendance.length,
      present: attendance.filter(a => a.status === "PRESENT").length,
      absent: attendance.filter(a => a.status === "ABSENT").length,
    },
    feeSummary: fee
      ? {
          totalFee: fee.totalFee,
          paid: fee.paidAmount,
          due: fee.totalFee - fee.paidAmount,
        }
      : null,
  });
}; */

/**
 * 👨‍🎓 ENHANCED STUDENT DASHBOARD
 */
exports.studentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const collegeId = req.college_id;

    /* =====================================================
       1️⃣ STUDENT PROFILE
    ===================================================== */

    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId,
    })
      .populate("course_id", "name")
      .populate("department_id", "name");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    /* =====================================================
       2️⃣ ATTENDANCE RECORDS
    ===================================================== */

    const attendanceRecords = await AttendanceRecord.find({
      student_id: studentId,
      college_id: collegeId,
    }).populate({
      path: "session_id",
      populate: {
        path: "subject_id",
        select: "name code",
      },
    });

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (a) => a.status === "PRESENT",
    ).length;
    const absent = attendanceRecords.filter(
      (a) => a.status === "ABSENT",
    ).length;

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    /* =====================================================
       3️⃣ SUBJECT-WISE ATTENDANCE
    ===================================================== */

    const subjectMap = {};

    attendanceRecords.forEach((record) => {
      const subject = record.session_id?.subject_id;
      if (!subject) return;

      const key = subject._id.toString();

      if (!subjectMap[key]) {
        subjectMap[key] = {
          subject: subject.name,
          code: subject.code,
          total: 0,
          present: 0,
        };
      }

      subjectMap[key].total++;

      if (record.status === "PRESENT") {
        subjectMap[key].present++;
      }
    });

    const subjectWiseAttendance = Object.values(subjectMap).map((sub) => ({
      subject: sub.subject,
      code: sub.code,
      total: sub.total,
      present: sub.present,
      percentage:
        sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0,
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
      subject: slot.subject_id?.name,
      code: slot.subject_id?.code,
      teacher: slot.teacher_id?.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      slotType: slot.slotType,
    }));

    /* =====================================================
       5️⃣ FEE SUMMARY
    ===================================================== */

    const fee = await StudentFee.findOne({
      student_id: studentId,
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
      user_id: studentId,
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
        name: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        course: student.course_id?.name,
        department: student.department_id?.name,
        semester: student.semester,
      },

      attendanceSummary: {
        total,
        present,
        absent,
        percentage,
        warning: percentage < 75,
      },

      subjectWiseAttendance,

      todayTimetable,

      feeSummary,

      latestNotifications,
    });
  } catch (error) {
    console.error("Student Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load dashboard" });
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
