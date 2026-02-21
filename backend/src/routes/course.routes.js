const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createCourse,
  getCoursesByDepartment,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCourses,
} = require("../controllers/course.controller");

// Create Course
router.post("/", auth, role("COLLEGE_ADMIN"), collegeMiddleware, createCourse);

// Get All Courses (College-wise)
router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getAllCourses,
);

// Get Courses by Department
router.get(
  "/department/:departmentId",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getCoursesByDepartment,
);

// Get Single Course
router.get(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getCourseById,
);

// Update Course
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateCourse,
);

// Delete Course
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteCourse,
);

module.exports = router;
