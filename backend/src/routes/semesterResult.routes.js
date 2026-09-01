const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const semesterResultController = require("../controllers/semesterResult.controller");

// ==================== RESULT ROUTES ====================
// EXAM_COORDINATOR scope: generate, review, lock, unlock and publish
// semester results for students.
// Authentication + college/tenant isolation are applied on every route.
// =========================================================

// Generate (upsert) a semester result for one student + exam
router.post(
  "/generate",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  semesterResultController.generateResult,
);

// Student-scoped: authenticated student's own PUBLISHED results only.
// MUST be declared before /:resultId to prevent "my-results" being captured
// as a resultId param.
router.get(
  "/my-results",
  auth,
  role(ROLE.STUDENT),
  collegeMiddleware,
  semesterResultController.getMyResults,
);

// Review a single semester result (college-scoped)
router.get(
  "/:resultId",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  semesterResultController.getResult,
);

// Lock a DRAFT result (DRAFT -> LOCKED)
router.post(
  "/:resultId/lock",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  semesterResultController.lockResult,
);

// Unlock a LOCKED result (LOCKED -> DRAFT) — requires a reason
router.post(
  "/:resultId/unlock",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  semesterResultController.unlockResult,
);

// Publish a LOCKED result (LOCKED -> PUBLISHED)
router.post(
  "/:resultId/publish",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  semesterResultController.publishResult,
);

module.exports = router;
