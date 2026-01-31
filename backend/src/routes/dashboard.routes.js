const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { superAdminDashboard, collegeAdminDashboard, teacherDashboard, studentDashboard } = require("../controllers/dashboard.controller");

// Super Admin Dashboard
router.get(
  "/super-admin",
  auth,
  role("SUPER_ADMIN"),
  superAdminDashboard
);

// College Admin Dashboard
router.get(
  "/college-admin",
  auth,
  role("COLLEGE_ADMIN"),
  collegeAdminDashboard
);

// Teacher Dashboard
router.get(
  "/teacher",
  auth,
  role("TEACHER"),
  teacherDashboard
);

// Student Dashboard
router.get(
  "/student",
  auth,
  role("STUDENT"),
  studentDashboard
);

module.exports = router;
