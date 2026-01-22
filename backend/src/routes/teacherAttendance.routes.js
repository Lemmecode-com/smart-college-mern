const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getTeacherAttendanceReport
} = require("../controllers/teacherAttendance.controller");

// 🧑‍🏫 Teacher attendance report
router.get(
  "/teacher/report",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getTeacherAttendanceReport
);

module.exports = router;
