const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { registerStudent } = require("../controllers/student.controller");
const {
  approveStudent,
  rejectStudent
} = require("../controllers/studentApproval.controller");

// 🌍 PUBLIC STUDENT REGISTRATION
router.post("/register/:collegeCode", registerStudent);

// 🔐 COLLEGE ADMIN → APPROVAL WORKFLOW
router.put(
  "/:studentId/approve",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,   // ✅ THIS WAS MISSING
  approveStudent
);

router.put(
  "/:studentId/reject",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,   // ✅ THIS WAS MISSING
  rejectStudent
);

module.exports = router;