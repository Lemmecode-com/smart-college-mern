const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const college = require("../middlewares/college.middleware");
const hod = require("../middlewares/hod.middleware");

const {
  createTimetable,
  getWeeklyTimetable,
  publishTimetable,
  getTimetableById,
  deleteTimetable,
} = require("../controllers/timetable.controller");

const { 
  addSlot, 
  updateSlot, 
  deleteTimetableSlot
} = require("../controllers/timetableSlot.controller");

//ADD NEW TIMETABLE - HOD ONLY
router.post(
  "/", 
  auth, 
  role("TEACHER"), 
  college, 
  createTimetable
);

//PUBLISH TIMETABLE - HOD ONLY
router.put(
  "/publish/:id",
  auth,
  role("TEACHER"),
  college,
  hod,
  publishTimetable,
);

//GET WEEKLY TIMETABLE FOR STUDENTS / TEACHERS
router.get(
  "/:departmentId/:courseId/:semester",
  auth,
  college,
  getWeeklyTimetable
);

//GET TIMETABLE ID-WISE FOR ALL
router.get(
  "/:id", 
  auth, 
  college, 
  getTimetableById
);

//DELETE TIMETABLE - HOD ONLY
router.delete(
  "/:id", 
  auth, 
  role("TEACHER"), 
  college, 
  hod, 
  deleteTimetable
);

// ADD SLOTS FOR TIMETABLE - HOD ONLY
router.post(
  "/slot", 
  auth, 
  role("TEACHER"), 
  college, 
  hod, 
  addSlot
);

//UPDATE TIMETABLE'S SLOT
router.put(
  "/slot/:slotId", 
  auth, 
  role("TEACHER"), 
  college, 
  hod,
  updateSlot
);

//DELETE TIMETABLE'S SLOT
router.delete(
  "/slot/:slotId", 
  auth, 
  deleteTimetableSlot
);

module.exports = router;
