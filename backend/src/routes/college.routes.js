const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { updateMyCollegeProfile, getMyCollege } = require("../controllers/college.controller");

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
