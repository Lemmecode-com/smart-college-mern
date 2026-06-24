const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const examController = require("../controllers/exam.controller");

// All exam coordinator routes
router.use(auth, role(ROLE.EXAM_COORDINATOR), collegeMiddleware);

// Dashboard — placeholder
router.get("/dashboard", examController.getDashboard);

module.exports = router;
