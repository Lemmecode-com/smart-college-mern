const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  createCourse,
  getCoursesByDepartment,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCourses,
  deactivateCourse,
  reactivateCourse,
} = require("../controllers/course.controller");

// Create Course — COLLEGE_ADMIN only
router.post("/", auth, role(ROLE.COLLEGE_ADMIN), collegeMiddleware, createCourse);

// Get All Courses (College-wise) — COLLEGE_ADMIN, TEACHER, PRINCIPAL, EXAM_COORDINATOR, ACCOUNTANT
router.get(
  "/",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.ACCOUNTANT),
  collegeMiddleware,
  getAllCourses,
);

// Get Courses by Department — COLLEGE_ADMIN, TEACHER, HOD, PRINCIPAL, EXAM_COORDINATOR, ACCOUNTANT
router.get(
  "/department/:departmentId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.TEACHER, ROLE.HOD, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.ACCOUNTANT),
  collegeMiddleware,
  getCoursesByDepartment,
);

// Get Single Course — COLLEGE_ADMIN, PRINCIPAL, EXAM_COORDINATOR, ACCOUNTANT (read-only)
router.get(
  "/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.ACCOUNTANT),
  collegeMiddleware,
  getCourseById,
);

// Update Course — COLLEGE_ADMIN only
router.put(
  "/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  updateCourse,
);

// Delete Course — COLLEGE_ADMIN only
router.delete(
  "/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  deleteCourse,
);

// Deactivate Course — COLLEGE_ADMIN only
router.put(
  "/:id/deactivate",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  deactivateCourse,
);

// Reactivate Course — COLLEGE_ADMIN only
router.put(
  "/:id/reactivate",
  auth,
  role(ROLE.COLLEGE_ADMIN),
  collegeMiddleware,
  reactivateCourse,
);

module.exports = router;