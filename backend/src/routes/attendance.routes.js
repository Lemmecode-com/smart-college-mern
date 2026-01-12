const express = require("express");
const router = express.Router();

const {
  markAttendance,
  getAttendance,
} = require("../controllers/attendance.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// TEACHER → Mark attendance
router.post(
  "/",
  authMiddleware,
  roleMiddleware("teacher"),
  markAttendance
);

// ADMIN / TEACHER / STUDENT → View attendance
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "teacher", "student"),
  getAttendance
);

module.exports = router;
