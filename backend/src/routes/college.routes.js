const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const { updateMyCollegeProfile, getMyCollege, getAllColleges } = require("../controllers/college.controller");
const { markSetupComplete } = require("../controllers/master.controller");

// SUPER ADMIN / MASTER
router.post(
  "/setup-complete",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  markSetupComplete
);

module.exports = router;