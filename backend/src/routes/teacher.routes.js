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
  updateMyProfile,
  getTeachersByDepartment,
  getTeachersByCourse,
  getTeacherReassignmentData,
  getAvailableTeachersForReassignment,
  deactivateTeacherWithReassignment,
} = require("../controllers/teacher.controller");

/* =========================================================
   TEACHER – MY PROFILE
========================================================= */
router.get(
  "/my-profile",
  auth,
  collegeMiddleware,
  teacherMiddleware,
  getMyProfile,
);

router.put(
  "/my-profile",
  auth,
  collegeMiddleware,
  teacherMiddleware,
  updateMyProfile,
);

/* =========================================================
   CRUD
========================================================= */
router.post("/", auth, role("COLLEGE_ADMIN"), collegeMiddleware, createTeacher);

router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachers,
);

/* =========================================================
   ⚠️ SPECIFIC ROUTES MUST COME BEFORE /:id
========================================================= */

/* GET TEACHERS BY DEPARTMENT */
router.get(
  "/department/:departmentId",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachersByDepartment,
);

/* GET TEACHERS BY COURSE */
router.get(
  "/course/:courseId",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTeachersByCourse,
);

/* GET AVAILABLE TEACHERS FOR REASSIGNMENT */
router.get(
  "/available-for-reassignment",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAvailableTeachersForReassignment,
);

/* =========================================================
   /:id ROUTES (must be AFTER specific routes above)
========================================================= */

/* GET TEACHER BY ID */
router.get(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getTeacherById,
);

/* GET REASSIGNMENT DATA FOR A TEACHER */
router.get(
  "/:id/reassignment-data",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getTeacherReassignmentData,
);

/* UPDATE TEACHER */
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateTeacher,
);

/* DEACTIVATE TEACHER WITH RESOURCE REASSIGNMENT */
router.put(
  "/:id/deactivate-with-reassignment",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deactivateTeacherWithReassignment,
);

/* DELETE TEACHER */
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteTeacher,
);

module.exports = router;
