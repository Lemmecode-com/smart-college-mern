const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getCollegePaymentReport
} = require("../controllers/admin.payment.controller");

// 🏛️ ADMIN: Payment report
router.get(
  "/report",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getCollegePaymentReport
);

module.exports = router;
