const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const role = require("../middlewares/role.middleware");

const { getAllReports } = require("../controllers/reportDashboard.controller");

// All routes require authentication and college admin access
router.use(auth);
router.use(collegeMiddleware);
router.use(role("COLLEGE_ADMIN"));

// SINGLE ENDPOINT - Get all reports in one call
// Query params: ?course=xxx&status=xxx&search=xxx
router.get("/all", getAllReports);

module.exports = router;
