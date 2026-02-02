const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getMyProfile,
} = require("../controllers/teacher.controller");
const teacherMiddleware = require("../middlewares/teacher.middleware");

// 👤 Teacher – My Profile (ALWAYS keep before :id)
router.get(
  "/my-profile",
  auth,
  teacherMiddleware,
  getMyProfile
);

// Admin routes
router.post("/", auth, role("COLLEGE_ADMIN"), collegeMiddleware, createTeacher);

router.get("/", auth, role("COLLEGE_ADMIN"), collegeMiddleware, getTeachers);

router.get(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getTeacherById
);

router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateTeacher
);

router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteTeacher
);

module.exports = router;
