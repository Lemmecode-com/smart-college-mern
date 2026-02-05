const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
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
} = require("../controllers/attendance.controller");

/* =========================================================
   ATTENDANCE SESSION APIs (Teacher)
========================================================= */

// ➕ Create attendance session
router.post(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createAttendanceSession,
);

// 📋 Get all sessions (teacher-wise)
router.get(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getAttendanceSessions,
);

// 📄 Get single session
router.get(
  "/sessions/:sessionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getAttendanceSessionById,
);

// ✏️ Update session (OPEN only)
router.put(
  "/sessions/:sessionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  updateAttendanceSession,
);

// ❌ Delete session (OPEN only)
router.delete(
  "/sessions/:sessionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  deleteAttendanceSession,
);

// 🔒 Close attendance session
router.put(
  "/sessions/:sessionId/close",
  auth,
  role("TEACHER"),
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
  role("TEACHER"),
  collegeMiddleware,
  getStudentsForAttendance,
);

// ✅ Mark attendance (initial)
router.post(
  "/sessions/:sessionId/mark",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  markAttendance,
);

// ✏️ Edit attendance (OPEN only)
router.put(
  "/sessions/:sessionId/edit",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  editAttendance,
);

module.exports = router;
