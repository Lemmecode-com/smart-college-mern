const TimetableSlot = require("../models/timetableSlot.model");
const Timetable = require("../models/timetable.model");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");

/**
 * ADD SLOT (HOD ONLY)
 */
exports.addSlot = async (req, res) => {
  try {
    const {
      timetable_id,
      day,
      startTime,
      endTime,
      subject_id,
      teacher_id,
      room,
      slotType,
    } = req.body;

    // 1️⃣ Basic validation
    if (startTime >= endTime) {
      return res.status(400).json({
        message: "Start time must be before end time",
      });
    }

    // 2️⃣ TIME CONFLICT (same timetable + same day)
    const timeConflict = await TimetableSlot.findOne({
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
        message: "Time slot conflict detected for this day",
      });
    }

    // 3️⃣ TEACHER CONFLICT (same teacher same time)
    const teacherConflict = await TimetableSlot.findOne({
      day,
      teacher_id,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] },
        ],
      },
    });

    if (teacherConflict) {
      return res.status(409).json({
        message: "Teacher is already assigned in this time slot",
      });
    }

    // 4️⃣ ROOM CONFLICT (same room same time)
    if (room) {
      const roomConflict = await TimetableSlot.findOne({
        day,
        room,
        $expr: {
          $and: [
            { $lt: ["$startTime", endTime] },
            { $gt: ["$endTime", startTime] },
          ],
        },
      });

      if (roomConflict) {
        return res.status(409).json({
          message: "Room is already occupied in this time slot",
        });
      }
    }

    // 5️⃣ Create slot
    const slot = await TimetableSlot.create({
      timetable_id,
      day,
      startTime,
      endTime,
      subject_id,
      teacher_id,
      room,
      slotType,
    });

    res.status(201).json({
      message: "Slot added successfully",
      slot,
    });
  } catch (error) {
    console.error("Add slot error:", error);
    res.status(500).json({
      message: "Failed to add slot",
    });
  }
};

/**
 * UPDATE Slot
 */
exports.updateSlot = async (req, res) => {
  const slot = await TimetableSlot.findByIdAndUpdate(
    req.params.slotId,
    req.body,
    { new: true },
  );

  if (!slot) {
    return res.status(404).json({ message: "Slot not found" });
  }

  res.json({
    message: "Slot updated successfully",
    slot,
  });
};

/**
 * DELETE Slot
 */
exports.deleteTimetableSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    /* STEP 1: Validate slotId */
    if (!slotId) {
      return res.status(400).json({ message: "Slot ID is required" });
    }

    /* STEP 2: Find slot */
    const slot = await TimetableSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    /* STEP 3: Find timetable */
    const timetable = await Timetable.findById(slot.timetable_id);
    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    /* STEP 4: Find teacher profile */
    const teacher = await Teacher.findOne({ user_id: req.user.id });

    if (!teacher) {
      return res.status(403).json({
        message: "Teacher profile not found",
      });
    }

    /* STEP 5: Verify HOD */
    const department = await Department.findOne({
      _id: timetable.department_id,
      hod_id: teacher._id,
    });

    if (!department) {
      return res.status(403).json({
        message: "Access denied: Only HOD can delete timetable slots",
      });
    }

    /* STEP 6: Delete slot */
    await slot.deleteOne();

    res.json({ message: "Timetable slot deleted successfully" });
  } catch (error) {
    console.error("Delete Slot Error:", error);
    res.status(500).json({ message: "Failed to delete timetable slot" });
  }
};
