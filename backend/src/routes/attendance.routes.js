// const express = require("express");
// const router = express.Router();

// const {
//   markAttendance,
//   getAttendance,
// } = require("../controllers/attendance.controller");

// const authMiddleware = require("../middleware/auth.middleware");
// const roleMiddleware = require("../middleware/role.middleware");

// // TEACHER → Mark attendance
// router.post(
//   "/",
//   authMiddleware,
//   roleMiddleware("teacher"),
//   markAttendance
// );

// // ADMIN / TEACHER / STUDENT → View attendance
// router.get(
//   "/",
//   authMiddleware,
//   roleMiddleware("admin", "teacher", "student"),
//   getAttendance
// );

// module.exports = router;

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");

const {
  markAttendance,
  getMyAttendance
} = require("../controllers/attendance.controller");

// Teacher only
router.post("/", auth, role("teacher"), markAttendance);

// Student + Parent
router.get("/my", auth, getMyAttendance);

module.exports = router;

