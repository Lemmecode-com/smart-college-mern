const express = require("express");
const router = express.Router();

const { initiatePayment } = require("../controllers/student.payment.controller");
const auth = require("../middlewares/auth.middleware");
const tenant = require("../middlewares/college.middleware");

// Student initiates payment
router.post(
  "/payment/initiate",
  auth,
  tenant,
  initiatePayment
);

module.exports = router;
