const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const { parseLocalDateSafe } = require("../utils/date.utils");


/**
 * EXCEPTION VALIDATION SERVICE
 *
 * Provides conflict detection for timetable exceptions:
 * - Teacher double-booking prevention
 * - Room conflict detection
 * - Overlapping exception validation
 */

/* =========================================================
   CHECK TEACHER CONFLICT
   Checks if a teacher is already assigned to another class
   on the same date and time
========================================================= */
exports.checkTeacherConflict = async (
  teacherId,
  date,
  startTime,
  endTime,
  collegeId,
) => {
  try {
    const dateObj = parseLocalDateSafe(date);
    const dayName = dateObj
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();

    // Check regular timetable slots
    const slotConflict = await TimetableSlot.findOne({
      college_id: collegeId,
      teacher_id: teacherId,
      day: dayName,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] },
        ],
      },
    });

    if (slotConflict) {
      return true; // Conflict found
    }

    // Check EXTRA/RESCHEDULED exceptions on the same date
    const exceptionConflict = await TimetableException.findOne({
      college_id: collegeId,
      exceptionDate: dateObj,
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
      $or: [
        {
          "extraSlot.teacher_id": teacherId,
          "extraSlot.startTime": { $exists: true },
          $expr: {
            $and: [
              { $lt: ["$extraSlot.startTime", endTime] },
              { $gt: ["$extraSlot.endTime", startTime] },
            ],
          },
        },
        {
          substituteTeacher: teacherId,
        },
      ],
    });

    return !!exceptionConflict;
  } catch (error) {
    console.error("Teacher conflict check failed:", error);
    throw error;
  }
};

/* =========================================================
   CHECK ROOM CONFLICT
   Checks if a room is already booked on the same date and time
========================================================= */
exports.checkRoomConflict = async (
  room,
  date,
  startTime,
  endTime,
  collegeId,
) => {
  try {
    const dateObj = parseLocalDateSafe(date);
    const dayName = dateObj
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();

    // Check regular timetable slots
    const slotConflict = await TimetableSlot.findOne({
      college_id: collegeId,
      room: room,
      day: dayName,
      $expr: {
        $and: [
          { $lt: ["$startTime", endTime] },
          { $gt: ["$endTime", startTime] },
        ],
      },
    });

    if (slotConflict) {
      return true; // Conflict found
    }

    // Check EXTRA exceptions with same room
    const exceptionConflict = await TimetableException.findOne({
      college_id: collegeId,
      exceptionDate: dateObj,
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
      $or: [
        { newRoom: room },
        {
          "extraSlot.room": room,
          "extraSlot.startTime": { $exists: true },
          $expr: {
            $and: [
              { $lt: ["$extraSlot.startTime", endTime] },
              { $gt: ["$extraSlot.endTime", startTime] },
            ],
          },
        },
      ],
    });

    return !!exceptionConflict;
  } catch (error) {
    console.error("Room conflict check failed:", error);
    throw error;
  }
};

/* =========================================================
   VALIDATE EXCEPTION
   Comprehensive validation before creating/updating exception
========================================================= */
exports.validateException = async (exceptionData, collegeId) => {
  const errors = [];

  try {
    // 1️⃣ Validate date is not too far in the past or future
    const exceptionDate = parseLocalDateSafe(exceptionData.exceptionDate);
    const now = parseLocalDateSafe(new Date());
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (exceptionDate < oneYearAgo) {
      errors.push("Exception date cannot be more than 1 year in the past");
    }

    if (exceptionDate > oneYearFromNow) {
      errors.push("Exception date cannot be more than 1 year in the future");
    }

    // 2️⃣ Validate type-specific requirements
    if (exceptionData.type === "EXTRA") {
      if (!exceptionData.extraSlot) {
        errors.push("EXTRA exception requires extraSlot details");
      } else {
        if (
          !exceptionData.extraSlot.startTime ||
          !exceptionData.extraSlot.endTime
        ) {
          errors.push("EXTRA exception requires startTime and endTime");
        }
        if (!exceptionData.extraSlot.subject_id) {
          errors.push("EXTRA exception requires subject_id");
        }
        if (!exceptionData.extraSlot.teacher_id) {
          errors.push("EXTRA exception requires teacher_id");
        }
        if (
          exceptionData.extraSlot.startTime >= exceptionData.extraSlot.endTime
        ) {
          errors.push("EXTRA startTime must be before endTime");
        }
      }
    }

    if (exceptionData.type === "RESCHEDULED") {
      if (!exceptionData.rescheduledTo) {
        errors.push("RESCHEDULED exception requires rescheduledTo date");
      }
    }

    // 3️⃣ Check for overlapping exceptions on same date
    if (exceptionData.slot_id && exceptionData.exceptionDate) {
      const overlapping = await TimetableException.findOne({
        college_id: collegeId,
        slot_id: exceptionData.slot_id,
        exceptionDate: exceptionDate,
        status: { $in: ["PENDING", "APPROVED"] },
        isActive: true,
        _id: exceptionData.exceptionId
          ? { $ne: exceptionData.exceptionId }
          : {},
      });

      if (overlapping) {
        errors.push(
          `Another ${overlapping.type} exception already exists for this slot on this date`,
        );
      }
    }

    // 4️⃣ Validate teacher-subject match
    if (
      exceptionData.extraSlot?.teacher_id &&
      exceptionData.extraSlot?.subject_id
    ) {
      const Subject = require("../models/subject.model");
      const subject = await Subject.findById(
        exceptionData.extraSlot.subject_id,
      );

      if (
        subject &&
        subject.teacher_id.toString() !==
          exceptionData.extraSlot.teacher_id.toString()
      ) {
        errors.push("Teacher does not match the subject's assigned teacher");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error("Exception validation failed:", error);
    return {
      isValid: false,
      errors: [`Validation error: ${error.message}`],
    };
  }
};

/* =========================================================
   CHECK HOLIDAY CONFLICT
   Checks if a date is already marked as a holiday
========================================================= */
exports.checkHolidayConflict = async (timetableId, date) => {
  try {
    const dateObj = parseLocalDateSafe(date);

    const holiday = await TimetableException.findOne({
      timetable_id: timetableId,
      exceptionDate: dateObj,
      type: "HOLIDAY",
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    });

    return !!holiday;
  } catch (error) {
    console.error("Holiday conflict check failed:", error);
    throw error;
  }
};

/* =========================================================
   GET ALL EXCEPTIONS FOR DATE RANGE
   Bulk fetch exceptions for schedule generation
========================================================= */
exports.getExceptionsForDateRange = async (
  collegeId,
  timetableId,
  startDate,
  endDate,
) => {
  try {
    const startObj = parseLocalDateSafe(startDate);
    const endObj = parseLocalDateSafe(endDate);

    const exceptions = await TimetableException.find({
      college_id: collegeId,
      timetable_id: timetableId,
      exceptionDate: {
        $gte: startObj,
        $lte: endObj,
      },
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    })
      .populate("slot_id", "day startTime endTime subject_id teacher_id room")
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .sort({ exceptionDate: 1, type: 1 });

    return exceptions;
  } catch (error) {
    console.error("Failed to fetch exceptions for date range:", error);
    throw error;
  }
};

/* =========================================================
   CHECK TEACHER AVAILABILITY ON DATE
   Checks if teacher is available on a specific date
   (not on leave, not double-booked, etc.)
========================================================= */
exports.checkTeacherAvailability = async (teacherId, date, collegeId) => {
  try {
    const dateObj = parseLocalDateSafe(date);

    // Check if teacher has a CANCELLED exception (on leave)
    const onLeave = await TimetableException.findOne({
      college_id: collegeId,
      exceptionDate: dateObj,
      $or: [
        { "extraSlot.teacher_id": teacherId },
        { substituteTeacher: teacherId },
      ],
      type: "CANCELLED",
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    });

    if (onLeave) {
      return {
        available: false,
        reason: "Teacher has cancelled classes on this date",
      };
    }

    // Check if teacher is assigned as substitute on multiple exceptions
    const substituteAssignments = await TimetableException.find({
      college_id: collegeId,
      exceptionDate: dateObj,
      substituteTeacher: teacherId,
      status: { $in: ["APPROVED", "COMPLETED"] },
      isActive: true,
    });

    if (substituteAssignments.length > 2) {
      return {
        available: false,
        reason: "Teacher is already substitute teaching on multiple classes",
        conflicts: substituteAssignments,
      };
    }

    return {
      available: true,
      substituteCount: substituteAssignments.length,
    };
  } catch (error) {
    console.error("Teacher availability check failed:", error);
    throw error;
  }
};
