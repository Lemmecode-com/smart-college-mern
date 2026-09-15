const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  getPromotionEligibleStudents,
  getStudentPromotionDetails,
  promoteStudent,
  bulkPromoteStudents,
  getCollegePromotionHistory,
} = require("../controllers/promotion.controller");
const {
  getPromotionEligibility,
  getStudentBacklogs,
  recommendPromotionDecision,
  approvePromotionDecision,
  rejectPromotionDecision,
  executePromotionDecision,
} = require("../controllers/promotionDecision.controller");
const {
  createAttempt,
  evaluateAttempt,
  getBacklogAttempts,
} = require("../controllers/backlogAttempt.controller");

// All routes require authentication and COLLEGE_ADMIN / ADMISSION_OFFICER role
router.use(auth);
router.use(role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER));
router.use(collegeMiddleware);

// 📋 GET all promotion eligible students with fee status
router.get("/eligible-students", getPromotionEligibleStudents);

// 👤 GET individual student promotion details
router.get("/student/:studentId", getStudentPromotionDetails);

// Read-only, explainable academic promotion eligibility decision.
router.get("/eligibility/:studentId", getPromotionEligibility);

// Read-only backlog records for the authenticated college.
router.get("/backlogs/:studentId", getStudentBacklogs);

router.post("/backlogs/:backlogId/attempts", createAttempt);
router.post("/backlogs/:backlogId/attempts/:attemptId/evaluate", evaluateAttempt);
router.get("/backlogs/:backlogId/attempts", getBacklogAttempts);

router.post("/decisions/:decisionId/recommend", recommendPromotionDecision);
router.post("/decisions/:decisionId/approve", approvePromotionDecision);
router.post("/decisions/:decisionId/reject", rejectPromotionDecision);
router.post("/decisions/:decisionId/execute", executePromotionDecision);

// 🎓 PROMOTE single student to next semester
router.post("/promote/:studentId", promoteStudent);

// 📦 BULK PROMOTE multiple students
router.post("/bulk-promote", bulkPromoteStudents);

// 📜 GET college promotion history
router.get("/history", getCollegePromotionHistory);

module.exports = router;
