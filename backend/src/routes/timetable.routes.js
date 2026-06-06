const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const hod = require("../middlewares/hod.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const studentMiddleware = require("../middlewares/student.middleware");
const { ROLE } = require("../utils/constants");

const {
  createTimetable,
  publishTimetable,
  archiveTimetable,
  getTimetableById,
  deleteTimetable,
  getTimetables,
  getArchivedTimetables,
  getTimetableStats,
  getWeeklyTimetableById,
  getWeeklyTimetableForTeacher,
  getStudentTimetable,
  getStudentTodayTimetable,
  getSchedule,
  getTodaySchedule,
  getWeeklySchedule,
} = require("../controllers/timetable.controller");

const {
  addSlot,
  updateSlot,
  deleteTimetableSlot,
} = require("../controllers/timetableSlot.controller");

const {
  createException,
  createBulkExceptions,
  getExceptions,
  updateException,
  deleteException,
  approveException,
  rejectException,
  getPendingApprovals,
} = require("../controllers/timetableException.controller");

/* ================= CREATE ================= */
router.post("/", auth, role(ROLE.TEACHER, ROLE.HOD), collegeMiddleware, createTimetable);

/* ================= WEEKLY (STATIC FIRST) ================= */
// NOTE: Static routes like /weekly, /student must come BEFORE dynamic routes like /:id
router.get(
  "/weekly",
  auth,
  role(ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.HOD),
  collegeMiddleware,
  getWeeklyTimetableForTeacher
);

/* ================= LIST ================= */
router.get(
  "/",
  auth,
  role(ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getTimetables
);

/* ================= ARCHIVED ================= */
router.get(
  "/archived",
  auth,
  role(ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getArchivedTimetables
);

/* ================= STATS ================= */
router.get(
  "/stats",
  auth,
  role(ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getTimetableStats
);

/* ================= STUDENT ================= */
router.get(
  "/student",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentTimetable
);

router.get(
  "/student/today",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getStudentTodayTimetable
);

/* ================= TIMETABLE BY ID ================= */
router.get(
  "/:timetableId/weekly",
  auth,
  role(ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getWeeklyTimetableById
);

/* ================= DATE-WISE SCHEDULE ================= */
// Get date-wise schedule (TEACHER, STUDENT, PRINCIPAL, EXAM_COORDINATOR, HOD)
router.get(
  "/:id/schedule",
  auth,
  role(ROLE.TEACHER, ROLE.STUDENT, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getSchedule
);

// Get today's schedule (TEACHER, STUDENT, PRINCIPAL, EXAM_COORDINATOR, HOD)
router.get(
  "/:id/schedule/today",
  auth,
  role(ROLE.TEACHER, ROLE.STUDENT, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getTodaySchedule
);

// Get weekly schedule (TEACHER, STUDENT, PRINCIPAL, EXAM_COORDINATOR, HOD)
router.get(
  "/:id/schedule/week",
  auth,
  role(ROLE.TEACHER, ROLE.STUDENT, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.HOD),
  collegeMiddleware,
  getWeeklySchedule
);

/* ================= SLOTS ================= */
router.post(
  "/slot",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  addSlot
);

router.put(
  "/slot/:slotId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  updateSlot
);

router.delete(
  "/slot/:slotId",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  deleteTimetableSlot
);

/* ================= PUBLISH ================= */
router.put(
  "/:id/publish",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  publishTimetable
);

/* ================= ARCHIVE TIMETABLE ================= */
router.put(
  "/:id/archive",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  archiveTimetable
);

/* ================= DELETE TIMETABLE ================= */
router.delete(
  "/:id",
  auth,
  role(ROLE.TEACHER, ROLE.HOD),
  collegeMiddleware,
  hod,
  deleteTimetable
);

/* ================= EXCEPTIONS ================= */
// Get pending approvals (HOD only) - MUST BE BEFORE /:id/exceptions to avoid route conflict
router.get(
  "/exceptions/pending",
  auth,
  role(ROLE.HOD),
  collegeMiddleware,
  getPendingApprovals
);

// Create single exception
router.post(
  "/:id/exceptions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createException
);

// Create bulk exceptions
router.post(
  "/:id/exceptions/bulk",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createBulkExceptions
);

// Get exceptions for timetable
router.get(
  "/:id/exceptions",
  auth,
  role(ROLE.TEACHER, ROLE.STUDENT, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  getExceptions
);

// Update exception
router.put(
  "/exceptions/:exceptionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  updateException
);

// Delete exception
router.delete(
  "/exceptions/:exceptionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  deleteException
);

// Approve exception
router.put(
  "/exceptions/:exceptionId/approve",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  approveException
);

// Reject exception
router.put(
  "/exceptions/:exceptionId/reject",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  rejectException
);

module.exports = router;