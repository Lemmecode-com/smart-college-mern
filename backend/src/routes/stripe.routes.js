const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createCheckoutSession,
  confirmStripePayment,
} = require("../controllers/stripe.payment.controller");

// Add college middleware to set req.college_id
router.post(
  "/create-checkout-session",
  auth,
  role("STUDENT"),
  collegeMiddleware, // ← This sets req.college_id
  createCheckoutSession,
);

router.post(
  "/confirm-payment",
  auth,
  role("STUDENT"),
  collegeMiddleware, // ← This sets req.college_id
  confirmStripePayment,
);

module.exports = router;
