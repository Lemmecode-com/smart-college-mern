const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const multerUpload = require("../config/multer");

const { updateMyCollegeProfile, getMyCollege, getAllColleges, getSetupStatus } = require("../controllers/college.controller");
const { markSetupComplete } = require("../controllers/master.controller");

// SUPER ADMIN / MASTER
router.post(
  "/setup-complete",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  markSetupComplete
);

// COLLEGE ADMIN / STAFF: Get own college info
router.get(
  "/my-college",
  auth,
  collegeMiddleware,
  getMyCollege
);

// COLLEGE ADMIN: Update own college profile
router.put(
  "/edit/my-college",
  multerUpload.single("logo"),
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  updateMyCollegeProfile
);

// COLLEGE ADMIN / STAFF: Get onboarding setup status
router.get(
  "/setup-status",
  auth,
  collegeMiddleware,
  getSetupStatus
);

module.exports = router;