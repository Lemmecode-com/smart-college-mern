const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { updateMyCollegeProfile, getMyCollege, getAllColleges } = require("../controllers/college.controller");

// SUPER ADMIN: Get all colleges (for Security Audit filter)
router.get(
  "/list",
  auth,
  role("SUPER_ADMIN"),
  getAllColleges
);

// get single college by ONLY COLLEGE ADMIN
router.get(
  "/my-college",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getMyCollege
);

router.put(
  "/edit/my-college",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateMyCollegeProfile
);
module.exports = router;