const express = require("express");
const router = express.Router();

const {
  markAttendance,
  getAttendance
} = require("../controllers/attendance.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

/**
 * Teacher → Mark attendance
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("teacher"),
  markAttendance
);

/**
 * View attendance (role-filtered)
 */
router.get(
  "/",
  authMiddleware,
  getAttendance
);

module.exports = router;

