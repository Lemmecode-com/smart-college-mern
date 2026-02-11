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
  const teacherId = req.user.id;
  const collegeId = req.college_id;

  const sessions = await AttendanceSession.find({
    teacher_id: teacherId,
    college_id: collegeId,
  });

  const attendanceCount = await AttendanceRecord.countDocuments({
    markedBy: teacherId,
  });

  res.json({
    stats: {
      totalLecturesTaken: sessions.length,
      attendanceMarked: attendanceCount,
    },
    recentLectures: sessions.slice(-5),
  });
};

/**
 * 🏫 COLLEGE ADMIN DASHBOARD
 */
exports.collegeAdminDashboard = async (req, res) => {
  const collegeId = req.college_id;

  const [
    students,
    teachers,
    departments,
    courses,
    pendingAdmissions,
  ] = await Promise.all([
    Student.find({ college_id: collegeId }).select("fullName status"),
    Teacher.find({ college_id: collegeId }).select("fullName email"),
    Department.find({ college_id: collegeId }),
    Course.find({ college_id: collegeId }),
    Student.find({ college_id: collegeId, status: "PENDING" }).select("fullName"),
  ]);

  res.json({
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

