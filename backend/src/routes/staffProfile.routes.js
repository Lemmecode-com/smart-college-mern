const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const staffProfileController = require("../controllers/staffProfile.controller");

/**
 * Staff Profile Routes
 * Access: College Admin + All Staff Roles (for their own profile)
 */

// All routes require authentication & college scoping
router.use(auth, collegeMiddleware);

// === COLLEGE ADMIN can access any staff profile ===
// Get specific staff profile (admin view)
router.get(
  "/profile/:userId",
  // College admin only for viewing any staff; others can only view own — check in controller
  staffProfileController.getStaffProfile
);

// Update specific staff profile (admin edit)
router.put("/profile/:userId", staffProfileController.updateStaffProfile);

// === STAFF SELF-SERVICE ENDPOINTS ===
// Get own profile (convenience)
router.get("/my-profile", staffProfileController.getMyStaffProfile);

// Update own profile
router.put("/my-profile", staffProfileController.updateMyStaffProfile);

module.exports = router;
