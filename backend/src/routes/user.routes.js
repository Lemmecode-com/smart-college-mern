const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeIsolation = require("../middlewares/collegeIsolation.middleware");

const {
  deactivateUser,
  reactivateUser,
} = require("../controllers/user.controller");
const { validateMongoId } = require("../middlewares/validators/common.validator");

/* =========================================================
   DEACTIVATE USER
   PUT /api/users/:id/deactivate
   COLLEGE_ADMIN only — cannot deactivate own account
   Sets user.isActive = false + updates Teacher/Student model
========================================================= */
router.put(
  "/:id/deactivate",
  auth,
  role("COLLEGE_ADMIN", "ADMISSION_OFFICER"),
  collegeIsolation(),
  validateMongoId,
  deactivateUser
);

/* =========================================================
   REACTIVATE USER
   PUT /api/users/:id/reactivate
   COLLEGE_ADMIN / ADMISSION_OFFICER only
   Sets user.isActive = true + updates Teacher/Student model
========================================================= */
router.put(
  "/:id/reactivate",
  auth,
  role("COLLEGE_ADMIN", "ADMISSION_OFFICER"),
  collegeIsolation(),
  validateMongoId,
  reactivateUser
);

module.exports = router;
