const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");

/* =========================================================
   CREATE TIMETABLE (HOD = Teacher who is department.hod_id)
========================================================= */
exports.createTimetable = async (req, res) => {
  try {
    if (req.user.role !== "TEACHER") {
      return res.status(403).json({ message: "Only teachers can create timetable" });
    }

    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    const { department_id, course_id, semester, academicYear } = req.body;

    const department = await Department.findOne({
      _id: department_id,
      hod_id: teacher._id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(403).json({ message: "Only HOD can create timetable" });
    }

    const exists = await Timetable.findOne({
      department_id,
      course_id,
      semester,
      academicYear,
      college_id: req.college_id,
    });

    if (exists) {
      return res.status(400).json({ message: "Timetable already exists" });
    }

    const course = await Course.findById(course_id).select("name");
    const name = course
      ? `${course.name} - Sem ${semester} (${academicYear})`
      : `Semester ${semester} (${academicYear})`;

    const timetable = await Timetable.create({
      college_id: req.college_id,
      department_id,
      course_id,
      semester,
      academicYear,
      name,
      createdBy: teacher._id,
    });

    res.status(201).json({ message: "Timetable created successfully", timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create timetable" });
  }
};

/* =========================================================
   PUBLISH TIMETABLE (HOD)
========================================================= */
exports.publishTimetable = async (req, res) => {
  const timetable = await Timetable.findByIdAndUpdate(
    req.params.id,
    { status: "PUBLISHED" },
    { new: true }
  );

  if (!timetable) {
    return res.status(404).json({ message: "Timetable not found" });
  }

  res.json({
    message: "Timetable published successfully",
    timetable,
  });
};


/* =========================================================
   GET TIMETABLE BY ID
========================================================= */
exports.getTimetableById = async (req, res) => {
  const timetable = await Timetable.findOne({
    _id: req.params.id,
    college_id: req.college_id,
  })
    .populate("department_id", "name")
    .populate("course_id", "name");

  if (!timetable) {
    return res.status(404).json({ message: "Timetable not found" });
  }

  res.json(timetable);
};

/* =========================================================
   LIST TIMETABLES
========================================================= */
exports.getTimetables = async (req, res) => {
  const filter = { college_id: req.college_id };
  if (req.query.department_id) {
    filter.department_id = req.query.department_id;
  }

  const timetables = await Timetable.find(filter).sort({ createdAt: -1 });
  res.json(timetables);
};

/* =========================================================
   WEEKLY TIMETABLE — TEACHER (OWN SCHEDULE)
========================================================= */
/**
 * GET /api/timetable/weekly
 * Purpose:
 *  - Show weekly schedule for logged-in teacher
 *  - ONLY slots from PUBLISHED timetables
 */
exports.getWeeklyTimetableForTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const slots = await TimetableSlot.find({
      teacher_id: teacher._id,
    })
      .populate("subject_id", "name")
      .populate("teacher_id", "name")
      .populate({
        path: "timetable_id",
        select: "name semester academicYear status",
        match: { status: "PUBLISHED" }, // 🔒 ONLY PUBLISHED
      });

    const weekly = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    slots.forEach(slot => {
      if (!slot.timetable_id) return; // draft filtered here
      weekly[slot.day].push(slot);
    });

    res.json({ weekly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load schedule" });
  }
};


/* =========================================================
   WEEKLY TIMETABLE — HOD (FULL VIEW)
========================================================= */
exports.getWeeklyTimetableById = async (req, res) => {
  const timetable = await Timetable.findOne({
    _id: req.params.timetableId,
    college_id: req.college_id,
  });

  if (!timetable) {
    return res.status(404).json({ message: "Timetable not found" });
  }

  const slots = await TimetableSlot.find({
    timetable_id: timetable._id,
  })
    .populate("subject_id", "name")
    .populate("teacher_id", "name");

  const weekly = { MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] };
  slots.forEach(s => weekly[s.day].push(s));

  res.json({ timetable, weekly });
};

/* =========================================================
   DELETE TIMETABLE (HOD)
========================================================= */
exports.deleteTimetable = async (req, res) => {
  await TimetableSlot.deleteMany({ timetable_id: req.params.id });
  await Timetable.findByIdAndDelete(req.params.id);
  res.json({ message: "Timetable deleted successfully" });
};
