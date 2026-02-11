const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");

module.exports = async (req, res, next) => {
  try {
    /* ================= STEP 1: Role check ================= */
    if (!req.user || req.user.role !== "TEACHER") {
      return res.status(403).json({
        message: "Access denied: Only teachers allowed",
      });
    }

    /* ================= STEP 2: Find teacher ================= */
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    /* ================= STEP 3: Resolve timetable ================= */
    let timetableId =
      req.body?.timetable_id || req.params?.id || null;

    if (!timetableId) {
      return res.status(400).json({
        message: "Timetable ID missing",
      });
    }

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    /* ================= STEP 4: Verify HOD ================= */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Only HOD can manage this timetable",
      });
    }

    /* ================= STEP 5: Attach ================= */
    req.teacher = teacher;
    req.department = department;
    req.timetable = timetable;

    next();
  } catch (error) {
    console.error("HOD middleware error:", error);
    res.status(500).json({
      message: "Server error in HOD authorization",
    });
  }
};
