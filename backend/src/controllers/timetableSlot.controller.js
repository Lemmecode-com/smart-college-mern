const TimetableSlot = require("../models/timetableSlot.model");
const Timetable = require("../models/timetable.model");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");

/**
 * ADD SLOT (HOD ONLY)
 * STRICT VALIDATION: Slot teacher MUST match subject teacher
 */
exports.addSlot = async (req, res, next) => {
  try {
    const {
      timetable_id,
      semester,
      day,
      startTime,
      endTime,
      subject_id,
      teacher_id,
      room,
      slotType,
    } = req.body;

    const collegeId = req.college_id;

    /* ================= REQUIRED FIELDS ================= */
    if (
      !timetable_id ||
      !day ||
      !startTime ||
      !endTime ||
      !subject_id ||
      !teacher_id
    ) {
      throw new AppError("Required fields are missing", 400, "MISSING_FIELDS");
    }

    if (startTime >= endTime) {
      throw new AppError("Start time must be before end time", 400, "INVALID_TIME");
    }

    /* ================= TIMETABLE ================= */
    const timetable = await Timetable.findOne({
      _id: timetable_id,
      college_id: collegeId,
    });

    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    /* ================= TEACHER (LOGGED IN) ================= */
    const loggedInTeacher = await Teacher.findOne({
      user_id: req.user.id,
      college_id: collegeId,
    });

    if (!loggedInTeacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    // 🔒 SECURITY: Ensure teacher can only add slots to their own department's timetable
    if (loggedInTeacher.department_id.toString() !== timetable.department_id.toString()) {
      throw new AppError(
        "Access denied: You can only manage slots for your own department's timetable", 
        403, 
        "DEPARTMENT_MISMATCH"
      );
    }

    /* ================= SUBJECT VALIDATION ================= */
    const subject = await Subject.findOne({
      _id: subject_id,
      course_id: timetable.course_id,
      college_id: collegeId,
    });

    if (!subject) {
      throw new AppError("Subject does not belong to this course", 404, "SUBJECT_NOT_FOUND");
    }

    /* ================= TEACHER VALIDATION ================= */
    const teacher = await Teacher.findOne({
      _id: teacher_id,
      college_id: collegeId,
      department_id: timetable.department_id,
    });

    if (!teacher) {
      throw new AppError("Teacher does not belong to this department", 404, "TEACHER_NOT_FOUND");
    }

    /* ================= STRICT VALIDATION: TEACHER MUST MATCH SUBJECT ================= */
    // ✅ CRITICAL: Slot's teacher MUST be the same as subject's assigned teacher
    if (subject.teacher_id.toString() !== teacher._id.toString()) {
      throw new AppError(
        `Invalid teacher assignment: Subject "${subject.name}" is assigned to ${subject.teacher_id.name}, but slot is assigned to ${teacher.name}. Only the subject's assigned teacher can teach this slot.`,
        403,
        "TEACHER_SUBJECT_MISMATCH"
      );
    }

    console.log(`✅ Teacher validation passed: ${teacher.name} is assigned to ${subject.name}`);

    /* ================= TIMETABLE TIME CONFLICT ================= */
    const timeConflict = await TimetableSlot.findOne({
      college_id: collegeId,
      timetable_id,
      day,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] },
        ],
      },
    });

    if (timeConflict) {
      return res.status(409).json({
        message: "Time slot conflict detected",
      });
    }

    /* ================= TEACHER DOUBLE BOOKING ================= */
    const teacherConflict = await TimetableSlot.findOne({
      college_id: collegeId,
      teacher_id,
      day,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] },
        ],
      },
    });

    if (teacherConflict) {
      return res.status(409).json({
        message: "Teacher already assigned at this time",
      });
    }

    /* ================= CREATE SLOT ================= */
    const slot = await TimetableSlot.create({
      college_id: collegeId,
      timetable_id,
      department_id: timetable.department_id,
      course_id: timetable.course_id,
      subject_id,
      teacher_id,
      semester,
      day,
      startTime,
      endTime,
      room,
      slotType,
    });

    res.status(201).json({
      message: "Slot added successfully",
      slot,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE Slot
 * STRICT VALIDATION: Cannot change teacher to someone other than subject's teacher
 */
exports.updateSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      throw new AppError("Slot ID is required", 400, "MISSING_ID");
    }

    /* STEP 1: Find slot */
    const slot = await TimetableSlot.findById(slotId);
    if (!slot) {
      throw new AppError("Slot not found", 404, "SLOT_NOT_FOUND");
    }

    /* STEP 2: Find timetable */
    const timetable = await Timetable.findById(slot.timetable_id);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    /* STEP 3: Verify Teacher */
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
    }

    /* STEP 4: Verify HOD */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      throw new AppError("Access denied: Only HOD can update timetable slots", 403, "HOD_ONLY");
    }

    /* STEP 5: If teacher_id is being updated, validate it matches subject's teacher */
    if (req.body.teacher_id) {
      const newTeacher = await Teacher.findById(req.body.teacher_id);
      if (!newTeacher) {
        throw new AppError("New teacher not found", 404, "TEACHER_NOT_FOUND");
      }

      const subject = await Subject.findById(slot.subject_id);
      if (!subject) {
        throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
      }

      if (subject.teacher_id.toString() !== newTeacher._id.toString()) {
        throw new AppError(
          `Cannot change teacher: Subject "${subject.name}" is assigned to ${subject.teacher_id.name}. Only the subject's assigned teacher can teach this slot.`,
          403,
          "TEACHER_SUBJECT_MISMATCH"
        );
      }

      console.log(`✅ Teacher update validated: ${newTeacher.name} is assigned to ${subject.name}`);
    }

    /* STEP 5: Update slot (NO publish restriction now) */
    const updatedSlot = await TimetableSlot.findByIdAndUpdate(
      slotId,
      req.body,
      { new: true }
    );

    res.json({
      message: "Slot updated successfully",
      slot: updatedSlot,
    });

  } catch (error) {
    console.error("Update Slot Error:", error);
    res.status(500).json({ message: "Failed to update slot" });
  }
};

/**
 * DELETE Slot
 */
exports.deleteTimetableSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      return res.status(400).json({ message: "Slot ID is required" });
    }

    /* STEP 1: Find slot */
    const slot = await TimetableSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    /* STEP 2: Find timetable */
    const timetable = await Timetable.findById(slot.timetable_id);
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    /* STEP 3: Verify Teacher */
    const teacher = await Teacher.findOne({ user_id: req.user.id });
    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    /* STEP 4: Verify HOD */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Access denied: Only HOD can delete timetable slots",
      });
    }

    /* STEP 5: Delete slot */
    await slot.deleteOne();

    res.json({
      message: "Timetable slot deleted successfully",
    });

  } catch (error) {
    console.error("Delete Slot Error:", error);
    res.status(500).json({ message: "Failed to delete timetable slot" });
  }
};
