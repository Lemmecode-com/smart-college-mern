const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const {
  getDayName,
  formatDate,
  parseLocalDateSafe,
} = require("../utils/date.utils");
const { cache: scheduleCache } = require("./scheduleCache.service");

/**
 * TIMETABLE SCHEDULE SERVICE
 *
 * Core engine for date-wise schedule generation.
 * Uses Template + Exceptions architecture:
 * - Template: Timetable + TimetableSlot (weekly pattern)
 * - Exceptions: TimetableException (date-specific overrides)
 *
 * Generates actual calendar dates from weekly patterns and applies exceptions.
 */

/* =========================================================
   CONSTANTS
========================================================= */

// Exception priority order (higher = more important)
const EXCEPTION_PRIORITY = {
  HOLIDAY: 8,
  CANCELLED: 7,
  RESCHEDULED: 6,
  EXTRA: 5,
  ROOM_CHANGE: 4,
  TEACHER_CHANGE: 3,
  SPECIAL_EVENT: 2,
  EXAM: 1,
};

// Slot status
const SLOT_STATUS = {
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED",
  EXTRA: "EXTRA",
  HOLIDAY: "HOLIDAY",
  COMPLETED: "COMPLETED",
};

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

/**
 * Generate array of dates between startDate and endDate
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Date[]} Array of dates
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = parseLocalDateSafe(startDate);
  current.setHours(0, 0, 0, 0);

  const end = parseLocalDateSafe(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Check if a date is a working day
 * @param {Date} date - Date to check
 * @param {string[]} workingDays - Array of working days
 * @returns {boolean} True if working day
 */
function isWorkingDay(date, workingDays) {
  const dayName = getDayName(date);
  return workingDays.includes(dayName);
}

/**
 * Get slots for a specific day of week
 * @param {string} dayName - MON, TUE, etc.
 * @param {Array} allSlots - All timetable slots
 * @returns {Array} Slots for the specified day
 */
function getSlotsForDay(dayName, allSlots) {
  return allSlots.filter((slot) => slot.day === dayName);
}

/**
 * Group exceptions by date for fast lookup
 * @param {Array} exceptions - Array of exception documents
 * @returns {Map<string, Array>} Map of date -> exceptions
 */
function groupExceptionsByDate(exceptions) {
  const exceptionMap = new Map();

  exceptions.forEach((exc) => {
    const dateStr = formatDate(exc.exceptionDate);
    if (!exceptionMap.has(dateStr)) {
      exceptionMap.set(dateStr, []);
    }
    exceptionMap.get(dateStr).push(exc);
  });

  return exceptionMap;
}

/**
 * Group exceptions by slot_id for fast lookup
 * @param {Array} exceptions - Array of exception documents
 * @returns {Map<string, Array>} Map of slot_id -> exceptions
 */
function groupExceptionsBySlot(exceptions) {
  const exceptionMap = new Map();

  exceptions.forEach((exc) => {
    if (exc.slot_id) {
      const slotIdStr = exc.slot_id._id.toString();
      if (!exceptionMap.has(slotIdStr)) {
        exceptionMap.set(slotIdStr, []);
      }
      exceptionMap.get(slotIdStr).push(exc);
    }
  });

  return exceptionMap;
}

/**
 * Sort exceptions by priority
 * @param {Array} exceptions - Array of exceptions
 * @returns {Array} Sorted exceptions
 */
function sortExceptionsByPriority(exceptions) {
  return exceptions.sort((a, b) => {
    const priorityA = EXCEPTION_PRIORITY[a.type] || 0;
    const priorityB = EXCEPTION_PRIORITY[b.type] || 0;
    return priorityB - priorityA; // Higher priority first
  });
}

/**
 * Apply exceptions to a slot for a specific date
 * @param {Object} slot - Timetable slot
 * @param {Date} date - Current date
 * @param {Array} dateExceptions - Exceptions for this date
 * @param {Array} slotExceptions - Exceptions for this specific slot
 * @returns {Object} Modified slot with exception metadata
 */
function applyExceptionsToSlot(slot, date, dateExceptions, slotExceptions) {
  const dateStr = formatDate(date);
  const allRelevantExceptions = [...dateExceptions, ...slotExceptions];
  const sortedExceptions = sortExceptionsByPriority(allRelevantExceptions);

  // Start with base slot
  const resultSlot = {
    ...slot.toObject(),
    exceptionDate: dateStr,
    status: SLOT_STATUS.SCHEDULED,
    exception: null,
  };

  // Apply exceptions in priority order
  for (const exc of sortedExceptions) {
    switch (exc.type) {
      case "HOLIDAY":
        // Holiday overrides everything - slot is cancelled
        resultSlot.status = SLOT_STATUS.HOLIDAY;
        resultSlot.exception = {
          type: "HOLIDAY",
          reason: exc.reason,
          approvedBy: exc.approvedBy,
        };
        return resultSlot; // Holiday cancels all other processing

      case "CANCELLED":
        // Check if this exception applies to this specific slot
        if (
          !exc.slot_id ||
          exc.slot_id._id.toString() === slot._id.toString()
        ) {
          resultSlot.status = SLOT_STATUS.CANCELLED;
          resultSlot.exception = {
            type: "CANCELLED",
            reason: exc.reason,
            rescheduledTo: exc.rescheduledTo
              ? formatDate(exc.rescheduledTo)
              : null,
            approvedBy: exc.approvedBy,
          };
        }
        break;

      case "RESCHEDULED":
        // Check if this is the original slot being rescheduled
        if (exc.slot_id && exc.slot_id._id.toString() === slot._id.toString()) {
          resultSlot.status = SLOT_STATUS.RESCHEDULED;
          resultSlot.exception = {
            type: "RESCHEDULED",
            reason: exc.reason,
            rescheduledTo: exc.rescheduledTo
              ? formatDate(exc.rescheduledTo)
              : null,
            approvedBy: exc.approvedBy,
          };
        }
        break;

      case "ROOM_CHANGE":
        // Update room for this date
        if (exc.slot_id && exc.slot_id._id.toString() === slot._id.toString()) {
          resultSlot.room = exc.newRoom || resultSlot.room;
          resultSlot.exception = {
            ...(resultSlot.exception || {}),
            type: "ROOM_CHANGE",
            reason: exc.reason,
            originalRoom: resultSlot.room,
            newRoom: exc.newRoom,
          };
        }
        break;

      case "TEACHER_CHANGE":
        // Update teacher for this date
        if (exc.slot_id && exc.slot_id._id.toString() === slot._id.toString()) {
          resultSlot.exception = {
            ...(resultSlot.exception || {}),
            type: "TEACHER_CHANGE",
            reason: exc.reason,
            originalTeacher: resultSlot.teacher_id,
            substituteTeacher: exc.substituteTeacher,
          };
          // Populate substitute teacher if available
          if (exc.substituteTeacher) {
            resultSlot.teacher_id = exc.substituteTeacher;
          }
        }
        break;
    }
  }

  return resultSlot;
}

/**
 * Generate extra slots for a specific date
 * @param {Array} extraExceptions - EXTRA type exceptions
 * @returns {Array} Extra slot objects
 */
function generateExtraSlots(extraExceptions) {
  return extraExceptions
    .filter((exc) => exc.type === "EXTRA" && exc.extraSlot)
    .map((exc) => ({
      _id: null, // Extra slots don't have original slot ID
      slotType: "EXTRA",
      day: getDayName(exc.exceptionDate),
      startTime: exc.extraSlot.startTime,
      endTime: exc.extraSlot.endTime,
      subject_id: exc.extraSlot.subject_id,
      teacher_id: exc.extraSlot.teacher_id,
      room: exc.extraSlot.room || "TBA",
      exceptionDate: formatDate(exc.exceptionDate),
      status: SLOT_STATUS.EXTRA,
      exception: {
        type: "EXTRA",
        reason: exc.reason,
        approvedBy: exc.approvedBy,
      },
    }));
}

/* =========================================================
   CORE SERVICE FUNCTIONS
========================================================= */

/**
 * GENERATE DATE-WISE SCHEDULE
 *
 * Main function that generates a complete calendar schedule
 * from timetable template and exceptions.
 *
 * @param {string} timetableId - Timetable ID
 * @param {Date} startDate - Start date for schedule
 * @param {Date} endDate - End date for schedule
 * @param {Object} options - Optional configuration
 * @returns {Object} Complete schedule grouped by date
 */
exports.generateSchedule = async (
  timetableId,
  startDate,
  endDate,
  options = {},
) => {
  try {
    // Generate cache key
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const cacheKey = scheduleCache.generateKey(timetableId, startStr, endStr);

    // Check cache first
    let cachedSchedule;
    try {
      cachedSchedule = scheduleCache.get(cacheKey);
    } catch (error) {
      console.error("Cache get error:", error.message);
    }

    if (cachedSchedule) {
      return cachedSchedule;
    }

    // 1️⃣ Load timetable template
    const timetable = await Timetable.findById(timetableId)
      .populate("department_id", "name")
      .populate("course_id", "name code");

    if (!timetable) {
      throw new Error(`Timetable not found: ${timetableId}`);
    }

    // Validate date range
    // Parse dates as local timezone to avoid UTC shift issues
    const start = parseLocalDateSafe(startDate);
    const end = parseLocalDateSafe(endDate);

    if (start > end) {
      throw new Error("startDate must be before endDate");
    }

    // Store original requested date range for exception loading
    const originalStart = new Date(start);
    const originalEnd = new Date(end);

    // Check if requested range overlaps with timetable dates
    if (timetable.startDate && timetable.endDate) {
      const timetableStart = new Date(timetable.startDate);
      const timetableEnd = new Date(timetable.endDate);

      // If range is completely before timetable start, trim to first week
      if (end < timetableStart) {
        // Set to start from timetable start
        start.setTime(timetableStart.getTime());
        // Keep the same duration (7 days for a week)
        const durationMs =
          new Date(endDate).getTime() - new Date(startDate).getTime();
        end.setTime(timetableStart.getTime() + durationMs);
      }
      // If range is completely after timetable end, trim to last week
      else if (start > timetableEnd) {
        // Set to end at timetable end
        end.setTime(timetableEnd.getTime());
        // Keep the same duration (7 days for a week)
        const durationMs =
          new Date(endDate).getTime() - new Date(startDate).getTime();
        start.setTime(timetableEnd.getTime() - durationMs);
      }
      // Otherwise, just trim to timetable boundaries
      else {
        const effectiveStart = start < timetableStart ? timetableStart : start;
        const effectiveEnd = end > timetableEnd ? timetableEnd : end;

        start.setTime(effectiveStart.getTime());
        end.setTime(effectiveEnd.getTime());
      }
    }

    // 2️⃣ Load all slots for this timetable
    const allSlots = await TimetableSlot.find({
      timetable_id: timetableId,
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name email")
      .sort({ day: 1, startTime: 1 });

    // IMPORTANT: If timetable has slots for days NOT in workingDays, add them
    // This ensures all configured slots are shown even if workingDays is incomplete
    const daysWithSlots = [...new Set(allSlots.map((slot) => slot.day))];
    const missingWorkingDays = daysWithSlots.filter(
      (day) => !timetable.workingDays.includes(day),
    );

    if (missingWorkingDays.length > 0) {
      // Merge workingDays to include all days that have slots
      timetable.workingDays = [
        ...new Set([...timetable.workingDays, ...daysWithSlots]),
      ];
      console.log(`✅ Updated workingDays:`, timetable.workingDays);
    }

    // 3️⃣ Load all exceptions for the ORIGINAL requested date range
    // Convert local dates to UTC date range for MongoDB query
    const queryStart = new Date(
      originalStart.getFullYear(),
      originalStart.getMonth(),
      originalStart.getDate(),
    );
    const queryEnd = new Date(
      originalEnd.getFullYear(),
      originalEnd.getMonth(),
      originalEnd.getDate() + 1,
    );

    const exceptions = await TimetableException.find({
      timetable_id: timetableId,
      exceptionDate: {
        $gte: queryStart,
        $lt: queryEnd,
      },
      isActive: true,
    })
      .populate("slot_id", "day startTime endTime subject_id teacher_id room")
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .sort({ exceptionDate: 1, type: 1 });

    // 4️⃣ Group exceptions for fast lookup
    const exceptionsByDate = groupExceptionsByDate(exceptions);
    const exceptionsBySlot = groupExceptionsBySlot(exceptions);

    // 5️⃣ Generate date range using ORIGINAL requested dates (includes exceptions outside timetable period)
    const dates = generateDateRange(originalStart, originalEnd);

    // 6️⃣ Generate schedule for each date
    const scheduleArray = [];
    let totalSlots = 0;
    let cancelledCount = 0;
    let extraCount = 0;
    let holidayCount = 0;
    let workingDayCount = 0;

    for (const date of dates) {
      const dateStr = formatDate(date);
      const dayName = getDayName(date);
      const isWorking = isWorkingDay(date, timetable.workingDays);
      const dateExceptions = exceptionsByDate.get(dateStr) || [];

      // Check if entire day is a holiday
      const isHoliday = dateExceptions.some((exc) => exc.type === "HOLIDAY");

      if (isHoliday) {
        holidayCount++;
        const holidayException = dateExceptions.find(
          (exc) => exc.type === "HOLIDAY",
        );

        scheduleArray.push({
          date: dateStr,
          dayName,
          isWorkingDay: isWorking,
          isHoliday: true,
          slots: [
            {
              _id: `holiday-${dateStr}`,
              subject_id: {
                name: "Holiday",
                code: "HOLIDAY",
              },
              teacher_id: null,
              room: null,
              startTime: "00:00",
              endTime: "23:59",
              day: dayName,
              slotType: "HOLIDAY",
              status: "HOLIDAY",
              exceptionDate: dateStr,
              isHolidayOnly: true,
              exception: {
                type: "HOLIDAY",
                reason: holidayException?.reason || "Holiday",
                approvedBy: holidayException?.approvedBy,
                approvedAt: holidayException?.approvedAt,
              },
            },
          ],
          holidayReason: holidayException?.reason,
        });
        continue;
      }

      // If not a working day, check for extra classes
      if (!isWorking) {
        const extraExceptions = dateExceptions.filter(
          (exc) => exc.type === "EXTRA",
        );
        if (extraExceptions.length > 0) {
          const extraSlots = generateExtraSlots(extraExceptions);
          extraCount += extraSlots.length;

          scheduleArray.push({
            date: dateStr,
            dayName,
            isWorkingDay: false,
            isExtraDay: true,
            slots: extraSlots,
          });
        }
        // Skip non-working days without extra classes
        continue;
      }

      // It's a working day - get regular slots
      const daySlots = getSlotsForDay(dayName, allSlots);

      if (daySlots.length === 0) {
        // No slots scheduled for this day
        continue;
      }

      workingDayCount++;

      // Apply exceptions to each slot
      const slotsWithExceptions = daySlots.map((slot) => {
        const slotExceptions = exceptionsBySlot.get(slot._id.toString()) || [];
        return applyExceptionsToSlot(
          slot,
          date,
          dateExceptions,
          slotExceptions,
        );
      });

      // Add extra slots for this date
      const extraExceptions = dateExceptions.filter(
        (exc) => exc.type === "EXTRA",
      );
      const extraSlots = generateExtraSlots(extraExceptions);

      const allSlotsForDate = [...slotsWithExceptions, ...extraSlots];

      // Count statistics
      allSlotsForDate.forEach((slot) => {
        totalSlots++;
        if (slot.status === SLOT_STATUS.CANCELLED) cancelledCount++;
        if (slot.status === SLOT_STATUS.EXTRA) extraCount++;
      });

      scheduleArray.push({
        date: dateStr,
        dayName,
        isWorkingDay: true,
        slots: allSlotsForDate,
      });
    }

    // 7️⃣ Cache and return final schedule
    const schedule = {
      timetable,
      schedule: scheduleArray,
      summary: {
        totalDays: dates.length,
        workingDays: workingDayCount,
        totalScheduledSlots: totalSlots,
        cancelledSlots: cancelledCount,
        extraClasses: extraCount,
        holidays: holidayCount,
      },
    };

    // Cache the result
    try {
      scheduleCache.set(cacheKey, schedule);
    } catch (error) {
      console.error("Cache set error:", error.message);
    }

    return schedule;
  } catch (error) {
    console.error("Schedule generation failed:", error.message);
    throw error;
  }
};

/**
 * GET TODAY'S SCHEDULE
 *
 * Simplified version for dashboard widgets.
 *
 * @param {string} timetableId - Timetable ID
 * @returns {Object} Today's schedule
 */
exports.getTodaySchedule = async (timetableId) => {
  try {
    const today = parseLocalDateSafe(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.generateSchedule(timetableId, today, tomorrow);

    if (!result || result.schedule.length === 0) {
      return {
        date: formatDate(today),
        dayName: getDayName(today),
        isHoliday: false,
        slots: [],
        message: "No classes scheduled for today",
      };
    }

    return result.schedule[0];
  } catch (error) {
    console.error("Get today schedule failed:", error.message);
    throw error;
  }
};

/**
 * GET WEEKLY SCHEDULE
 *
 * Get schedule for current week.
 *
 * @param {string} timetableId - Timetable ID
 * @returns {Object} Weekly schedule
 */
exports.getWeeklySchedule = async (timetableId) => {
  try {
    const today = parseLocalDateSafe(new Date());
    const dayOfWeek = today.getDay();

    // Calculate Monday of current week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    // Calculate Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return await this.generateSchedule(timetableId, monday, sunday);
  } catch (error) {
    console.error("Get weekly schedule failed:", error.message);
    throw error;
  }
};

/**
 * GET TEACHER'S SCHEDULE
 *
 * Get schedule filtered by teacher.
 *
 * @param {string} timetableId - Timetable ID
 * @param {string} teacherId - Teacher ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Teacher's schedule
 */
exports.getTeacherSchedule = async (
  timetableId,
  teacherId,
  startDate,
  endDate,
) => {
  try {
    const result = await this.generateSchedule(timetableId, startDate, endDate);

    // Filter slots by teacher
    const filteredSchedule = result.schedule
      .map((daySchedule) => {
        const teacherSlots = daySchedule.slots.filter((slot) => {
          // Check if teacher is the primary teacher
          const isPrimaryTeacher =
            slot.teacher_id &&
            (slot.teacher_id._id?.toString() === teacherId ||
              slot.teacher_id.toString() === teacherId);

          // Check if teacher is a substitute
          const isSubstitute =
            slot.exception?.substituteTeacher?.toString() === teacherId;

          return isPrimaryTeacher || isSubstitute;
        });

        return {
          ...daySchedule,
          slots: teacherSlots,
        };
      })
      .filter((daySchedule) => daySchedule.slots.length > 0);

    return {
      ...result,
      schedule: filteredSchedule,
      summary: {
        ...result.summary,
        totalDays: filteredSchedule.length,
      },
    };
  } catch (error) {
    console.error("Get teacher schedule failed:", error.message);
    throw error;
  }
};

/**
 * GET STUDENT'S SCHEDULE
 *
 * Similar to general schedule but can be extended for student-specific features.
 *
 * @param {string} timetableId - Timetable ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Student schedule
 */
exports.getStudentSchedule = async (timetableId, startDate, endDate) => {
  try {
    return await this.generateSchedule(timetableId, startDate, endDate);
  } catch (error) {
    console.error("Get student schedule failed:", error.message);
    throw error;
  }
};

/**
 * GET SCHEDULE STATISTICS
 *
 * Get detailed statistics for a timetable in a date range.
 *
 * @param {string} timetableId - Timetable ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Detailed statistics
 */
exports.getScheduleStatistics = async (timetableId, startDate, endDate) => {
  try {
    const result = await this.generateSchedule(timetableId, startDate, endDate);

    // Calculate subject-wise statistics
    const subjectStats = {};

    result.schedule.forEach((day) => {
      day.slots.forEach((slot) => {
        const subjectName = slot.subject_id?.name || "Unknown";
        const subjectCode = slot.subject_id?.code || "N/A";

        if (!subjectStats[subjectName]) {
          subjectStats[subjectName] = {
            subject: subjectName,
            code: subjectCode,
            total: 0,
            scheduled: 0,
            cancelled: 0,
            extra: 0,
            completed: 0,
          };
        }

        subjectStats[subjectName].total++;

        switch (slot.status) {
          case SLOT_STATUS.SCHEDULED:
            subjectStats[subjectName].scheduled++;
            break;
          case SLOT_STATUS.CANCELLED:
            subjectStats[subjectName].cancelled++;
            break;
          case SLOT_STATUS.EXTRA:
            subjectStats[subjectName].extra++;
            break;
          case SLOT_STATUS.COMPLETED:
            subjectStats[subjectName].completed++;
            break;
        }
      });
    });

    return {
      summary: result.summary,
      subjectWise: Object.values(subjectStats),
    };
  } catch (error) {
    console.error("Get schedule statistics failed:", error.message);
    throw error;
  }
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateSchedule: exports.generateSchedule,
  getTodaySchedule: exports.getTodaySchedule,
  getWeeklySchedule: exports.getWeeklySchedule,
  getTeacherSchedule: exports.getTeacherSchedule,
  getStudentSchedule: exports.getStudentSchedule,
  getScheduleStatistics: exports.getScheduleStatistics,
  // Export helpers for testing
  generateDateRange,
  isWorkingDay,
  getDayName,
  formatDate,
  groupExceptionsByDate,
  sortExceptionsByPriority,
  applyExceptionsToSlot,
  EXCEPTION_PRIORITY,
  SLOT_STATUS,
};
