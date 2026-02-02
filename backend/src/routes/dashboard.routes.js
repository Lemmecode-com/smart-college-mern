const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  studentDashboard,
  teacherDashboard,
  collegeAdminDashboard,
  superAdminDashboard,
} = require("../controllers/dashboard.controller");

// 👨‍🎓 Student Dashboard
router.get(
  "/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentDashboard
);

// 👩‍🏫 Teacher Dashboard
router.get(
  "/teacher",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  teacherDashboard
);

// 🏫 College Admin Dashboard
router.get(
  "/college-admin",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  collegeAdminDashboard
);

// 🧑‍💼 Super Admin Dashboard
router.get(
  "/super-admin",
  auth,
  role("SUPER_ADMIN"),
  superAdminDashboard
);

module.exports = router;
