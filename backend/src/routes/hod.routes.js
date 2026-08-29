const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const hodMiddleware = require("../middlewares/hod.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  getHodDashboard,
  getHodProfile,
  getHodDepartment,
  getHodTeachers
} = require("../controllers/hod.controller");

/* ================= HOD ROUTES ================= */
// Apply middlewares to ALL HOD routes
// Allow both TEACHER and HOD roles - hodMiddleware will verify actual HOD status
router.use(auth, role(ROLE.TEACHER, ROLE.HOD), hodMiddleware, collegeMiddleware);

// HOD Dashboard
router.get("/dashboard", getHodDashboard);

// HOD Profile
router.get("/profile", getHodProfile);

// HOD Department Details
router.get("/department", getHodDepartment);

// HOD Teachers (teachers in HOD's department)
router.get("/teachers", getHodTeachers);

module.exports = router;