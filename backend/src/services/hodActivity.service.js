const Timetable = require("../models/timetable.model");
const TimetableException = require("../models/timetableException.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AuditLog = require("../models/auditLog.model");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Human-readable relative time string
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
 * Clean up timetable display name (e.g. "MSC IT - Sem 4 (2027-2028) - Div A" -> "MSC IT Sem 4")
 */
const formatTimetableDisplayName = (rawName) => {
  if (!rawName) return "Department Timetable";
  const cleaned = rawName
    .replace(/\s*-\s*Div\s+[A-Za-z0-9]+/i, "")
    .replace(/\s*\(\d{4}-\d{4}\)/g, "")
    .replace(/\s*-\s*/g, " ")
    .trim();
  return cleaned || rawName;
};

/**
 * Convert Date to IST Calendar Date Key (YYYY-MM-DD)
 */
const getIstDayKey = (date) => {
  if (!date) return "";
  const d = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
};

/**
 * Shared authoritative service for HOD-relevant Recent Activity events.
 * Used by both /hod/dashboard and /hod/reports to ensure identical activity feeds.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.collegeId
 * @param {string|ObjectId} params.departmentId
 * @param {number} [params.limit=6]
 * @returns {Promise<Array>}
 */
exports.getHodRecentActivity = async ({ collegeId, departmentId, limit = 6 }) => {
  const activityEvents = [];

  // 1. Department attendance sessions closed
  const recentClosedSessions = await AttendanceSession.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
  })
    .populate("teacher_id", "name")
    .populate("subject_id", "name code")
    .populate("course_id", "name code")
    .sort({ lectureDate: -1, updatedAt: -1 })
    .limit(20);

  // Group attendance sessions by IST calendar day
  const sessionsByDay = new Map();
  for (const cs of recentClosedSessions) {
    const eventDate = cs.updatedAt || cs.lectureDate;
    const dayKey = getIstDayKey(eventDate);
    const teacherName =
      cs.teacher_id?.name || cs.slotSnapshot?.teacher_name || "Faculty";
    const subjectName =
      cs.subject_id?.name || cs.slotSnapshot?.subject_name || "Lecture";
    const courseName =
      cs.course_id?.name || cs.slotSnapshot?.course_name || "";

    if (!sessionsByDay.has(dayKey)) {
      sessionsByDay.set(dayKey, {
        dayKey,
        eventDate,
        items: [],
      });
    }

    sessionsByDay.get(dayKey).items.push({
      id: cs._id.toString(),
      subjectName,
      teacherName,
      courseName,
      eventDate,
    });
  }

  for (const [dayKey, group] of sessionsByDay.entries()) {
    const timeAgo = getTimeAgo(group.eventDate);

    if (group.items.length > 1) {
      // Grouped attendance sessions
      const readableText = `${group.items.length} sessions closed · ${timeAgo}`;
      activityEvents.push({
        id: `grouped-sessions-${dayKey}`,
        type: "ATTENDANCE_SESSION_CLOSED_GROUP",
        title: `${group.items.length} sessions closed`,
        whoDidIt: group.items.map((i) => i.teacherName).filter(Boolean)[0] || "Faculty",
        subjectName: group.items.map((i) => i.subjectName).join(", "),
        subjectOrDetails: `${group.items.length} sessions closed`,
        description: readableText,
        readableText,
        timeAgo,
        timestamp: group.eventDate,
        status: "Closed",
        isGrouped: true,
        count: group.items.length,
        subItems: group.items.map(
          (it) => `${it.subjectName} · ${it.teacherName}`
        ),
        detailsList: group.items.map((it) => ({
          subject: it.subjectName,
          teacher: it.teacherName,
          class: it.courseName,
        })),
      });
    } else if (group.items.length === 1) {
      // Single attendance session with subject and teacher
      const it = group.items[0];
      const readableText = `Attendance closed · ${it.subjectName} · ${it.teacherName} · ${timeAgo}`;
      activityEvents.push({
        id: it.id,
        type: "ATTENDANCE_SESSION_CLOSED",
        title: "Attendance closed",
        whoDidIt: it.teacherName,
        subjectName: it.subjectName,
        subjectOrDetails: it.subjectName,
        courseName: it.courseName,
        description: readableText,
        readableText,
        timeAgo,
        timestamp: it.eventDate,
        status: "Closed",
        isGrouped: false,
      });
    }
  }

  // 2. Department timetables map for reference
  const deptTimetables = await Timetable.find({
    college_id: collegeId,
    department_id: departmentId,
  })
    .select("_id name status updatedAt createdAt department_id")
    .sort({ updatedAt: -1 })
    .limit(20);

  const deptTimetableMap = new Map(
    deptTimetables.map((t) => [t._id.toString(), t])
  );
  const deptTimetableIds = Array.from(deptTimetableMap.keys());

  // 3. Query AuditLog for HOD-relevant actions
  const hodAuditActions = [
    "TIMETABLE_PUBLISHED",
    "TIMETABLE_ARCHIVED",
    "TIMETABLE_EXCEPTION_APPROVED",
    "TIMETABLE_EXCEPTION_REJECTED",
    "NOTICE_SENT",
  ];

  const auditLogs = await AuditLog.find({
    collegeId,
    action: { $in: hodAuditActions },
  })
    .sort({ createdAt: -1 })
    .limit(30);

  // Map external timetable IDs if present
  const unmappedTtIds = auditLogs
    .filter(
      (l) =>
        l.resourceId &&
        !deptTimetableMap.has(l.resourceId.toString()) &&
        (l.action.includes("TIMETABLE") || l.resourceType === "Timetable")
    )
    .map((l) => l.resourceId);

  if (unmappedTtIds.length > 0) {
    const externalTts = await Timetable.find({ _id: { $in: unmappedTtIds } });
    for (const t of externalTts) {
      deptTimetableMap.set(t._id.toString(), t);
    }
  }

  const publishedTtEvents = [];
  const archivedTtEvents = [];
  const processedTimetableIds = new Set();

  for (const log of auditLogs) {
    const rawDetails = log.details || {};
    const targetId =
      log.resourceId?.toString() ||
      log.targetId?.toString() ||
      rawDetails.timetableId?.toString() ||
      rawDetails.targetId?.toString() ||
      "";

    const tt = targetId ? deptTimetableMap.get(targetId) : null;

    // Must belong to this department
    if (tt && tt.department_id && tt.department_id.toString() !== departmentId.toString()) {
      continue;
    }
    if (
      !tt &&
      rawDetails.departmentId &&
      rawDetails.departmentId.toString() !== departmentId.toString()
    ) {
      continue;
    }

    if (log.action === "TIMETABLE_PUBLISHED") {
      let ttName = tt ? formatTimetableDisplayName(tt.name) : null;
      if (!ttName && typeof rawDetails === "string") {
        ttName = formatTimetableDisplayName(rawDetails);
      } else if (!ttName && rawDetails.name) {
        ttName = formatTimetableDisplayName(rawDetails.name);
      }

      const actor = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "HOD");
      if (targetId) processedTimetableIds.add(targetId);

      publishedTtEvents.push({
        id: log._id.toString(),
        timetableId: targetId,
        name: ttName,
        isActive: tt?.status === "PUBLISHED",
        eventDate: log.createdAt,
        actor,
      });
    } else if (log.action === "TIMETABLE_ARCHIVED") {
      let ttName = tt ? formatTimetableDisplayName(tt.name) : null;
      if (!ttName && typeof rawDetails === "string") {
        ttName = formatTimetableDisplayName(rawDetails);
      } else if (!ttName && rawDetails.name) {
        ttName = formatTimetableDisplayName(rawDetails.name);
      }

      const actor = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "HOD");
      archivedTtEvents.push({
        id: log._id.toString(),
        timetableId: targetId,
        name: ttName,
        eventDate: log.createdAt,
        actor,
      });
    } else if (
      log.action === "TIMETABLE_EXCEPTION_APPROVED" ||
      log.action === "TIMETABLE_EXCEPTION_REJECTED"
    ) {
      const isApproved = log.action === "TIMETABLE_EXCEPTION_APPROVED";
      const actionName = isApproved
        ? "Timetable exception approved"
        : "Timetable exception rejected";
      const actor = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "HOD");
      const eventDate = log.createdAt;
      const timeAgo = getTimeAgo(eventDate);
      const readableText = `${actionName} · ${actor} · ${timeAgo}`;
      activityEvents.push({
        id: log._id.toString(),
        type: log.action,
        title: actionName,
        whoDidIt: actor,
        subjectName: typeof rawDetails === "string" ? rawDetails : rawDetails.name || "Timetable exception",
        subjectOrDetails: typeof rawDetails === "string" ? rawDetails : rawDetails.name || "Timetable exception",
        description: readableText,
        readableText,
        timeAgo,
        timestamp: eventDate,
        status: isApproved ? "Approved" : "Rejected",
        isGrouped: false,
      });
    } else if (log.action === "NOTICE_SENT") {
      const actor = log.userName || (log.userEmail ? log.userEmail.split("@")[0] : "HOD");
      const eventDate = log.createdAt;
      const timeAgo = getTimeAgo(eventDate);
      const readableText = `Attendance notice sent · ${actor} · ${timeAgo}`;
      activityEvents.push({
        id: log._id.toString(),
        type: "NOTICE_SENT",
        title: "Attendance notice sent",
        whoDidIt: actor,
        subjectName: typeof rawDetails === "string" ? rawDetails : "Department notice",
        subjectOrDetails: typeof rawDetails === "string" ? rawDetails : "Department notice",
        description: readableText,
        readableText,
        timeAgo,
        timestamp: eventDate,
        status: "Notice",
        isGrouped: false,
      });
    }
  }

  // Also include department published timetables if not captured in audit log
  for (const tt of deptTimetables) {
    if (tt.status === "PUBLISHED" && !processedTimetableIds.has(tt._id.toString())) {
      publishedTtEvents.push({
        id: tt._id.toString(),
        timetableId: tt._id.toString(),
        name: formatTimetableDisplayName(tt.name),
        isActive: true,
        eventDate: tt.updatedAt || tt.createdAt,
        actor: "HOD",
      });
    }
  }

  // Group published timetable events by IST day
  const publishedByDay = new Map();
  for (const item of publishedTtEvents) {
    const dayKey = getIstDayKey(item.eventDate);
    if (!publishedByDay.has(dayKey)) {
      publishedByDay.set(dayKey, {
        dayKey,
        eventDate: item.eventDate,
        actor: item.actor || "HOD",
        items: [],
      });
    }
    publishedByDay.get(dayKey).items.push(item);
  }

  for (const [dayKey, group] of publishedByDay.entries()) {
    const timeAgo = getTimeAgo(group.eventDate);
    if (group.items.length > 1) {
      const activeCount = group.items.filter((it) => it.isActive).length;
      const activeHint = activeCount > 0 ? ` (${activeCount} currently active)` : "";
      const readableText = `${group.items.length} timetables published${activeHint} · ${group.actor} · ${timeAgo}`;
      activityEvents.push({
        id: `grouped-published-${dayKey}`,
        type: "TIMETABLE_PUBLISHED_GROUP",
        title: `${group.items.length} timetables published`,
        whoDidIt: group.actor,
        subjectName: group.items.map((t) => t.name || "Timetable").join(", "),
        subjectOrDetails: `${group.items.length} timetables published`,
        description: readableText,
        readableText,
        timeAgo,
        timestamp: group.eventDate,
        status: "Published",
        isGrouped: true,
        count: group.items.length,
        subItems: group.items.map((t) => t.name || "Department Timetable"),
      });
    } else if (group.items.length === 1) {
      const item = group.items[0];
      const namePart = item.name ? ` · ${item.name}` : "";
      const readableText = `Timetable published${namePart} · ${item.actor} · ${timeAgo}`;
      activityEvents.push({
        id: item.id || `published-${dayKey}`,
        type: "TIMETABLE_PUBLISHED",
        title: "Timetable published",
        whoDidIt: item.actor,
        subjectName: item.name || "Department Timetable",
        subjectOrDetails: item.name || "Department Timetable",
        description: readableText,
        readableText,
        timeAgo,
        timestamp: group.eventDate,
        status: "Published",
        isGrouped: false,
      });
    }
  }

  // Group archived timetable events by IST day
  const archivedByDay = new Map();
  for (const item of archivedTtEvents) {
    const dayKey = getIstDayKey(item.eventDate);
    if (!archivedByDay.has(dayKey)) {
      archivedByDay.set(dayKey, {
        dayKey,
        eventDate: item.eventDate,
        actor: item.actor || "HOD",
        items: [],
      });
    }
    archivedByDay.get(dayKey).items.push(item);
  }

  for (const [dayKey, group] of archivedByDay.entries()) {
    const timeAgo = getTimeAgo(group.eventDate);
    if (group.items.length > 1) {
      const readableText = `${group.items.length} timetables archived · ${group.actor} · ${timeAgo}`;
      activityEvents.push({
        id: `grouped-archived-${dayKey}`,
        type: "TIMETABLE_ARCHIVED_GROUP",
        title: `${group.items.length} timetables archived`,
        whoDidIt: group.actor,
        subjectName: group.items.map((t) => t.name || "Timetable").join(", "),
        subjectOrDetails: `${group.items.length} timetables archived`,
        description: readableText,
        readableText,
        timeAgo,
        timestamp: group.eventDate,
        status: "Archived",
        isGrouped: true,
        count: group.items.length,
        subItems: group.items.map((t) => t.name || "Department Timetable"),
      });
    } else if (group.items.length === 1) {
      const item = group.items[0];
      const namePart = item.name ? ` · ${item.name}` : "";
      const readableText = `Timetable archived${namePart} · ${item.actor} · ${timeAgo}`;
      activityEvents.push({
        id: item.id || `archived-${dayKey}`,
        type: "TIMETABLE_ARCHIVED",
        title: "Timetable archived",
        whoDidIt: item.actor,
        subjectName: item.name || "Department Timetable",
        subjectOrDetails: item.name || "Department Timetable",
        description: readableText,
        readableText,
        timeAgo,
        timestamp: group.eventDate,
        status: "Archived",
        isGrouped: false,
      });
    }
  }

  // 4. Timetable exceptions approved / rejected directly from TimetableException model
  if (deptTimetableIds.length > 0) {
    const recentExceptions = await TimetableException.find({
      timetable_id: { $in: deptTimetableIds },
      status: { $in: ["APPROVED", "REJECTED"] },
    })
      .sort({ updatedAt: -1 })
      .limit(4);

    for (const ex of recentExceptions) {
      const isApproved = ex.status === "APPROVED";
      const actionName = isApproved
        ? "Timetable exception approved"
        : "Timetable exception rejected";
      const eventDate = ex.updatedAt || ex.createdAt;
      const timeAgo = getTimeAgo(eventDate);
      const readableText = `${actionName} · HOD · ${timeAgo}`;
      activityEvents.push({
        id: ex._id.toString(),
        type: isApproved ? "EXCEPTION_APPROVED" : "EXCEPTION_REJECTED",
        title: actionName,
        whoDidIt: "HOD",
        subjectName: ex.reason || "Lecture adjustment",
        subjectOrDetails: ex.reason || "Lecture adjustment",
        description: readableText,
        readableText,
        timeAgo,
        timestamp: eventDate,
        status: isApproved ? "Approved" : "Rejected",
        isGrouped: false,
      });
    }
  }

  // Deduplicate by ID and sort activity events by timestamp descending
  const seenIds = new Set();
  const dedupedEvents = [];
  for (const ev of activityEvents) {
    if (!seenIds.has(ev.id)) {
      seenIds.add(ev.id);
      dedupedEvents.push(ev);
    }
  }

  dedupedEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return dedupedEvents.slice(0, limit);
};

exports.formatTimetableDisplayName = formatTimetableDisplayName;
exports.getTimeAgo = getTimeAgo;
exports.getIstDayKey = getIstDayKey;
