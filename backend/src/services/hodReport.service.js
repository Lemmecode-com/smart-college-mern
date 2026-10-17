const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Timetable = require("../models/timetable.model");
const TimetableException = require("../models/timetableException.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AuditLog = require("../models/auditLog.model");
const StudentMarks = require("../models/studentMarks.model");
const teacherService = require("./teacher.service");
const hodActivityService = require("./hodActivity.service");
const { PASS_MARK_PERCENT } = require("../utils/constants");

/**
 * Get comprehensive, real-data HOD Department Reports Overview
 * Supports dynamic filtering by academicYear, semester, courseId, dateRange
 */
exports.getHodReportsOverview = async (userId, collegeId, queryFilters = {}) => {
  const teacher = await teacherService.getTeacherWithValidation(userId, collegeId);
  const { isHOD, department } = await teacherService.getHODStatus(teacher, collegeId);

  if (!isHOD || !department) {
    throw new Error("Access denied: Not a HOD");
  }

  const departmentId = teacher.department_id;

  // 1. Fetch department's real programs/courses
  const departmentCourses = await Course.find({
    college_id: collegeId,
    department_id: departmentId,
  }).select("_id name code durationSemesters status programLevel");

  const programs = departmentCourses.map((c) => {
    const totalSems = c.durationSemesters || (c.durationYears ? c.durationYears * 2 : 8);
    return {
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      durationSemesters: totalSems,
      semesters: Array.from({ length: totalSems }, (_, i) => i + 1),
      programLevel: c.programLevel || "UG",
    };
  });

  // 2. Fetch real academic years from students and sessions
  const studentYears = await Student.distinct("admissionYear", {
    college_id: collegeId,
    department_id: departmentId,
  });

  const currentYearNum = new Date().getFullYear();
  const yearSet = new Set(studentYears.filter(Boolean));
  yearSet.add(currentYearNum);
  yearSet.add(currentYearNum - 1);

  const academicYears = Array.from(yearSet)
    .sort((a, b) => b - a)
    .map((y) => `${y}-${y + 1}`);

  // 3. Build filter criteria
  const selectedCourseId = queryFilters.courseId && queryFilters.courseId !== "ALL"
    ? queryFilters.courseId
    : null;

  const selectedSemester = queryFilters.semester && queryFilters.semester !== "ALL"
    ? Number(queryFilters.semester)
    : null;

  let startDate = queryFilters.startDate ? new Date(queryFilters.startDate) : null;
  let endDate = queryFilters.endDate ? new Date(queryFilters.endDate) : null;

  if (queryFilters.dateRange && !startDate && !endDate) {
    const now = new Date();
    if (queryFilters.dateRange === "THIS_MONTH") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (queryFilters.dateRange === "LAST_30_DAYS") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    }
  }

  // 4. Counts: Teachers, Students, Subjects, Programs
  const totalTeachers = await Teacher.countDocuments({
    college_id: collegeId,
    department_id: departmentId,
  });

  const studentCountQuery = {
    college_id: collegeId,
    department_id: departmentId,
  };
  if (selectedCourseId) studentCountQuery.course_id = selectedCourseId;
  if (selectedSemester) studentCountQuery.currentSemester = selectedSemester;
  const totalStudents = await Student.countDocuments(studentCountQuery);

  const subjectCountQuery = {
    college_id: collegeId,
    department_id: departmentId,
  };
  if (selectedCourseId) subjectCountQuery.course_id = selectedCourseId;
  if (selectedSemester) subjectCountQuery.semester = selectedSemester;
  const totalSubjects = await Subject.countDocuments(subjectCountQuery);

  const totalCourses = departmentCourses.length;

  // 5. Timetables matching filter
  const timetableQuery = {
    college_id: collegeId,
    department_id: departmentId,
  };
  if (selectedCourseId) timetableQuery.course_id = selectedCourseId;

  const [publishedTimetables, draftTimetables, archivedTimetables] = await Promise.all([
    Timetable.countDocuments({ ...timetableQuery, status: "PUBLISHED" }),
    Timetable.countDocuments({ ...timetableQuery, status: "DRAFT" }),
    Timetable.countDocuments({ ...timetableQuery, status: "ARCHIVED" }),
  ]);

  // 6. Query CLOSED attendance sessions within filters
  const sessionQuery = {
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
  };

  if (selectedCourseId) {
    sessionQuery.course_id = selectedCourseId;
  }

  if (selectedSemester) {
    const semSubjects = await Subject.find({
      college_id: collegeId,
      department_id: departmentId,
      semester: selectedSemester,
    }).distinct("_id");
    sessionQuery.subject_id = { $in: semSubjects };
  }

  if (startDate || endDate) {
    sessionQuery.lectureDate = {};
    if (startDate) sessionQuery.lectureDate.$gte = startDate;
    if (endDate) sessionQuery.lectureDate.$lte = endDate;
  }

  const sessions = await AttendanceSession.find(sessionQuery)
    .populate("subject_id", "name code semester")
    .populate("teacher_id", "name employeeId specialization")
    .sort({ lectureDate: 1 });

  const sessionsHeld = sessions.length;
  const totalPresent = sessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);
  const totalAbsent = sessions.reduce((sum, s) => sum + (s.absentCount || 0), 0);
  const totalRecords = totalPresent + totalAbsent;
  const averageAttendancePercentage =
    totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  // 7. Subject-wise attendance calculation (MUST sum to sessionsHeld)
  const subjectMap = new Map();
  for (const s of sessions) {
    const subId = (s.subject_id?._id || s.slotSnapshot?.subject_id || "unassigned").toString();
    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        id: subId,
        code: s.subject_id?.code || s.slotSnapshot?.subject_code || "SUB",
        name: s.subject_id?.name || s.slotSnapshot?.subject_name || "Unknown Subject",
        teacher: s.teacher_id?.name || s.slotSnapshot?.teacher_name || "Unassigned",
        semester: s.subject_id?.semester || "N/A",
        sessions: 0,
        present: 0,
        absent: 0,
      });
    }
    const item = subjectMap.get(subId);
    item.sessions += 1;
    item.present += s.presentCount || 0;
    item.absent += s.absentCount || 0;
  }

  const subjectWise = Array.from(subjectMap.values()).map((sub) => {
    const subTotal = sub.present + sub.absent;
    const avg = subTotal > 0 ? Math.round((sub.present / subTotal) * 100) : 0;
    return {
      id: sub.id,
      code: sub.code,
      name: sub.name,
      teacher: sub.teacher,
      semester: sub.semester,
      sessions: sub.sessions,
      avg,
      status: avg >= 75 ? "Optimal" : avg >= 60 ? "Moderate" : "Critical",
    };
  });

  // Default sort by lowest avg % first so problem subjects appear on top
  subjectWise.sort((a, b) => a.avg - b.avg || b.sessions - a.sessions);

  // 8. Faculty workload & attendance timeliness (MUST sum to sessionsHeld)
  const allDeptTeachers = await Teacher.find({
    college_id: collegeId,
    department_id: departmentId,
  }).select("_id name employeeId specialization designation");

  const facultyMap = new Map();
  for (const t of allDeptTeachers) {
    facultyMap.set(t._id.toString(), {
      id: t._id.toString(),
      name: t.name,
      empId: t.employeeId,
      designation: t.designation || "Faculty",
      specialization: t.specialization || "Not set",
      sessions: 0,
      onTimeSessions: 0,
    });
  }

  // Timeliness Rule: Session marked and submitted within 24 hours of scheduled lecture date/time without auto-close
  const isSessionOnTime = (s) => {
    if (s.autoClosed) return false;
    const lectureDate = new Date(s.lectureDate);
    const closedAt = new Date(s.updatedAt || s.lectureDate);
    const diffHours = (closedAt.getTime() - lectureDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  for (const s of sessions) {
    const tId = (s.teacher_id?._id || s.slotSnapshot?.teacher_id || "").toString();
    const onTime = isSessionOnTime(s);

    if (tId && facultyMap.has(tId)) {
      const f = facultyMap.get(tId);
      f.sessions += 1;
      if (onTime) {
        f.onTimeSessions += 1;
      }
    } else if (tId) {
      facultyMap.set(tId, {
        id: tId,
        name: s.teacher_id?.name || s.slotSnapshot?.teacher_name || "Faculty",
        empId: s.teacher_id?.employeeId || "EMP",
        designation: "Faculty",
        specialization: s.teacher_id?.specialization || "Not set",
        sessions: 1,
        onTimeSessions: onTime ? 1 : 0,
      });
    }
  }

  const facultyWorkload = Array.from(facultyMap.values()).map((f) => {
    let timelinessPercentage = null;
    let compliance = "N/A";
    let complianceStatus = "No sessions";

    if (f.sessions > 0) {
      timelinessPercentage = Math.round((f.onTimeSessions / f.sessions) * 100);
      compliance = `${timelinessPercentage}% On-Time`;
      complianceStatus =
        timelinessPercentage >= 90
          ? "Compliant"
          : timelinessPercentage >= 75
          ? "Warning"
          : "Overdue";
    }

    return {
      id: f.id,
      name: f.name,
      empId: f.empId,
      designation: f.designation,
      specialization: f.specialization && f.specialization !== "Not set" ? f.specialization : null,
      sessions: f.sessions,
      timelySessions: f.onTimeSessions,
      timelinessPercentage,
      timelinessPercent: timelinessPercentage,
      compliance,
      complianceStatus,
      status: complianceStatus,
    };
  });

  // Sort by sessions conducted descending
  facultyWorkload.sort((a, b) => b.sessions - a.sessions);

  // 9. Weekly trend from the same sessions (IST Asia/Kolkata calendar week grouping)
  const weeklyMap = new Map();
  for (const s of sessions) {
    const { mondayKey, sundayKey, dateRangeLabel, fullDateRange } = getIstWeekBounds(s.lectureDate);

    if (!weeklyMap.has(mondayKey)) {
      weeklyMap.set(mondayKey, {
        dateKey: mondayKey,
        dateRange: fullDateRange,
        dateRangeLabel,
        startDate: mondayKey,
        endDate: sundayKey,
        sessions: 0,
        present: 0,
        absent: 0,
      });
    }

    const wk = weeklyMap.get(mondayKey);
    wk.sessions += 1;
    wk.present += s.presentCount || 0;
    wk.absent += s.absentCount || 0;
  }

  const sortedWeeks = Array.from(weeklyMap.values()).sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );

  const weeklyTrend = sortedWeeks.map((w) => {
    const wTotal = w.present + w.absent;
    const rate = wTotal > 0 ? Math.round((w.present / wTotal) * 100) : 0;
    return {
      week: w.dateRangeLabel, // Real date range for X-Axis, e.g. "5-11 Oct"
      dateRange: w.dateRange,
      startDate: w.startDate,
      endDate: w.endDate,
      sessions: w.sessions,
      present: w.present,
      absent: w.absent,
      rate,
      target: 75,
    };
  });

  // 10. Students Below 75% Watchlist (MUST be consistent with average)
  let lowAttendanceStudents = [];
  if (sessionsHeld > 0) {
    const sessionIds = sessions.map((s) => s._id);
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

    const lowStudentsRaw = studentAggregates.filter((st) => {
      if (st.total === 0) return false;
      const pct = (st.present / st.total) * 100;
      return pct < 75;
    });

    if (lowStudentsRaw.length > 0) {
      const studentIds = lowStudentsRaw.map((st) => st._id);
      const studentDocs = await Student.find({ _id: { $in: studentIds } }).select(
        "_id fullName enrollmentNumber currentSemester"
      );
      const docMap = new Map(studentDocs.map((doc) => [doc._id.toString(), doc]));

      lowAttendanceStudents = lowStudentsRaw.map((st) => {
        const doc = docMap.get(st._id.toString());
        const pct = Math.round((st.present / st.total) * 100);
        return {
          id: st._id.toString(),
          name: doc?.fullName || "Student",
          prn: doc?.enrollmentNumber || "N/A",
          sem: doc?.currentSemester ? `Sem ${doc.currentSemester}` : "N/A",
          attendance: pct,
          missed: st.total - st.present,
          status: pct < 60 ? "Critical" : "Warning",
        };
      });
    }
  }

  // 11. Action Required
  const pendingExceptions = await getPendingExceptionsCount(collegeId, departmentId);

  const unmarkedSessions = await AttendanceSession.countDocuments({
    college_id: collegeId,
    department_id: departmentId,
    status: "OPEN",
    lectureDate: { $lt: new Date() },
  });

  // 12. Academic Performance (Calculate only from real marks; if none exist, return null)
  let academicPerformance = null;
  const deptSubjectQuery = {
    college_id: collegeId,
    department_id: departmentId,
  };
  if (selectedCourseId) deptSubjectQuery.course_id = selectedCourseId;
  if (selectedSemester) deptSubjectQuery.semester = selectedSemester;

  const deptSubjects = await Subject.find(deptSubjectQuery).select(
    "_id name code passMarks internalPassMarks externalPassMarks internalMaxMarks externalMaxMarks"
  );

  if (deptSubjects.length > 0) {
    const deptSubjectIds = deptSubjects.map((s) => s._id);
    const subNameMap = new Map(deptSubjects.map((s) => [s._id.toString(), s.name]));
    const subConfigMap = new Map(deptSubjects.map((s) => [s._id.toString(), s]));

    const marksRecords = await StudentMarks.find({
      college_id: collegeId,
      subject_id: { $in: deptSubjectIds },
    });

    if (marksRecords.length > 0) {
      let passedCount = 0;
      let totalMarksEvaluated = marksRecords.length;
      let sumPercentages = 0;
      const subScoreMap = new Map();

      for (const m of marksRecords) {
        let score = 0;
        if (m.externalMarks !== null && m.externalMarks !== undefined) {
          score = (m.internalMarks || 0) + (m.externalMarks || 0); // Out of 100
        } else {
          score = m.internalMarks || 0; // Practical out of 100
        }

        sumPercentages += score;

        // Determine passing threshold from subject configuration or fall back to named constant
        const subDoc = subConfigMap.get(m.subject_id.toString());
        let passThreshold = PASS_MARK_PERCENT;
        if (subDoc?.passMarks) {
          passThreshold = subDoc.passMarks;
        } else if (subDoc?.internalPassMarks || subDoc?.externalPassMarks) {
          passThreshold = (subDoc.internalPassMarks || 0) + (subDoc.externalPassMarks || 0);
        }

        if (score >= passThreshold) {
          passedCount += 1;
        }

        const sId = m.subject_id.toString();
        const sName = subNameMap.get(sId) || "Subject";
        if (!subScoreMap.has(sName)) {
          subScoreMap.set(sName, { sum: 0, count: 0 });
        }
        const sEntry = subScoreMap.get(sName);
        sEntry.sum += score;
        sEntry.count += 1;
      }

      const passPercentage =
        totalMarksEvaluated > 0
          ? Math.round((passedCount / totalMarksEvaluated) * 100)
          : 0;

      const departmentAverage =
        totalMarksEvaluated > 0
          ? Math.round(sumPercentages / totalMarksEvaluated)
          : 0;

      let topSubject = "N/A";
      let topSubjectAvg = -1;
      for (const [sName, entry] of subScoreMap.entries()) {
        const sAvg = entry.sum / entry.count;
        if (sAvg > topSubjectAvg) {
          topSubjectAvg = sAvg;
          topSubject = sName;
        }
      }

      academicPerformance = {
        departmentAverage,
        passPercentage,
        topSubject,
        evaluatedRecords: totalMarksEvaluated,
        passMarkPercent: PASS_MARK_PERCENT,
        passCriteriaText: `Passing mark: ${PASS_MARK_PERCENT}% (minimum score to pass)`,
      };
    }
  }

  // 13. Recent Activity: authoritative shared service for HOD-relevant events
  const recentActivity = await hodActivityService.getHodRecentActivity({
    collegeId,
    departmentId,
    limit: 6,
  });

  return {
    department: {
      id: department._id,
      name: department.name,
      code: department.code,
      sanctionedFacultyCount: department.sanctionedFacultyCount,
      sanctionedStudentIntake: department.sanctionedStudentIntake,
    },
    filterOptions: {
      academicYears,
      programs,
    },
    kpis: {
      totalTeachers,
      totalStudents,
      totalSubjects,
      totalCourses,
      publishedTimetables,
      draftTimetables,
      archivedTimetables,
      totalTimetables: publishedTimetables + draftTimetables + archivedTimetables,
      pendingExceptions,
      attendanceSummary: {
        totalSessions: sessionsHeld,
        totalRecords,
        present: totalPresent,
        absent: totalAbsent,
        averageAttendancePercentage,
      },
    },
    attendanceTrend: weeklyTrend,
    weeklyTrend, // Provide both keys for robust compatibility
    subjectWise,
    facultyWorkload,
    lowAttendanceStudents,
    actionRequired: {
      pendingExceptions,
      draftTimetables,
      unmarkedSessions,
    },
    academicPerformance,
    recentActivity,
    meta: {
      departmentId,
      collegeId,
      generatedAt: new Date().toISOString(),
      appliedFilters: queryFilters,
    },
  };
};

const getPendingExceptionsCount = async (collegeId, departmentId) => {
  const timetableIds = await Timetable.find({
    college_id: collegeId,
    department_id: departmentId,
  }).select("_id");

  const ids = timetableIds.map((t) => t._id);

  if (ids.length === 0) return 0;

  return await TimetableException.countDocuments({
    timetable_id: { $in: ids },
    status: "PENDING",
    isActive: true,
  });
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Calculate Monday-Sunday week bounds in Indian Standard Time (IST, UTC+5:30)
 * Ensures sessions on Sunday 11 PM IST and Monday 2 AM IST fall into their respective weeks.
 *
 * @param {Date|string|number} dateInput
 * @returns {{ mondayKey: string, sundayKey: string, dateRangeLabel: string, fullDateRange: string }}
 */
function getIstWeekBounds(dateInput) {
  const d = new Date(dateInput);
  // Shift timestamp by +5:30 to get local IST calendar day/month/year via UTC getters
  const istTime = new Date(d.getTime() + IST_OFFSET_MS);
  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth();
  const date = istTime.getUTCDate();
  const day = istTime.getUTCDay(); // 0 is Sunday, 1 is Monday ...
  const diffDays = day === 0 ? -6 : 1 - day; // Monday as start of week

  // Monday
  const mondayUtc = new Date(Date.UTC(year, month, date + diffDays));
  // Sunday
  const sundayUtc = new Date(Date.UTC(year, month, date + diffDays + 6));

  const mondayKey = mondayUtc.toISOString().slice(0, 10);
  const sundayKey = sundayUtc.toISOString().slice(0, 10);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monMonth = monthNames[mondayUtc.getUTCMonth()];
  const sunMonth = monthNames[sundayUtc.getUTCMonth()];

  const dateRangeLabel = monMonth === sunMonth
    ? `${mondayUtc.getUTCDate()}-${sundayUtc.getUTCDate()} ${monMonth}`
    : `${mondayUtc.getUTCDate()} ${monMonth} - ${sundayUtc.getUTCDate()} ${sunMonth}`;

  const fullDateRange = `${monMonth} ${mondayUtc.getUTCDate()} – ${sunMonth} ${sundayUtc.getUTCDate()}`;

  return {
    mondayKey,
    sundayKey,
    dateRangeLabel,
    fullDateRange,
    weekKey: mondayKey,
    startIstStr: mondayKey,
    endIstStr: sundayKey,
    label: dateRangeLabel,
  };
}

/**
 * Format timetable name to a clean, readable display name
 * e.g. "MSC IT - Sem 4 (2027-2028) - Div A" -> "MSC IT Sem 4"
 *
 * @param {string} rawName
 * @returns {string|null}
 */
function formatTimetableDisplayName(rawName) {
  if (!rawName || typeof rawName !== "string") return null;
  const trimmed = rawName.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/\s*\(\d{4}-\d{4}\)/g, "") // remove (2027-2028)
    .replace(/\s*-\s*Div\s*[A-Za-z0-9]+/i, "") // remove - Div A
    .replace(/\s*-\s*/g, " ") // replace dashes with spaces
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || trimmed;
}

exports.getPendingExceptionsCount = getPendingExceptionsCount;
exports.getIstWeekBounds = getIstWeekBounds;
exports.formatTimetableDisplayName = formatTimetableDisplayName;

