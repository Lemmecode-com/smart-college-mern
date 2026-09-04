const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const marksController = require("../controllers/marks.controller");

// ==================== MARKS ROUTES ====================
// TEACHER: enter/view marks for their own subjects
// EXAM_COORDINATOR: view/enter marks for any exam subject
// =====================================================

// Get student roster for marks entry
router.get(
  "/roster",
  auth,
  role(ROLE.TEACHER, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  marksController.getStudentRoster,
);

// Get existing marks for an exam subject
router.get(
  "/",
  auth,
  role(ROLE.TEACHER, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  marksController.getMarks,
);

// Bulk save/update marks
router.post(
  "/bulk",
  auth,
  role(ROLE.TEACHER, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  marksController.saveMarks,
);

module.exports = router;
