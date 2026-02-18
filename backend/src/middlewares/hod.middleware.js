const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    /* ================= STEP 1: Role check ================= */
    if (!req.user || req.user.role !== "TEACHER") {
      throw new AppError("Access denied: Only teachers allowed", 403, "TEACHER_ROLE_REQUIRED");
    }

    /* ================= STEP 2: Find teacher ================= */
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    /* ================= STEP 3: Resolve timetable ================= */
    let timetableId =
      req.body?.timetable_id || req.params?.id || null;

    if (!timetableId) {
      throw new AppError("Timetable ID missing", 400, "TIMETABLE_ID_MISSING");
    }

    const timetable = await Timetable.findById(timetableId);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    /* ================= STEP 4: Verify HOD ================= */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      throw new AppError("Only HOD can manage this timetable", 403, "HOD_ONLY");
    }

    /* ================= STEP 5: Attach ================= */
    req.teacher = teacher;
    req.department = department;
    req.timetable = timetable;

    next();
  } catch (error) {
    next(error);
  }
};
