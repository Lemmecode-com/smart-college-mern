const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
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
      req.body?.timetable_id ||
      req.params?.id ||
      req.params?.timetableId ||
      null;

    // If slotId is provided (for slot delete/update), fetch the slot to get timetable_id
    if (req.params?.slotId) {
      const slot = await TimetableSlot.findById(req.params.slotId);
      if (slot) {
        timetableId = slot.timetable_id;
      }
    }

    if (!timetableId) {
      throw new AppError("Timetable ID missing", 400, "TIMETABLE_ID_MISSING");
    }

    const timetable = await Timetable.findById(timetableId).populate('department_id', 'name hod_id');
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    /* ================= STEP 4: Verify HOD ================= */
    // Check if teacher is the HOD of the department that owns this timetable
    const department = await Department.findOne({
      _id: timetable.department_id._id || timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      // Debug info to help diagnose the issue
      console.log("\n=== HOD Permission Check Failed ===");
      console.log("Request Path:", req.originalUrl);
      console.log("Request Method:", req.method);
      console.log("- Teacher ID:", teacher._id.toString());
      console.log("- Teacher Name:", teacher.name);
      console.log("- Teacher Department ID:", teacher.department_id?.toString());
      console.log("- Timetable ID:", timetable._id.toString());
      console.log("- Timetable Department ID:", timetable.department_id._id?.toString() || timetable.department_id.toString());
      console.log("- Timetable Department Name:", timetable.department_id.name);
      console.log("- Department HOD ID (from DB):", timetable.department_id.hod_id?.toString() || 'null');
      console.log("- Is Teacher the HOD?", timetable.department_id.hod_id?.toString() === teacher._id.toString() ? 'YES' : 'NO');
      console.log("===================================\n");
      
      // More specific error message
      const isHodOfOtherDept = await Department.findOne({
        hod_id: teacher._id
      });
      
      if (isHodOfOtherDept) {
        throw new AppError(`You are HOD of "${isHodOfOtherDept.name}" but not this department. You can only manage timetables for your own department.`, 403, "HOD_WRONG_DEPARTMENT");
      } else {
        throw new AppError("Only HOD can manage this timetable", 403, "HOD_ONLY");
      }
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