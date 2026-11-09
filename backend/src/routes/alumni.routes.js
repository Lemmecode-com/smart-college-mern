const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  getAlumniPolicy,
  updateAlumniPolicy,
  getAlumniEligibility,
} = require("../controllers/alumni.controller");

router.use(auth);
router.use(role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER));
router.use(collegeMiddleware);

// Alumni Settings CRUD
router.get("/settings", getAlumniPolicy);
router.put("/settings", updateAlumniPolicy);
router.post("/settings", updateAlumniPolicy);

// Alumni Eligibility Check
router.get("/eligibility/:studentId", getAlumniEligibility);

module.exports = router;
