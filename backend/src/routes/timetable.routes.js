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
router.post("/", auth, role("TEACHER"), collegeMiddleware, createTimetable);

/* ================= WEEKLY (STATIC FIRST) ================= */
// NOTE: Static routes like /weekly, /student must come BEFORE dynamic routes like /:id
router.get(
  "/weekly",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getWeeklyTimetableForTeacher,
);

/* ================= LIST ================= */
router.get("/", auth, role("TEACHER"), collegeMiddleware, getTimetables);

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
  role("TEACHER"),
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
router.get("/:id", auth, role("TEACHER"), collegeMiddleware, getTimetableById);

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
  deleteTimetableSlot,
);

/* ================= DATE-WISE SCHEDULE ================= */

// Get date-wise schedule (TEACHER and STUDENT only)
router.get(
  "/:id/schedule",
  auth,
  role("TEACHER", "STUDENT"),
  collegeMiddleware,
  getSchedule,
);

// Get today's schedule (TEACHER and STUDENT only)
router.get(
  "/:id/schedule/today",
  auth,
  role("TEACHER", "STUDENT"),
  collegeMiddleware,
  getTodaySchedule,
);

// Get weekly schedule (TEACHER and STUDENT only)
router.get(
  "/:id/schedule/week",
  auth,
  role("TEACHER", "STUDENT"),
  collegeMiddleware,
  getWeeklySchedule,
);

/* ================= EXCEPTIONS ================= */

// Get pending approvals (HOD only) - MUST BE BEFORE /:id/exceptions to avoid route conflict
router.get(
  "/exceptions/pending",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getPendingApprovals,
);

// Create single exception
router.post(
  "/:id/exceptions",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createException,
);

// Create bulk exceptions
router.post(
  "/:id/exceptions/bulk",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  createBulkExceptions,
);

// Get exceptions for timetable
router.get(
  "/:id/exceptions",
  auth,
  role("TEACHER", "STUDENT"),
  collegeMiddleware,
  getExceptions,
);

// Update exception
router.put(
  "/exceptions/:exceptionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  updateException,
);

// Delete exception
router.delete(
  "/exceptions/:exceptionId",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  deleteException,
);

// Approve exception
router.put(
  "/exceptions/:exceptionId/approve",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  approveException,
);

// Reject exception
router.put(
  "/exceptions/:exceptionId/reject",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  rejectException,
);

module.exports = router;
