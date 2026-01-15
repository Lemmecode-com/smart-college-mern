const express = require("express");
const router = express.Router();

const {
  upsertCollege,
  getCollegeProfile
} = require("../controllers/college.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 🔐 Only Admin / CollegeAdmin for create college
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  upsertCollege
);

// 🔓 Any logged-in user view college profile
router.get(
  "/",
  authMiddleware,
  getCollegeProfile
);

module.exports = router;