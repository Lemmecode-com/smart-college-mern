const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const teacherMiddleware = require("../middlewares/teacher.middleware");
const studentMiddleware = require("../middlewares/student.middleware");
const { ROLE } = require("../utils/constants");

const {
  editAttendance,
  markAttendance,
  getStudentsForAttendance,
  closeAttendanceSession,
  deleteAttendanceSession,
  updateAttendanceSession,
  getAttendanceSessionById,
  getAttendanceSessions,
  createAttendanceSession,
  getAttendanceRecordsBySession,
  getAttendanceReport,
  getTeacherCourses,
  getTeacherSubjectsByCourse,
  getStudentAttendanceReport,
  getStudentAttendanceReportPDF,
  getTodaySlotsForTeacher,
} = require("../controllers/attendance.controller");

/* =========================================================
   ATTENDANCE SESSION APIs (Teacher + HOD for own subjects)
========================================================= */

// ➕ NEW: Get today's slots for teacher (for easy attendance start)
router.get(
  "/today-slots",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  getTodaySlotsForTeacher,
);

// ➕ Create attendance session
router.post(
  "/sessions",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  createAttendanceSession,
);

// 📋 Get all sessions — TEACHER, HOD and PRINCIPAL (read-only)
router.get(
  "/sessions",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getAttendanceSessions,
);

router.get(
  "/report",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  teacherMiddleware,
  getAttendanceReport,
);

router.get(
  "/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentAttendanceReport,
);

router.get(
  "/student/report",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentAttendanceReportPDF,
);

router.get(
  "/report/courses",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getTeacherCourses,
);

// 📄 Get single session — TEACHER, HOD and PRINCIPAL (read-only)
router.get(
  "/sessions/:sessionId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getAttendanceSessionById,
);

// ✏️ Update session (OPEN only)
router.put(
  "/sessions/:sessionId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  updateAttendanceSession,
);

// ❌ Delete session (OPEN only)
router.delete(
  "/sessions/:sessionId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  deleteAttendanceSession,
);

// 🔒 Close attendance session
router.put(
  "/sessions/:sessionId/close",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  closeAttendanceSession,
);

/* =========================================================
   ATTENDANCE MARKING APIs
========================================================= */

// 👨‍🎓 Get students for attendance (course-wise)
router.get(
  "/sessions/:sessionId/students",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  getStudentsForAttendance,
);

// ✅ Mark attendance (initial)
router.post(
  "/sessions/:sessionId/mark",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  markAttendance,
);

// ✏️ Edit attendance (OPEN only)
router.put(
  "/sessions/:sessionId/edit",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  editAttendance,
);

router.get(
  "/sessions/:sessionId/records",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getAttendanceRecordsBySession,
);

router.get(
  "/report/subjects/:courseId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getTeacherSubjectsByCourse,
);

router.get(
  "/report/courses",
  auth,
  role(ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL),
  collegeMiddleware,
  getTeacherCourses,
);

module.exports = router;
