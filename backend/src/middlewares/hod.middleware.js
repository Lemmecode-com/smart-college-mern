const mongoose = require("mongoose");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const AppError = require("../utils/AppError");

module.exports = async (req, res, next) => {
  try {
    /* ================= STEP 1: Find teacher profile ================= */
    const teacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: req.user.college_id,
    });
    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    /* ================= STEP 2: Resolve timetable (optional) ================= */
    let timetableId =
      req.body?.timetable_id ||
      req.params?.id ||
      req.params?.timetableId ||
      null;

    console.log("🟡 [HOD MIDDLEWARE] req.params:", req.params);
    console.log("🟡 [HOD MIDDLEWARE] timetableId resolved:", timetableId);
    console.log("🟡 [HOD MIDDLEWARE] IS VALID OBJECT ID:", mongoose.isValidObjectId(timetableId));

    // If slotId is provided (for slot delete/update), fetch the slot to get timetable_id
    if (req.params?.slotId) {
      const slot = await TimetableSlot.findOne({
        _id: req.params.slotId,
        college_id: req.user.college_id,
      });
      if (slot) {
        timetableId = slot.timetable_id;
      }
    }

    let timetable = null;

    /* ===== Only enforce timetable + HOD-dept check when a timetableId is present ===== */
    if (timetableId) {
      if (!mongoose.isValidObjectId(timetableId)) {
        throw new AppError("Invalid timetable ID", 400, "INVALID_TIMETABLE_ID");
      }

      timetable = await Timetable.findOne({
        _id: timetableId,
        college_id: req.user.college_id,
      }).populate('department_id', 'name hod_id');
      if (!timetable) {
        throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
      }

      /* ================= STEP 3: Verify HOD ================= */
      const department = await Department.findOne({
        _id: timetable.department_id._id || timetable.department_id,
        hod_id: teacher._id,
        college_id: req.user.college_id,
      });

      if (!department) {
        const isHodOfOtherDept = await Department.findOne({
          hod_id: teacher._id,
          college_id: req.user.college_id,
        });

        if (isHodOfOtherDept) {
          throw new AppError(`You are HOD of "${isHodOfOtherDept.name}" but not this department. You can only manage timetables for your own department.`, 403, "HOD_WRONG_DEPARTMENT");
        } else {
          throw new AppError("Only HOD can manage this timetable", 403, "HOD_ONLY");
        }
      }
      // timetable/department resolved from timetable
      req.teacher = teacher;
      req.department = department;
      req.timetable = timetable;
    } else {
      /* ===== No timetableId — resolve department directly from teacher record ===== */
      const department = await Department.findOne({
        hod_id: teacher._id,
        college_id: req.user.college_id,
      });
      if (!department) {
        throw new AppError("Department not found for this HOD", 404, "DEPARTMENT_NOT_FOUND");
      }
      req.teacher = teacher;
      req.department = department;
      req.timetable = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};