const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  deactivateUser,
  reactivateUser,
} = require("../controllers/user.controller");

/* =========================================================
   DEACTIVATE USER
   PUT /api/users/:id/deactivate
   COLLEGE_ADMIN only — cannot deactivate own account
   Sets user.isActive = false + updates Teacher/Student model
========================================================= */
router.put(
  "/:id/deactivate",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deactivateUser
);

/* =========================================================
   REACTIVATE USER
   PUT /api/users/:id/reactivate
   COLLEGE_ADMIN only
   Sets user.isActive = true + updates Teacher/Student model
========================================================= */
router.put(
  "/:id/reactivate",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  reactivateUser
);

module.exports = router;
