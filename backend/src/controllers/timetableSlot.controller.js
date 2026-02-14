const TimetableSlot = require("../models/timetableSlot.model");
const Timetable = require("../models/timetable.model");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");

/**
 * ADD SLOT (HOD ONLY)
 */
exports.addSlot = async (req, res) => {
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
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "Start time must be before end time",
      });
    }

    /* ================= TIMETABLE ================= */
    const timetable = await Timetable.findOne({
      _id: timetable_id,
      college_id: collegeId,
    });

    if (!timetable) {
      return res.status(404).json({
        message: "Timetable not found",
      });
    }

    /* ================= SUBJECT VALIDATION ================= */
    const subject = await Subject.findOne({
      _id: subject_id,
      course_id: timetable.course_id,
      college_id: collegeId,
    });

    if (!subject) {
      return res.status(400).json({
        message: "Subject does not belong to this course",
      });
    }

    /* ================= TEACHER VALIDATION ================= */
    const teacher = await Teacher.findOne({
      _id: teacher_id,
      college_id: collegeId,
      department_id: timetable.department_id,
    });

    if (!teacher) {
      return res.status(400).json({
        message: "Teacher does not belong to this department",
      });
    }

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
    console.error("Add Slot Error:", error.message);
    res.status(500).json({
      message: "Failed to add timetable slot",
    });
  }
};

/**
 * UPDATE Slot
 */
exports.updateSlot = async (req, res) => {
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
      return res.status(403).json({ message: "Teacher profile not found" });
    }

    /* STEP 4: Verify HOD */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Access denied: Only HOD can update timetable slots",
      });
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
