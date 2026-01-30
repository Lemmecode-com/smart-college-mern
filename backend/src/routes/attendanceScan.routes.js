const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  scanQrAndMarkAttendance
} = require("../controllers/attendanceScan.controller");

// 🧑‍🏫 Teacher scans student QR
router.post(
  "/scan",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  scanQrAndMarkAttendance
);

module.exports = router;
