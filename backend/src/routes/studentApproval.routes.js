const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  approveStudent,
  rejectStudent
} = require("../controllers/studentApproval.controller");

router.use(auth, role("COLLEGE_ADMIN"), collegeMiddleware);

router.put("/:studentId/approve", approveStudent);
router.put("/:studentId/reject", rejectStudent);

module.exports = router;
