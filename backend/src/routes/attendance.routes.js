
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const attendanceCtrl = require("../controllers/attendance.controller");

// Teacher
router.post(
  "/mark",
  auth,
  role("teacher"),
  attendanceCtrl.markAttendance
);

// Student
router.get(
  "/my",
  auth,
  role("student"),
  attendanceCtrl.getMyAttendance
);

// Parent
router.get(
  "/child",
  auth,
  role("parent"),
  attendanceCtrl.getChildAttendance
);

// Admin / CollegeAdmin
router.get(
  "/report",
  auth,
  role("admin", "collegeAdmin"),
  attendanceCtrl.getAttendanceReport
);

module.exports = router;
