const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Department = require("../models/department.model");
const College = require("../models/college.model");
const hodActivityService = require("./hodActivity.service");

/**
 * Helper to compute human-readable time ago
 */
const getTimeAgo = (date) => {
  if (!date) return "Recently";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Fetch comprehensive real-data HOD Dashboard data
 */
exports.getHodDashboardData = async (arg1, arg2) => {
  let collegeId, department, teacher;

  if (arg1 && typeof arg1 === "object" && !arg1._bsontype && (arg1.collegeId || arg1.department || arg1.teacher)) {
    collegeId = arg1.collegeId;
    department = arg1.department;
    teacher = arg1.teacher;
  } else {
    // Positional call: (userIdOrTeacherId, collegeId)
    const userIdOrTeacherId = arg1;
    collegeId = arg2;

    teacher = await Teacher.findOne({
      $or: [{ user_id: userIdOrTeacherId }, { _id: userIdOrTeacherId }],
      college_id: collegeId,
    });
    if (teacher && teacher.department_id) {
      department = await Department.findById(teacher.department_id);
    }
  }

  if (!department && teacher?.department_id) {
    department = await Department.findById(teacher.department_id);
  }

  if (!department) {
    throw new Error("Department not found for HOD dashboard");
  }

  const departmentId = department._id;

  // 1. Department HOD details with title and full name
  let hodDetails = null;
  let hodTeacher = null;

  if (department.hod_id) {
    hodTeacher = await Teacher.findById(department.hod_id).select(
      "name employeeId email specialization"
    );
  }
  if (!hodTeacher && teacher) {
    hodTeacher = teacher;
  }

  if (hodTeacher) {
    hodDetails = {
      id: hodTeacher._id,
      name: hodTeacher.name,
      employeeId: hodTeacher.employeeId,
      specialization: hodTeacher.specialization || null,
      email: hodTeacher.email,
    };
  }

  // 2. Department counts (guaranteed exact match with Reports page)
  const [teachersCount, studentsCount, subjectsCount, coursesCount] =
    await Promise.all([
      Teacher.countDocuments({
        college_id: collegeId,
        department_id: departmentId,
      }),
      Student.countDocuments({
        college_id: collegeId,
        department_id: departmentId,
      }),
      Subject.countDocuments({
        college_id: collegeId,
        department_id: departmentId,
      }),
      Course.countDocuments({
        college_id: collegeId,
        department_id: departmentId,
      }),
    ]);

  // 3. Timetables breakdown
  const [publishedCount, draftCount, archivedCount] = await Promise.all([
    Timetable.countDocuments({
      college_id: collegeId,
      department_id: departmentId,
      status: "PUBLISHED",
    }),
    Timetable.countDocuments({
      college_id: collegeId,
      department_id: departmentId,
      status: "DRAFT",
    }),
    Timetable.countDocuments({
      college_id: collegeId,
      department_id: departmentId,
      status: "ARCHIVED",
    }),
  ]);
  const totalTimetables = publishedCount + draftCount + archivedCount;

  // 4. Attendance Today calculation & Last Session subtext
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const todayClosedSessions = await AttendanceSession.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
    lectureDate: { $gte: startOfToday, $lte: endOfToday },
  });

  let attendanceTodayRate = null;
  const todayClosedCount = todayClosedSessions.length;
  if (todayClosedSessions.length > 0) {
    let sumPresent = 0;
    let sumTotal = 0;
    todayClosedSessions.forEach((s) => {
      sumPresent += s.presentCount || 0;
      sumTotal += s.totalStudents || 0;
    });
    attendanceTodayRate =
      sumTotal > 0 ? Math.round((sumPresent / sumTotal) * 100) : 0;
  }

  // Find most recent closed session in this department for "Last session: <rate>% · <time ago>"
  let lastSessionInfo = null;
  const lastClosedSession = await AttendanceSession.findOne({
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
  })
    .populate("subject_id", "name")
    .populate("teacher_id", "name")
    .sort({ lectureDate: -1, updatedAt: -1 });

  if (lastClosedSession) {
    const present = lastClosedSession.presentCount || 0;
    const total = lastClosedSession.totalStudents || 1;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const eventDate = lastClosedSession.lectureDate || lastClosedSession.updatedAt;
    lastSessionInfo = {
      rate,
      timeAgo: getTimeAgo(eventDate),
      subject: lastClosedSession.subject_id?.name || "Lecture",
      teacher: lastClosedSession.teacher_id?.name || "Faculty",
    };
  }

  // 5. Action Required metrics
  const pendingExceptions = await TimetableException.countDocuments({
    college_id: collegeId,
    department_id: departmentId,
    status: "PENDING",
  });

  const pendingDraftTimetables = draftCount;

  // Low attendance students (< 75%)
  const deptSessions = await AttendanceSession.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
  }).select("_id");

  let lowAttendanceStudentsCount = 0;
  if (deptSessions.length > 0) {
    const sessionIds = deptSessions.map((s) => s._id);
    const studentAggregates = await AttendanceRecord.aggregate([
      { $match: { session_id: { $in: sessionIds } } },
      {
        $group: {
          _id: "$student_id",
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] },
          },
        },
      },
    ]);
    lowAttendanceStudentsCount = studentAggregates.filter(
      (st) => st.total > 0 && (st.present / st.total) * 100 < 75
    ).length;
  }

  // Unmarked sessions (OPEN on or before today)
  const unmarkedSessionsCount = await AttendanceSession.countDocuments({
    college_id: collegeId,
    department_id: departmentId,
    status: "OPEN",
    lectureDate: { $lte: endOfToday },
  });

  const totalActionsRequired =
    pendingExceptions +
    pendingDraftTimetables +
    lowAttendanceStudentsCount +
    unmarkedSessionsCount;

  // 6. Today's Schedule & Next Lecture Fallback
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const currentDay = dayNames[now.getDay()];

  /**
   * Check whether a timetable is effective for a given calendar date.
   * Checks explicit startDate/endDate if present, or academicYear date range (June 1 startYear to May 31 endYear).
   */
  const isTimetableEffectiveForDate = (tt, targetDate = new Date()) => {
    if (tt.startDate && tt.endDate) {
      const s = new Date(tt.startDate);
      const e = new Date(tt.endDate);
      return targetDate >= s && targetDate <= e;
    }
    if (tt.startDate && !tt.endDate) {
      return targetDate >= new Date(tt.startDate);
    }
    if (!tt.startDate && tt.endDate) {
      return targetDate <= new Date(tt.endDate);
    }
    if (tt.academicYear && /^\d{4}-\d{4}$/.test(tt.academicYear)) {
      const [sY, eY] = tt.academicYear.split("-").map(Number);
      const ayStart = new Date(sY, 5, 1, 0, 0, 0, 0); // June 1
      const ayEnd = new Date(eY, 4, 31, 23, 59, 59, 999); // May 31
      return targetDate >= ayStart && targetDate <= ayEnd;
    }
    return true;
  };

  const allPublishedTimetables = await Timetable.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "PUBLISHED",
  }).select("_id academicYear name startDate endDate");

  // Match timetables by effective date range
  const activeTodayTimetables = allPublishedTimetables.filter((t) =>
    isTimetableEffectiveForDate(t, now)
  );
  const activeTodayTimetableIds = activeTodayTimetables.map((t) => t._id);

  const todaySlots = activeTodayTimetableIds.length > 0
    ? await TimetableSlot.find({
        timetable_id: { $in: activeTodayTimetableIds },
        day: currentDay,
      })
        .populate("subject_id", "name code")
        .populate("teacher_id", "name")
        .populate("course_id", "name code")
        .sort({ startTime: 1 })
    : [];

  const todayAllSessions = await AttendanceSession.find({
    college_id: collegeId,
    department_id: departmentId,
    lectureDate: { $gte: startOfToday, $lte: endOfToday },
  })
    .populate("subject_id", "name code")
    .populate("teacher_id", "name");

  const sessionBySlotId = new Map();
  todayAllSessions.forEach((s) => {
    if (s.slot_id) sessionBySlotId.set(s.slot_id.toString(), s);
  });

  const todaySchedule = todaySlots.map((slot) => {
    const session = sessionBySlotId.get(slot._id.toString());
    const isMarked = session ? session.status === "CLOSED" : false;
    return {
      id: slot._id.toString(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      time: `${slot.startTime} - ${slot.endTime}`,
      subjectName: slot.subject_id?.name || "Subject",
      subjectCode: slot.subject_id?.code || "",
      teacherName: slot.teacher_id?.name || "Faculty",
      room: slot.room || "Classroom",
      isMarked,
      attendanceStatus: isMarked ? "Marked" : "Not Marked",
    };
  });

  // Find next upcoming lecture with concrete calendar date if today has no lectures
  let nextLecture = null;
  const allPublishedTtIds = allPublishedTimetables.map((t) => t._id);
  if (todaySchedule.length === 0 && allPublishedTtIds.length > 0) {
    const allPublishedSlots = await TimetableSlot.find({
      timetable_id: { $in: allPublishedTtIds },
    })
      .populate("subject_id", "name code")
      .populate("teacher_id", "name")
      .sort({ startTime: 1 });

    if (allPublishedSlots.length > 0) {
      const dayOrder = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const dayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthShortNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      const currentDayIdx = now.getDay();

      // Look ahead up to 14 days to find the next scheduled lecture occurrence
      for (let offset = 1; offset <= 14; offset++) {
        const checkDay = dayOrder[(currentDayIdx + offset) % 7];
        const slotOnDay = allPublishedSlots.find((s) => s.day === checkDay);
        if (slotOnDay) {
          const targetDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + offset
          );
          const dateStr = `${dayShortNames[targetDate.getDay()]} ${targetDate.getDate()} ${monthShortNames[targetDate.getMonth()]}`;
          const timeStr = slotOnDay.startTime; // e.g. "09:00"
          const formattedDateTime = `${dateStr}, ${timeStr}`;

          nextLecture = {
            date: dateStr,
            time: timeStr,
            formattedDateTime,
            day: dateStr,
            subject: slotOnDay.subject_id?.name || "Subject",
            teacher: slotOnDay.teacher_id?.name || "Faculty",
          };
          break;
        }
      }
    }
  }

  // 7. Recent Timetables (Slim table: Published and Draft first, Archived at end)
  const allDeptTimetables = await Timetable.find({
    college_id: collegeId,
    department_id: departmentId,
  })
    .select("name semester academicYear status updatedAt createdAt")
    .sort({ updatedAt: -1, createdAt: -1 });

  const statusPriority = { PUBLISHED: 1, DRAFT: 2, ARCHIVED: 3 };
  const sortedTimetables = [...allDeptTimetables].sort((a, b) => {
    const prioA = statusPriority[a.status] || 99;
    const prioB = statusPriority[b.status] || 99;
    if (prioA !== prioB) return prioA - prioB;
    const dateA = new Date(a.updatedAt || a.createdAt);
    const dateB = new Date(b.updatedAt || b.createdAt);
    return dateB - dateA;
  });

  const recentTimetables = sortedTimetables.slice(0, 5).map((t) => ({
    _id: t._id,
    name: t.name,
    semester: t.semester,
    academicYear: t.academicYear,
    status: t.status,
    updatedAt: t.updatedAt || t.createdAt,
    createdAt: t.createdAt,
  }));

  // 8. Recent Activity (using shared authoritative hodActivityService)
  const recentActivity = await hodActivityService.getHodRecentActivity({
    collegeId,
    departmentId,
    limit: 6,
  });

  // 9. Determine CURRENT Academic Year for header (from records marked current or by today's date against start/end dates)
  const collegeDoc = await College.findById(collegeId).select("currentAcademicYear academicYears");
  let currentAcademicYear = null;
  if (collegeDoc?.currentAcademicYear) {
    currentAcademicYear = collegeDoc.currentAcademicYear;
  } else if (Array.isArray(collegeDoc?.academicYears)) {
    const currentAyDoc = collegeDoc.academicYears.find(
      (ay) =>
        ay.isCurrent ||
        ay.status === "ACTIVE" ||
        (ay.startDate &&
          ay.endDate &&
          now >= new Date(ay.startDate) &&
          now <= new Date(ay.endDate))
    );
    if (currentAyDoc?.year || currentAyDoc?.name) {
      currentAcademicYear = currentAyDoc.year || currentAyDoc.name;
    }
  }

  // Fallback: derive current academic year by today's date against standard Indian college boundaries (June 1 - May 31)
  if (!currentAcademicYear) {
    const currentYearNum = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 9 = Oct
    const startAY = currentMonth >= 5 ? currentYearNum : currentYearNum - 1;
    currentAcademicYear = `${startAY}-${startAY + 1}`;
  }

  return {
    department: {
      id: department._id,
      name: department.name,
      code: department.code,
    },
    hod: hodDetails,
    stats: {
      teachers: teachersCount,
      timetables: totalTimetables,
      students: studentsCount,
      subjects: subjectsCount,
      programs: coursesCount,
      timetablesBreakdown: {
        total: totalTimetables,
        published: publishedCount,
        draft: draftCount,
        archived: archivedCount,
      },
      publishedTimetables: publishedCount,
      draftTimetables: draftCount,
      archivedTimetables: archivedCount,
      attendanceToday: attendanceTodayRate,
      todayClosedSessionsCount: todayClosedCount,
      lastSession: lastSessionInfo,
    },
    actionRequired: {
      pendingExceptions,
      draftTimetables: pendingDraftTimetables,
      lowAttendanceStudents: lowAttendanceStudentsCount,
      unmarkedSessions: unmarkedSessionsCount,
      total: totalActionsRequired,
    },
    todaySchedule,
    nextLecture,
    recentTimetables,
    recentActivity,
    academicYear: currentAcademicYear,
  };
};
