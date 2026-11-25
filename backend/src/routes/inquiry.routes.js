const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { ROLE } = require("../utils/constants");
const { publicLimiter } = require("../middlewares/rateLimit.middleware");

const {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
} = require("../controllers/inquiry.controller");

// 📩 Public route to submit inquiry from landing page
router.post("/", publicLimiter, createInquiry);

// 🛡️ Protected routes for Super Admin
router.get("/", auth, role(ROLE.SUPER_ADMIN), getInquiries);
router.get("/:id", auth, role(ROLE.SUPER_ADMIN), getInquiryById);
router.patch("/:id/status", auth, role(ROLE.SUPER_ADMIN), updateInquiryStatus);

module.exports = router;
