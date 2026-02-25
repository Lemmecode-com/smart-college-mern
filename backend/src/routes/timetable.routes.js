const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const hod = require("../middlewares/hod.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const studentMiddleware = require("../middlewares/student.middleware");

const {
  createTimetable,
  publishTimetable,
  getTimetableById,
  deleteTimetable,
  getTimetables,
  getWeeklyTimetableById,
  getWeeklyTimetableForTeacher,
  getStudentTimetable,
  getStudentTodayTimetable,
} = require("../controllers/timetable.controller");

const {
  addSlot,
  updateSlot,
  deleteTimetableSlot,
} = require("../controllers/timetableSlot.controller");

/* ================= CREATE ================= */
router.post("/", auth, role("TEACHER"), collegeMiddleware, createTimetable);

/* ================= WEEKLY (STATIC FIRST) ================= */
router.get("/weekly", auth, collegeMiddleware, getWeeklyTimetableForTeacher);

/* ================= LIST ================= */
router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN", "TEACHER"),
  collegeMiddleware,
  getTimetables,
);

/* ================= SLOTS ================= */
router.post("/slot", auth, role("TEACHER"), collegeMiddleware, hod, addSlot);

router.get(
  "/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentTimetable,
);

router.get(
  "/student/today",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentTodayTimetable,
);

router.get(
  "/:timetableId/weekly",
  auth,
  collegeMiddleware,
  getWeeklyTimetableById,
);

/* ================= PUBLISH ================= */
router.put(
  "/:id/publish",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  hod,
  publishTimetable,
);

/* ================= GET BY ID (LAST) ================= */
router.get("/:id", auth, collegeMiddleware, getTimetableById);

/* ================= DELETE ================= */
router.delete(
  "/:id",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  hod, // ✅ FIXED: Uncommented HOD middleware
  deleteTimetable,
);

router.put(
  "/slot/:slotId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  hod,
  updateSlot,
);

router.delete(
  "/slot/:slotId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  hod, // ✅ FIXED: Added role + HOD check
  deleteTimetableSlot
);

module.exports = router;
