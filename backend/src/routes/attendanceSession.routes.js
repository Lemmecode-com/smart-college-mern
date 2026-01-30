const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createAttendanceSession
} = require("../controllers/attendanceSession.controller");

// 🧑‍🏫 Teacher creates attendance session
router.post(
  "/sessions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createAttendanceSession
);

module.exports = router;
