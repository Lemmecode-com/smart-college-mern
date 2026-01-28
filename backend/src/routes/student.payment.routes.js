const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const studentMiddleware = require("../middlewares/student.middleware");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getStudentFeeDashboard
} = require("../controllers/student.payment.controller");

// 💳 STUDENT: Create payment order
router.post(
  "/create-order",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  createRazorpayOrder
);

// 💳 STUDENT: Verify payment
router.post(
  "/verify",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  verifyRazorpayPayment
);

// 💳 STUDENT: Fee dashboard
router.get(
  "/dashboard",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentFeeDashboard
);

module.exports = router;
