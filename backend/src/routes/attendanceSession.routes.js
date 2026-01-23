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

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

// Import controllers from correct files
const { createAttendanceSession } = require("../controllers/attendanceSession.controller");
const { closeAttendanceSession } = require("../controllers/attendanceClose.controller");

// 🧑‍🏫 Create attendance session
router.post(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createAttendanceSession
);

// 🔒 Close attendance session
router.put(
  "/sessions/:sessionId/close",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  closeAttendanceSession
);

module.exports = router;
