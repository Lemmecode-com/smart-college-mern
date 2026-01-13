// src/routes/student.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { createStudent, getAllStudents, assignParentToStudent, getStudentsByCourse } = require("../controllers/student.controller");

// create student
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  createStudent
);

// get all students
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  getAllStudents
);

module.exports = router;

// get students course wise
router.get(
  "/course/:courseId",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin", "teacher"),
  getStudentsByCourse
);

// assign parent
router.post(
  "/:studentId/assign-parent",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin", "student"),
  assignParentToStudent
);