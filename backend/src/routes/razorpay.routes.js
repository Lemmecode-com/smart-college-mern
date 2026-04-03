const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayPaymentFailure,
} = require("../controllers/razorpay.payment.controller");

// Add college middleware to set req.college_id
router.post(
  "/create-order",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  createRazorpayOrder,
);

router.post(
  "/verify-payment",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  verifyRazorpayPayment,
);

router.post(
  "/payment-failed",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  handleRazorpayPaymentFailure,
);

module.exports = router;
