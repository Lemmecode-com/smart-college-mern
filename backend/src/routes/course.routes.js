// src/routes/course.routes.js
const express = require("express");
const router = express.Router();

const {
  createCourse,
  getCourses,
  getMyCourses,
  assignTeacher,
} = require("../controllers/course.controller");

const auth = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// Admin only
router.post("/", auth, authorize("admin"), createCourse);
router.get("/", auth, authorize("admin"), getCourses);
router.put(
  "/:id/assign-teacher",
  authMiddleware,
  roleMiddleware("admin"),
  assignTeacher
);


// Teacher only
router.get(
  "/my",
  authMiddleware,
  roleMiddleware("teacher"),
  getMyCourses
);


module.exports = router;


