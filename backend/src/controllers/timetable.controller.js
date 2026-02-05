const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");

/**
 * CREATE TIMETABLE (HOD)
 */
exports.createTimetable = async (req, res) => {
  try {
    /* ================= Auth ================= */
    if (req.user.role !== "TEACHER") {
      return res.status(403).json({ message: "Only teachers can create timetable" });
    }

    /* ================= Teacher ================= */
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "ACTIVE",
    });

    if (!teacher) {
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    const { department_id, course_id, semester, academicYear } = req.body;

    /* ================= Department + HOD ================= */
    const department = await Department.findOne({
      _id: department_id,
      hod_id: teacher._id,
      college_id: req.college_id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Only HOD can create timetable",
      });
    }

    /* ================= Duplicate Check ================= */
    const exists = await Timetable.findOne({
      department_id,
      course_id,
      semester,
      academicYear,
      college_id: req.college_id,
    });

    if (exists) {
      return res.status(400).json({
        message: "Timetable already exists",
      });
    }

    /* ================= Create ================= */
    const timetable = await Timetable.create({
      college_id: req.college_id,
      department_id,
      course_id,
      semester,
      academicYear,
      createdBy: teacher._id,
    });

    res.status(201).json({
      message: "Timetable created successfully",
      timetable,
    });
  } catch (error) {
    console.error("Create Timetable Error:", error);
    res.status(500).json({ message: "Failed to create timetable" });
  }
};

/**
 * PUBLISH Timetable
 */
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

/**
 * GET Weekly Timetable
 */
exports.getWeeklyTimetable = async (req, res) => {
  try {
    const { departmentId, courseId, semester } = req.params;

    /* STEP 1: Find timetable (IMPORTANT) */
    const timetable = await Timetable.findOne({
      department_id: departmentId,
      course_id: courseId,
      semester: Number(semester),
      // ❗ DO NOT FILTER STATUS UNTIL CONFIRMED
    });

    if (!timetable) {
      return res.json({
        MON: [],
        TUE: [],
        WED: [],
        THU: [],
        FRI: [],
        SAT: [],
      });
    }

    /* STEP 2: Fetch slots */
    const slots = await TimetableSlot.find({
      timetable_id: timetable._id,
    })
      .populate("subject_id", "name")
      .populate("teacher_id", "name");

    /* STEP 3: Group slots */
    const weekly = {
      MON: [],
      TUE: [],
      WED: [],
      THU: [],
      FRI: [],
      SAT: [],
    };

    slots.forEach(slot => {
      if (weekly[slot.day]) {
        weekly[slot.day].push(slot);
      }
    });

    res.json(weekly);
  } catch (error) {
    console.error("Get Weekly Timetable Error:", error);
    res.status(500).json({ message: "Failed to fetch timetable" });
  }
};

/**
 * GET Timetable by ID
 */
exports.getTimetableById = async (req, res) => {
  const timetable = await Timetable.findById(req.params.id)
    .populate("department_id", "name")
    .populate("course_id", "name");

  if (!timetable) {
    return res.status(404).json({ message: "Timetable not found" });
  }

  res.json(timetable);
};

/**
 * DELETE Timetable
 */
exports.deleteTimetable = async (req, res) => {
  await TimetableSlot.deleteMany({ timetable_id: req.params.id });
  await Timetable.findByIdAndDelete(req.params.id);

  res.json({ message: "Timetable deleted successfully" });
};