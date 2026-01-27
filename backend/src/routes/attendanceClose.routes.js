const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  closeAttendanceSession
} = require("../controllers/attendanceClose.controller");

// 🧑‍🏫 Teacher closes attendance session
router.put(
  "/sessions/:sessionId/close-session",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  closeAttendanceSession
);

module.exports = router;
