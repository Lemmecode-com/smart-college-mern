const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getStudentAttendanceSummary
} = require("../controllers/studentAttendance.controller");
const studentMiddleware = require("../middlewares/student.middleware");

// 🎓 Student views own attendance
router.get(
  "/my-attendance/summary",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentAttendanceSummary
);

module.exports = router;
