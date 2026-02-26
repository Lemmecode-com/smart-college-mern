const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getPromotionEligibleStudents,
  getStudentPromotionDetails,
  promoteStudent,
  bulkPromoteStudents,
  getCollegePromotionHistory,
} = require("../controllers/promotion.controller");

// All routes require authentication and COLLEGE_ADMIN role
router.use(auth);
router.use(role("COLLEGE_ADMIN"));
router.use(collegeMiddleware);

// 📋 GET all promotion eligible students with fee status
router.get(
  "/eligible-students",
  getPromotionEligibleStudents
);

// 👤 GET individual student promotion details
router.get(
  "/student/:studentId",
  getStudentPromotionDetails
);

// 🎓 PROMOTE single student to next semester
router.post(
  "/promote/:studentId",
  promoteStudent
);

// 📦 BULK PROMOTE multiple students
router.post(
  "/bulk-promote",
  bulkPromoteStudents
);

// 📜 GET college promotion history
router.get(
  "/history",
  getCollegePromotionHistory
);

module.exports = router;
