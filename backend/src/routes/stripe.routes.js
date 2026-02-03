const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  createCheckoutSession,
  confirmStripePayment
} = require("../controllers/stripe.payment.controller");

router.post(
  "/create-checkout",
  auth,
  role("STUDENT"),
  createCheckoutSession
);

router.post(
  "/confirm-payment",
  auth,
  role("STUDENT"),
  confirmStripePayment
);

module.exports = router;
