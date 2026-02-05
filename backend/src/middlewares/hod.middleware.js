const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");

module.exports = async (req, res, next) => {
  try {
    /* ================= STEP 1: Role check ================= */
    if (!req.user || req.user.role !== "TEACHER") {
      return res.status(403).json({
        message: "Access denied: Only teachers can perform this action",
      });
    }

    /* ================= STEP 2: Find teacher ================= */
    const teacher = await Teacher.findOne({ user_id: req.user.id });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    /* ================= STEP 3: Resolve timetable ================= */
    let timetable = null;

    // CASE 1: timetable_id in body (add slot)
    if (req.body?.timetable_id) {
      timetable = await Timetable.findById(req.body.timetable_id);
    }

    // CASE 2: timetable id in params (publish / delete)
    else if (req.params?.id) {
      timetable = await Timetable.findById(req.params.id);
    }

    // CASE 3: creating timetable (department_id directly)
    else if (req.body?.department_id) {
      const department = await Department.findOne({
        _id: req.body.department_id,
        hod_id: teacher._id,
      });

      if (!department) {
        return res.status(403).json({
          message: "Access denied: Only HOD can manage this department",
        });
      }

      req.teacher = teacher;
      req.department = department;
      return next();
    }

    if (!timetable) {
      return res.status(400).json({
        message: "Timetable not found or ID missing",
      });
    }

    /* ================= STEP 4: Verify HOD ================= */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Access denied: Only HOD can manage timetable",
      });
    }

    /* ================= STEP 5: Attach ================= */
    req.teacher = teacher;
    req.department = department;
    req.timetable = timetable;

    next();
  } catch (error) {
    console.error("HOD Middleware Error:", error);
    res.status(500).json({
      message: "Server error in HOD authorization",
    });
  }
};
