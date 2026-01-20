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
  deleteCourse
} = require("../controllers/course.controller");

// Apply middlewares to ALL course routes
router.use(auth, role("COLLEGE_ADMIN"), collegeMiddleware);

// Create Course
router.post("/", createCourse);

// Get Courses by Department
router.get("/department/:departmentId", getCoursesByDepartment);

// Get Single Course
router.get("/:id", getCourseById);

// Update Course
router.put("/:id", updateCourse);

// Delete Course
router.delete("/:id", deleteCourse);

module.exports = router;
