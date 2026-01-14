const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const {
  createTeacher,
  assignSubjects,
  getTeacher
} = require("../controllers/teacher.controller");

/* Create teacher profile */
router.post(
  "/",
  auth,
  role("admin", "collegeAdmin"),
  createTeacher
);

/* Assign subjects */
router.post(
  "/:teacherId/assign-subjects",
  auth,
  role("admin", "collegeAdmin"),
  assignSubjects
);

/* Get teacher */
router.get(
  "/:id",
  auth,
  role("admin", "collegeAdmin", "teacher"),
  getTeacher
);

module.exports = router;
