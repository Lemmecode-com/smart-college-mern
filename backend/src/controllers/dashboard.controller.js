const Student = require("../models/student.model");
const Teacher = require("../models/teacher.model");
const Course = require("../models/course.model");
const Department = require("../models/department.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const StudentFee = require("../models/studentFee.model");
const College = require("../models/college.model");

/**
 * 👨‍🎓 STUDENT DASHBOARD
 */
exports.studentDashboard = async (req, res) => {
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
    const openSessions = sessions.filter(s => s.status === "OPEN").length;
    const closedSessions = sessions.filter(s => s.status === "CLOSED").length;

    const totalPresent = records.filter(r => r.status === "PRESENT").length;
    const totalAbsent = records.filter(r => r.status === "ABSENT").length;

    const attendanceMarked = records.length;

    const attendancePercentage =
      attendanceMarked > 0
        ? ((totalPresent / attendanceMarked) * 100).toFixed(2)
        : 0;

    const totalStudentsHandled = sessions.reduce(
      (sum, s) => sum + (s.totalStudents || 0),
      0
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
      College.findById(collegeId).select("name code email establishedYear logo"),
      Student.find({ college_id: collegeId }).select("fullName status"),
      Teacher.find({ college_id: collegeId }).select("fullName email"),
      Department.find({ college_id: collegeId }),
      Course.find({ college_id: collegeId }),
      Student.find({ college_id: collegeId, status: "PENDING" }).select("fullName"),
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

