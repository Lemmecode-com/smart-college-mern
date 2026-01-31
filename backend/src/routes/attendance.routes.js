const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getStudentsForAttendance,
  markManualAttendance
} = require("../controllers/attendanceManual.controller");

const {
  editAttendance
} = require("../controllers/attendanceEdit.controller");

router.get(
  "/students",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getStudentsForAttendance
);

router.post(
  "/sessions/:sessionId/mark-attendance",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  markManualAttendance
);

router.put(
  "/sessions/:sessionId/edit-attendance",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  editAttendance
);

module.exports = router;
