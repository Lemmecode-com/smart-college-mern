const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const checkDataExport = require("../middlewares/checkDataExport.middleware");

const {
  getTeacherAttendanceReport
} = require("../controllers/teacherAttendance.controller");

// 🧑‍🏫 Teacher attendance report
router.get(
  "/teacher/attendance-report",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  checkDataExport,
  getTeacherAttendanceReport
);

module.exports = router;
