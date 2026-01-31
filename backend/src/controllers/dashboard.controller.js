// const Student = require("../models/student.model");
// const Department = require("../models/department.model");
// const Course = require("../models/course.model");
// const Subject = require("../models/subject.model");
// const Teacher = require("../models/teacher.model");
// const StudentFee = require("../models/studentFee.model");
// const AttendanceSession = require("../models/attendanceSession.model");

// exports.superAdminDashboard = async (req, res) => {
//   try {
//     /* ======================
//        COLLEGE STATS
//     ====================== */
//     const totalColleges = await College.countDocuments();
//     const activeColleges = await College.countDocuments({ status: "ACTIVE" });
//     const suspendedColleges = await College.countDocuments({ status: "SUSPENDED" });

//     const lastMonth = new Date();
//     lastMonth.setDate(lastMonth.getDate() - 30);

//     const newColleges = await College.countDocuments({
//       createdAt: { $gte: lastMonth }
//     });

//     /* ======================
//        USER STATS
//     ====================== */
//     const totalStudents = await Student.countDocuments();
//     const approvedStudents = await Student.countDocuments({ status: "APPROVED" });
//     const totalTeachers = await Teacher.countDocuments();

//     const collegeAdmins = await User.countDocuments({
//       role: "COLLEGE_ADMIN"
//     });

//     /* ======================
//        ACADEMIC STATS
//     ====================== */
//     const totalDepartments = await Department.countDocuments();
//     const totalCourses = await Course.countDocuments();
//     const totalSubjects = await Subject.countDocuments();

//     /* ======================
//        FINANCE STATS
//     ====================== */
//     const feeAgg = await StudentFee.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalExpected: { $sum: "$totalFee" },
//           totalPaid: { $sum: "$paidAmount" }
//         }
//       }
//     ]);

//     const totalExpectedFee = feeAgg[0]?.totalExpected || 0;
//     const totalCollectedFee = feeAgg[0]?.totalPaid || 0;
//     const totalPendingFee = totalExpectedFee - totalCollectedFee;

//     /* ======================
//        FINAL RESPONSE
//     ====================== */
//     res.json({
//       colleges: {
//         total: totalColleges,
//         active: activeColleges,
//         suspended: suspendedColleges,
//         newLast30Days: newColleges
//       },
//       users: {
//         students: totalStudents,
//         approvedStudents,
//         teachers: totalTeachers,
//         collegeAdmins
//       },
//       academics: {
//         departments: totalDepartments,
//         courses: totalCourses,
//         subjects: totalSubjects
//       },
//       finance: {
//         totalExpected: totalExpectedFee,
//         collected: totalCollectedFee,
//         pending: totalPendingFee
//       }
//     });

//   } catch (error) {
//     console.error("Super admin dashboard error:", error);
//     res.status(500).json({
//       message: "Failed to load super admin dashboard"
//     });
//   }
// };

// exports.collegeAdminDashboard = async (req, res) => {
//   try {
//     const collegeId = req.college_id;

//     /* ======================
//        STUDENT STATS
//     ====================== */
//     const totalStudents = await Student.countDocuments({ college_id: collegeId });
//     const approvedStudents = await Student.countDocuments({
//       college_id: collegeId,
//       status: "APPROVED",
//     });
//     const pendingStudents = await Student.countDocuments({
//       college_id: collegeId,
//       status: "PENDING",
//     });

//     /* ======================
//        ACADEMIC STATS
//     ====================== */
//     const totalDepartments = await Department.countDocuments({ college_id: collegeId });
//     const totalCourses = await Course.countDocuments({ college_id: collegeId });
//     const totalSubjects = await Subject.countDocuments({ college_id: collegeId });
//     const totalTeachers = await Teacher.countDocuments({ college_id: collegeId });

//     /* ======================
//        ATTENDANCE STATS
//     ====================== */
//     const attendanceAgg = await Attendance.aggregate([
//       { $match: { college_id: collegeId } },
//       {
//         $group: {
//           _id: "$student_id",
//           totalLectures: { $sum: 1 },
//           presentCount: {
//             $sum: { $cond: ["$isPresent", 1, 0] },
//           },
//         },
//       },
//       {
//         $project: {
//           percentage: {
//             $multiply: [
//               { $divide: ["$presentCount", "$totalLectures"] },
//               100,
//             ],
//           },
//         },
//       },
//     ]);

//     const atRiskStudents = attendanceAgg.filter(
//       (a) => a.percentage < 75
//     ).length;

//     const avgAttendance =
//       attendanceAgg.length === 0
//         ? 0
//         : Math.round(
//             attendanceAgg.reduce((sum, a) => sum + a.percentage, 0) /
//               attendanceAgg.length
//           );

//     /* ======================
//        FEE STATS
//     ====================== */
//     const feeAgg = await StudentFee.aggregate([
//       { $match: { college_id: collegeId } },
//       {
//         $group: {
//           _id: null,
//           totalExpected: { $sum: "$totalFee" },
//           totalPaid: { $sum: "$paidAmount" },
//         },
//       },
//     ]);

//     const totalExpectedFee = feeAgg[0]?.totalExpected || 0;
//     const totalPaidFee = feeAgg[0]?.totalPaid || 0;
//     const totalPendingFee = totalExpectedFee - totalPaidFee;

//     /* ======================
//        FINAL RESPONSE
//     ====================== */
//     res.json({
//       students: {
//         total: totalStudents,
//         approved: approvedStudents,
//         pending: pendingStudents,
//       },
//       academics: {
//         departments: totalDepartments,
//         courses: totalCourses,
//         subjects: totalSubjects,
//         teachers: totalTeachers,
//       },
//       attendance: {
//         averagePercentage: avgAttendance,
//         atRiskStudents,
//       },
//       fees: {
//         totalExpected: totalExpectedFee,
//         collected: totalPaidFee,
//         pending: totalPendingFee,
//       },
//     });
//   } catch (error) {
//     console.error("College admin dashboard error:", error);
//     res.status(500).json({ message: "Failed to load dashboard data" });
//   }
// };

// exports.teacherDashboard = async (req, res) => {
//   try {
//     const teacherId = req.user.id;
//     const collegeId = req.college_id;

//     // 1️⃣ Subjects taught
//     const subjects = await Subject.find({
//       teacher_id: teacherId,
//       college_id: collegeId
//     }).select("name");

//     // 2️⃣ Attendance sessions
//     const sessions = await AttendanceSession.find({
//       teacher_id: teacherId,
//       college_id: collegeId
//     });

//     // 3️⃣ Attendance stats
//     const attendanceAgg = await Attendance.aggregate([
//       {
//         $match: {
//           teacher_id: teacherId,
//           college_id: collegeId
//         }
//       },
//       {
//         $group: {
//           _id: "$student_id",
//           total: { $sum: 1 },
//           present: { $sum: { $cond: ["$isPresent", 1, 0] } }
//         }
//       },
//       {
//         $project: {
//           percentage: {
//             $multiply: [
//               { $divide: ["$present", "$total"] },
//               100
//             ]
//           }
//         }
//       }
//     ]);

//     const atRiskStudents = attendanceAgg.filter(
//       a => a.percentage < 75
//     ).length;

//     const avgAttendance =
//       attendanceAgg.length === 0
//         ? 0
//         : Math.round(
//             attendanceAgg.reduce((s, a) => s + a.percentage, 0) /
//               attendanceAgg.length
//           );

//     res.json({
//       teaching: {
//         subjects: subjects.map(s => s.name),
//         totalSubjects: subjects.length
//       },
//       lectures: {
//         totalSessions: sessions.length
//       },
//       attendance: {
//         averagePercentage: avgAttendance,
//         atRiskStudents
//       }
//     });

//   } catch (error) {
//     console.error("Teacher dashboard error:", error);
//     res.status(500).json({ message: "Failed to load teacher dashboard" });
//   }
// };

// exports.studentDashboard = async (req, res) => {
//   try {
//     const studentId = req.user.id;

//     // 1️⃣ Student basic info
//     const student = await Student.findById(studentId)
//       .populate("college_id", "name")
//       .populate("department_id", "name")
//       .populate("course_id", "name");

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     // 2️⃣ Attendance
//     const attendanceAgg = await Attendance.aggregate([
//       { $match: { student_id: student._id } },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: 1 },
//           present: { $sum: { $cond: ["$isPresent", 1, 0] } }
//         }
//       }
//     ]);

//     const totalLectures = attendanceAgg[0]?.total || 0;
//     const presentLectures = attendanceAgg[0]?.present || 0;
//     const attendancePercentage =
//       totalLectures === 0
//         ? 0
//         : Math.round((presentLectures / totalLectures) * 100);

//     // 3️⃣ Fee summary
//     const fee = await StudentFee.findOne({ student_id: student._id });

//     res.json({
//       profile: {
//         name: student.fullName,
//         college: student.college_id.name,
//         department: student.department_id.name,
//         course: student.course_id.name,
//         semester: student.currentSemester,
//         status: student.status
//       },
//       attendance: {
//         percentage: attendancePercentage,
//         atRisk: attendancePercentage < 75
//       },
//       fees: fee
//         ? {
//             total: fee.totalFee,
//             paid: fee.paidAmount,
//             pending: fee.totalFee - fee.paidAmount
//           }
//         : null
//     });

//   } catch (error) {
//     console.error("Student dashboard error:", error);
//     res.status(500).json({ message: "Failed to load student dashboard" });
//   }
// };



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

