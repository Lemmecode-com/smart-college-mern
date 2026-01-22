const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getStudentsForAttendance,
  markManualAttendance,
  editAttendance
} = require("../controllers/attendanceManual.controller");

router.get(
  "/students",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getStudentsForAttendance
);

router.post(
  "/sessions/:sessionId/manual",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  markManualAttendance
);

router.put(
  "/sessions/:sessionId/edit",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  editAttendance
);

module.exports = router;
