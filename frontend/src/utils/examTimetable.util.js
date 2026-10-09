/**
 * Exam Timetable Utilities
 * Pure helper functions for formatting, sorting, filtering, and status calculations.
 */

export const formatDate = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const formatDateWithWeekday = (value) => {
  if (!value) return { weekday: "—", dateStr: "N/A", isoDate: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { weekday: "—", dateStr: "N/A", isoDate: "" };

  const weekday = d
    .toLocaleDateString(undefined, {
      weekday: "short",
      timeZone: "UTC",
    })
    .toUpperCase();

  const dateStr = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const isoDate = d.toISOString().split("T")[0];

  return { weekday, dateStr, isoDate };
};

export const formatTime12Hour = (time24) => {
  if (!time24 || typeof time24 !== "string") return "N/A";
  const [hoursStr, minutesStr] = time24.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "N/A";
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

export const toMinutes = (time24) => {
  if (!time24 || typeof time24 !== "string") return 9999;
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h)) return 9999;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
};

export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const startM = toMinutes(startTime);
  const endM = toMinutes(endTime);
  if (startM >= 9999 || endM >= 9999) return null;
  const diffMinutes = endM - startM;
  if (diffMinutes <= 0) return null;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

export const formatSession = (session) => {
  if (!session) return "N/A";
  if (session === "FORENOON") return "Morning";
  if (session === "AFTERNOON") return "Afternoon";
  return session;
};

/**
 * Robust calendar date extraction to avoid timezone shift bugs.
 * MongoDB stores dates as UTC midnight (e.g. 2026-10-20T00:00:00.000Z).
 */
export const getRelativeExamStatus = (examDate, startTime, endTime, now = new Date()) => {
  if (!examDate) {
    return {
      key: "UNSCHEDULED",
      label: "Date not set",
      isCompleted: false,
      isUpcoming: false,
    };
  }

  const d = new Date(examDate);
  if (Number.isNaN(d.getTime())) {
    return {
      key: "UNSCHEDULED",
      label: "Date not set",
      isCompleted: false,
      isUpcoming: false,
    };
  }

  const examYear = d.getUTCFullYear();
  const examMonth = d.getUTCMonth();
  const examDay = d.getUTCDate();

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  // Pure integer calendar day difference
  const examUtc = Date.UTC(examYear, examMonth, examDay);
  const todayUtc = Date.UTC(todayYear, todayMonth, todayDay);
  const diffDays = Math.round((examUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      key: "COMPLETED",
      label: "Completed",
      isCompleted: true,
      isUpcoming: false,
    };
  }

  if (diffDays === 0) {
    // Exam is TODAY — check if it ended earlier today
    if (endTime && typeof endTime === "string") {
      const [endH, endM] = endTime.split(":").map(Number);
      if (!Number.isNaN(endH)) {
        const examEndDateTime = new Date(
          todayYear,
          todayMonth,
          todayDay,
          endH,
          Number.isNaN(endM) ? 0 : endM,
          59,
        );
        if (now.getTime() > examEndDateTime.getTime()) {
          return {
            key: "COMPLETED",
            label: "Completed",
            isCompleted: true,
            isUpcoming: false,
          };
        }
      }
    }
    return {
      key: "TODAY",
      label: "Today",
      isCompleted: false,
      isUpcoming: true,
    };
  }

  if (diffDays === 1) {
    return {
      key: "TOMORROW",
      label: "Tomorrow",
      isCompleted: false,
      isUpcoming: true,
    };
  }

  if (diffDays === 2) {
    return {
      key: "IN_2_DAYS",
      label: "In 2 days",
      isCompleted: false,
      isUpcoming: true,
    };
  }

  if (diffDays === 3) {
    return {
      key: "IN_3_DAYS",
      label: "In 3 days",
      isCompleted: false,
      isUpcoming: true,
    };
  }

  return {
    key: "IN_X_DAYS",
    label: `In ${diffDays} days`,
    isCompleted: false,
    isUpcoming: true,
  };
};

/**
 * Pure chronological sorting:
 * 1. examDate ascending (missing/invalid dates placed at end)
 * 2. startTime ascending
 * Does NOT mutate original array.
 */
export const sortScheduleSubjects = (subjects) => {
  if (!Array.isArray(subjects)) return [];
  return [...subjects].sort((a, b) => {
    const timeValA = a?.examDate ? new Date(a.examDate).getTime() : NaN;
    const timeValB = b?.examDate ? new Date(b.examDate).getTime() : NaN;

    const validA = !Number.isNaN(timeValA);
    const validB = !Number.isNaN(timeValB);

    if (validA && !validB) return -1;
    if (!validA && validB) return 1;
    if (!validA && !validB) return 0;

    if (timeValA !== timeValB) {
      return timeValA - timeValB;
    }

    const startA = toMinutes(a?.startTime);
    const startB = toMinutes(b?.startTime);

    return startA - startB;
  });
};

/**
 * Filters already-loaded schedule subjects into ALL, UPCOMING, or COMPLETED.
 */
export const filterScheduleSubjects = (subjects, filterType = "ALL", now = new Date()) => {
  if (!Array.isArray(subjects)) return [];
  if (filterType === "ALL") return subjects;

  return subjects.filter((entry) => {
    const status = getRelativeExamStatus(entry.examDate, entry.startTime, entry.endTime, now);
    if (filterType === "UPCOMING") return status.isUpcoming;
    if (filterType === "COMPLETED") return status.isCompleted;
    return true;
  });
};

/**
 * Computes summary metrics for quick glance cards.
 */
export const getScheduleSummaryMetrics = (subjects, now = new Date()) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return {
      totalPapers: 0,
      regularPapers: 0,
      backlogPapers: 0,
      completedPapers: 0,
      upcomingPapers: 0,
      nextExamText: null,
    };
  }

  let regularCount = 0;
  let backlogCount = 0;
  let completedCount = 0;
  let upcomingCount = 0;
  let earliestUpcomingStatus = null;

  for (const entry of subjects) {
    const info = getSubjectInfo(entry);
    if (info.category === "BACKLOG") {
      backlogCount += 1;
    } else {
      regularCount += 1;
    }

    const status = getRelativeExamStatus(entry.examDate, entry.startTime, entry.endTime, now);
    if (status.isCompleted) {
      completedCount += 1;
    } else if (status.isUpcoming) {
      upcomingCount += 1;
      if (!earliestUpcomingStatus) {
        earliestUpcomingStatus = status.label;
      }
    }
  }

  return {
    totalPapers: subjects.length,
    regularPapers: regularCount,
    backlogPapers: backlogCount,
    completedPapers: completedCount,
    upcomingPapers: upcomingCount,
    nextExamText: earliestUpcomingStatus,
  };
};

/**
 * Computes human-readable date range across schedule entries.
 */
export const getExamDateRange = (subjects) => {
  if (!Array.isArray(subjects) || subjects.length === 0) return null;
  const timestamps = subjects
    .map((s) => (s?.examDate ? new Date(s.examDate).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));

  if (timestamps.length === 0) return null;

  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const minStr = formatDate(minDate);
  const maxStr = formatDate(maxDate);

  if (minStr === maxStr) return minStr;
  return `${minStr} – ${maxStr}`;
};

export const normalizeExamItem = (item) => {
  if (!item || typeof item !== "object") return null;

  // Detail wrapper: { exam, schedule, success, message }
  if (item.exam && item.schedule) {
    const exam = item.exam;
    const sched = item.schedule;
    return {
      _id: exam._id,
      name: exam.name,
      course_id: exam.course_id,
      semester: exam.semester,
      academicYear: exam.academicYear,
      status: sched.status || exam.status || "PUBLISHED",
      subjects: Array.isArray(sched.subjects) ? sched.subjects : [],
    };
  }

  // Flat Exam doc (list view)
  return item;
};

export const getSubjectInfo = (entry) => {
  if (!entry) return { name: "N/A", code: "", category: "REGULAR", originalSemester: null };

  const category =
    entry.category ||
    (entry.subject && typeof entry.subject === "object" ? entry.subject.category : null) ||
    "REGULAR";
  const rawOriginalSemester =
    entry.originalSemester !== undefined
      ? entry.originalSemester
      : entry.subject && typeof entry.subject === "object"
        ? entry.subject.originalSemester
        : null;
  const originalSemester = rawOriginalSemester != null ? rawOriginalSemester : null;

  // Flat shape (loadPublishedSchedule remaps)
  if (entry.subjectName || entry.subjectCode) {
    return {
      name: entry.subjectName || "N/A",
      code: entry.subjectCode || "",
      category,
      originalSemester,
    };
  }

  // Populated subject object (loadPublishedScheduleForVisibility)
  const sub = entry.subject;
  if (sub && typeof sub === "object") {
    return {
      name: sub.name || "N/A",
      code: sub.code || "",
      category,
      originalSemester,
    };
  }

  return { name: "N/A", code: "", category, originalSemester };
};

export const hasScheduleData = (subjects) =>
  Array.isArray(subjects) &&
  subjects.some(
    (s) => s && (s.examDate || s.startTime || s.endTime || s.session || s.room),
  );
