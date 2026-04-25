const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const studentMiddleware = require("../middlewares/student.middleware");
const { ROLE } = require("../utils/constants");

const {
  studentDashboard,
  teacherDashboard,
  collegeAdminDashboard,
  superAdminDashboard,
  publicStats,
} = require("../controllers/dashboard.controller");

// 👨‍🎓 Student Dashboard
router.get(
  "/student",
  auth,
  role(ROLE.STUDENT),
  collegeMiddleware,
  // studentMiddleware,
  studentDashboard,
);

// 👩‍🏫 Teacher Dashboard
router.get(
  "/teacher",
  auth,
  role(ROLE.TEACHER),
  collegeMiddleware,
  teacherDashboard,
);

// 🏫 College Admin Dashboard — also accessible by PRINCIPAL (read-only)
router.get(
  "/college-admin",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  collegeAdminDashboard,
);

// 🧑‍💼 Super Admin Dashboard
router.get("/super-admin", auth, role(ROLE.SUPER_ADMIN), superAdminDashboard);

// 🌍 Public Stats (Landing Page — No Auth)
router.get("/public-stats", publicStats);

module.exports = router;
