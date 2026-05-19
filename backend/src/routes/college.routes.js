const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const { updateMyCollegeProfile, getMyCollege, getAllColleges } = require("../controllers/college.controller");

// SUPER ADMIN / PLATFORM_SUPPORT: Get all colleges (for Security Audit filter, college list)
router.get(
  "/list",
  auth,
  role(ROLE.SUPER_ADMIN, ROLE.PLATFORM_SUPPORT),
  getAllColleges
);

// get single college by COLLEGE_ADMIN or PRINCIPAL (read-only)
router.get(
  "/my-college",
  auth,
  role(
    ROLE.COLLEGE_ADMIN,
    ROLE.PRINCIPAL,
    ROLE.HOD,
    ROLE.ACCOUNTANT,
    ROLE.ADMISSION_OFFICER,
    ROLE.EXAM_COORDINATOR,
    ROLE.PARENT_GUARDIAN,
    ROLE.PLATFORM_SUPPORT,
    ROLE.TEACHER
  ),
  collegeMiddleware,
  getMyCollege
);

router.put(
  "/edit/my-college",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  updateMyCollegeProfile
);
module.exports = router;