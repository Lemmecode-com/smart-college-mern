const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getTeacherTimetable,
  getStudentTimetable,
  getAdminTimetable
} = require("../controllers/timetable.controller");
const studentMiddleware = require("../middlewares/student.middleware");

// 🏛️ College Admin creates timetable
router.post(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  createTimetableSlot,
);

// UPDATE
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateTimetableSlot,
);

// DELETE (soft)
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteTimetableSlot,
);

// 👨‍🏫 Teacher
router.get(
  "/teacher",
  auth,
  role("TEACHER", "COLLEGE_ADMIN"),
  collegeMiddleware,
  getTeacherTimetable
);
// 🎓 Student
router.get(
  "/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentTimetable,
);

router.get(
  "/admin",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAdminTimetable
);
module.exports = router;
