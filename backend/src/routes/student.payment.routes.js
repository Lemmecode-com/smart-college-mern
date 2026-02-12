const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const studentMiddleware = require("../middlewares/student.middleware");

const { mockPaymentSuccess } = require("../controllers/mock.payment.controller");
const { getStudentFeeDashboard } = require("../controllers/student.payment.controller");
const { createCheckoutSession } = require("../controllers/stripe.payment.controller");

// 💳 STUDENT: Create payment order
router.post(
  "/create-order",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
);

// 💳 STUDENT: Fee dashboard
router.get(
  "/my-fee-dashboard",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentFeeDashboard
);

// MOCK PAYMENT (DEV ONLY)
router.post(
  "/mock-success",
  auth,
  mockPaymentSuccess
);
module.exports = router;
