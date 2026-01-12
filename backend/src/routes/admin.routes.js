const express = require("express");
const router = express.Router();

const { getAdminStats } = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// Admin dashboard stats
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware("admin"),
  getAdminStats
);

module.exports = router;
