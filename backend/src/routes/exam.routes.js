const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const examController = require("../controllers/exam.controller");

// ==================== AUTHORIZATION ARCHITECTURE ====================
// Authentication (auth) and college/tenant isolation (collegeMiddleware) are
// applied on every route. Role-based authorization is applied PER ROUTE so
// that future Exam functionality can mix roles:
//   - Coordinator-level config routes:  EXAM_COORDINATOR
//   - Future marks routes:              TEACHER + EXAM_COORDINATOR
// The previous router-wide `role(ROLE.EXAM_COORDINATOR)` restriction is removed
// to allow teachers to enter marks in a later step without reworking the router.
// ====================================================================

// Coordinator-only configuration routes
router.get(
  "/dashboard",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examController.getDashboard,
);

module.exports = router;
