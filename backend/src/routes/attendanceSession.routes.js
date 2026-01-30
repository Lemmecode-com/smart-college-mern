// const express = require("express");
// const router = express.Router();

// const auth = require("../middlewares/auth.middleware");
// const role = require("../middlewares/role.middleware");
// const collegeMiddleware = require("../middlewares/college.middleware");

// const {
//   createAttendanceSession
// } = require("../controllers/attendanceSession.controller");

// // 🧑‍🏫 Teacher creates attendance session
// router.post(
//   "/sessions",
//   auth,
//   role("TEACHER"),
//   collegeMiddleware,
//   createAttendanceSession
// );

// module.exports = router;


const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware.js");
const role = require("../middlewares/role.middleware.js");
const collegeMiddleware = require("../middlewares/college.middleware.js");

const {
  createAttendanceSession,
  getAttendanceSessions,
  getAttendanceSessionById,
} = require("../controllers/attendanceSession.controller.js");

const {
  updateAttendanceSession,
} = require("../controllers/attendanceSession.update.controller.js");

const {
  closeAttendanceSession,
} = require("../controllers/attendanceClose.controller.js");

// ➕ Create session
router.post(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createAttendanceSession
);

// 👀 View all sessions
router.get(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getAttendanceSessions
);

// 👀 View single session
router.get(
  "/sessions/:sessionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getAttendanceSessionById
);

// ✏️ Update session
router.put(
  "/sessions/:sessionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  updateAttendanceSession
);

// 🔒 Close session
router.put(
  "/sessions/:sessionId/close",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  closeAttendanceSession
);

module.exports = router;
