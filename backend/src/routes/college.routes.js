const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const multerUpload = require("../config/multer");

const { updateMyCollegeProfile, getMyCollege, getAllColleges, getSetupStatus, requestCollegeEmailChange, verifyCollegeEmailChange } = require("../controllers/college.controller");
const { markSetupComplete } = require("../controllers/master.controller");
const { validateEmailChangeRequest, validateEmailChangeVerify } = require("../middlewares/validators/auth.validator");

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

// ──────────────────────────────────────────────────────────────
// SECURE COLLEGE OFFICIAL EMAIL CHANGE
// These endpoints change College.email (not User.email).
// Requires auth + COLLEGE_ADMIN + collegeMiddleware.
// ──────────────────────────────────────────────────────────────
router.post(
  "/change-email/request",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  validateEmailChangeRequest,
  requestCollegeEmailChange
);

router.post(
  "/change-email/verify",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  validateEmailChangeVerify,
  verifyCollegeEmailChange
);

module.exports = router;