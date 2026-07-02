const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const parentMiddleware = require("../middlewares/parent.middleware");
const { ROLE } = require("../utils/constants");

const parentController = require("../controllers/parent.controller");

// All routes require PARENT_GUARDIAN role and parent scoping middleware
router.use(auth, role(ROLE.PARENT_GUARDIAN), collegeMiddleware, parentMiddleware);

// GET /api/parent/children — list linked students
router.get("/children", parentController.getChildren);

// GET /api/parent/student/:studentId/profile — child profile
router.get("/student/:studentId/profile", parentController.getChildProfile);

// GET /api/parent/student/:studentId/attendance — child attendance
router.get("/student/:studentId/attendance", parentController.getChildAttendance);

// GET /api/parent/student/:studentId/fees — child fees
router.get("/student/:studentId/fees", parentController.getChildFees);

module.exports = router;
