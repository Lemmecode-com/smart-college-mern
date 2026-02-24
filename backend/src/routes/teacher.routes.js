const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const teacherMiddleware = require("../middlewares/teacher.middleware");

const {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getMyProfile,
  updateMyProfile, // ✅ NEW
  getTeachersByDepartment,
  getTeachersByCourse, // ✅ NEW
} = require("../controllers/teacher.controller");

/* =========================================================
   TEACHER – MY PROFILE
========================================================= */
router.get(
  "/my-profile",
  auth,
  collegeMiddleware,
  teacherMiddleware,
  getMyProfile
);

/* =========================================================
   TEACHER – UPDATE MY PROFILE
========================================================= */
router.put(
  "/my-profile",
  auth,
  collegeMiddleware,
  teacherMiddleware,
  updateMyProfile
);

/* =========================================================
   CREATE TEACHER (Admin)
========================================================= */
router.post(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  createTeacher
);

/* =========================================================
   GET ALL TEACHERS
========================================================= */
router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachers
);

/* =========================================================
   GET TEACHER BY ID
========================================================= */
router.get(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getTeacherById
);

/* =========================================================
   UPDATE TEACHER
========================================================= */
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateTeacher
);

/* =========================================================
   DELETE TEACHER
========================================================= */
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteTeacher
);

/* =========================================================
   GET TEACHERS BY DEPARTMENT
========================================================= */
router.get(
  "/department/:departmentId",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachersByDepartment
);

/* =========================================================
   ✅ GET TEACHERS BY COURSE (IMPORTANT)
========================================================= */
router.get(
  "/course/:courseId",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachersByCourse
);

module.exports = router;
