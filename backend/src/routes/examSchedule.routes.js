const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const examScheduleController = require("../controllers/examSchedule.controller");

// ==================== AUTHORIZATION ARCHITECTURE ====================
// Authentication (auth) and college/tenant isolation (collegeMiddleware) are
// applied on every route. EXAM_COORDINATOR is the only role permitted to
// create / read / update / publish exam schedules in this step.
// Published visibility routes additionally allow STUDENT, TEACHER, HOD.
// ====================================================================

// Published visibility route (must come before /:examId)
router.get(
  "/published/:examId",
  auth,
  role(ROLE.STUDENT, ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  examScheduleController.getPublishedSchedule
);

router.post(
  "/",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examScheduleController.createExamSchedule,
);

router.get(
  "/:examId",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examScheduleController.getExamSchedule,
);

router.put(
  "/:examId",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examScheduleController.updateExamSchedule,
);

router.post(
  "/:examId/publish",
  auth,
  role(ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  examScheduleController.publishExamSchedule,
);

module.exports = router;