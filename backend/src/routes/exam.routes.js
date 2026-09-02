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
//   - Coordinator-level management routes:  EXAM_COORDINATOR
//   - Future marks routes:                TEACHER + EXAM_COORDINATOR
// ====================================================================

// Coordinator dashboard placeholder (kept for backward compatibility / Step 1 tests)
router.get(
  "/dashboard",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examController.getDashboard,
);

// Read routes: TEACHER needs exam list/detail to populate Marks Entry UI
router.get("/", auth, role(ROLE.TEACHER, ROLE.EXAM_COORDINATOR), collegeMiddleware, examController.getExams);
router.get("/:id", auth, role(ROLE.TEACHER, ROLE.EXAM_COORDINATOR), collegeMiddleware, examController.getExamById);

// Write routes: EXAM_COORDINATOR only
router.post("/", auth, role(ROLE.EXAM_COORDINATOR), collegeMiddleware, examController.createExam);
router.put("/:id", auth, role(ROLE.EXAM_COORDINATOR), collegeMiddleware, examController.updateExam);
router.put("/:id/publish", auth, role(ROLE.EXAM_COORDINATOR), collegeMiddleware, examController.publishExam);

module.exports = router;
