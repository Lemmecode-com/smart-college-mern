import { useMemo } from "react";
import { FaBook, FaCalendarAlt, FaEye } from "react-icons/fa";
import "./PublishedExamTimetable.css";

/* =========================================================
   Formatting helpers
   ========================================================= */

const formatDate = (value) => {
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

const formatTime12Hour = (time24) => {
  if (!time24) return "N/A";
  const [hours, minutes] = time24.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "N/A";
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const formatSession = (session) => {
  if (!session) return "N/A";
  if (session === "FORENOON") return "Forenoon";
  if (session === "AFTERNOON") return "Afternoon";
  return session;
};

/* =========================================================
   Data normalization

   The published timetable is consumed from two different API
   responses that produce two different shapes:

   1. GET /exam/published  →  array of flat Exam docs.
      Each exam's `subjects` are subject snapshots (no schedule
      timing — those live in ExamSchedule).

   2. GET /exam-schedule/published/:examId  →  { exam, schedule }
      wrapper.  `schedule.subjects` hold the actual timetable
      entries (examDate, startTime, endTime, session, room).

   This helper unifies both into a single flat exam object whose
   `subjects` always carries schedule timing when available.
   ========================================================= */

const normalizeExamItem = (item) => {
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

  // Flat Exam doc (list view) — already in the right shape.
  return item;
};

/**
 * Extract subject name / code from a schedule entry whose `subject`
   field may be a populated object or a plain string id.
   Handles the flat shape produced by loadPublishedSchedule too.
 */
const getSubjectInfo = (entry) => {
  if (!entry) return { name: "N/A", code: "" };

  // Flat shape (loadPublishedSchedule remaps)
  if (entry.subjectName || entry.subjectCode) {
    return {
      name: entry.subjectName || "N/A",
      code: entry.subjectCode || "",
    };
  }

  // Populated subject object (loadPublishedScheduleForVisibility)
  const sub = entry.subject;
  if (sub && typeof sub === "object") {
    return {
      name: sub.name || "N/A",
      code: sub.code || "",
    };
  }

  return { name: "N/A", code: "" };
};

/** Returns true when at least one subject entry carries schedule timing. */
const hasScheduleData = (subjects) =>
  Array.isArray(subjects) &&
  subjects.some(
    (s) =>
      s &&
      (s.examDate || s.startTime || s.endTime || s.session || s.room),
  );

export default function PublishedExamTimetable({ exams, onExamClick }) {
  const examList = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams
      .map(normalizeExamItem)
      .filter((item) => item != null);
  }, [exams]);

  if (!examList.length) {
    return (
      <div className="published-exam-timetable-empty">
        <div className="published-exam-timetable-empty-icon">
          <FaBook />
        </div>
        <h5 className="published-exam-timetable-empty-title">
          No published exam timetable available
        </h5>
        <p className="published-exam-timetable-empty-text">
          Published exam timetables will appear here once the Exam
          Coordinator publishes them.
        </p>
      </div>
    );
  }

  return (
    <div className="published-exam-timetable">
      {examList.map((exam) => {
        const subjects = Array.isArray(exam.subjects) ? exam.subjects : [];
        const showSchedule = hasScheduleData(subjects);
        const courseName = exam.course_id?.name || "—";
        const courseCode = exam.course_id?.code || "";
        const examName = exam.name || "Exam";
        const isPublished = exam.status === "PUBLISHED";

        return (
          <div key={exam._id} className="published-exam-card">
            {/* ── Card header ── */}
            <div className="published-exam-card-header">
              <div className="published-exam-card-header-left">
                <div className="published-exam-card-header-icon">
                  <FaCalendarAlt />
                </div>
                <div>
                  <h4 className="published-exam-card-title">{examName}</h4>
                  <p className="published-exam-card-subtitle">
                    {courseName}
                    {courseCode ? ` (${courseCode})` : ""} · Semester{" "}
                    {exam.semester ?? "—"}
                    {exam.academicYear ? ` · ${exam.academicYear}` : ""}
                  </p>
                </div>
              </div>

              <div className="published-exam-card-meta">
                <span
                  className={`published-exam-status-badge ${
                    isPublished ? "is-published" : "is-draft"
                  }`}
                >
                  <span className="published-exam-status-dot" />
                  {isPublished ? "Published" : exam.status || "Draft"}
                </span>
                {onExamClick && (
                  <button
                    type="button"
                    className="published-exam-view-btn"
                    onClick={() => onExamClick(exam)}
                  >
                    <FaEye />
                    View Timetable
                  </button>
                )}
              </div>
            </div>

            {/* ── Card body ── */}
            <div className="published-exam-card-body">
              {subjects.length === 0 ? (
                <div className="published-exam-empty">
                  <p>No subjects scheduled for this exam.</p>
                </div>
              ) : showSchedule ? (
                <>
                  {/* Desktop table */}
                  <div className="published-exam-table-wrap">
                    <table className="published-exam-table">
                      <thead>
                        <tr>
                          <th scope="col">Subject</th>
                          <th scope="col">Code</th>
                          <th scope="col">Exam Date</th>
                          <th scope="col">Start Time</th>
                          <th scope="col">End Time</th>
                          <th scope="col">Session</th>
                          <th scope="col">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((entry, idx) => {
                          const { name, code } = getSubjectInfo(entry);
                          return (
                            <tr
                              key={entry._id || `${exam._id}-${idx}`}
                            >
                              <td>{name}</td>
                              <td>{code || "—"}</td>
                              <td>{formatDate(entry.examDate)}</td>
                              <td>{formatTime12Hour(entry.startTime)}</td>
                              <td>{formatTime12Hour(entry.endTime)}</td>
                              <td>{formatSession(entry.session)}</td>
                              <td>{entry.room || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="published-exam-mobile-list">
                    {subjects.map((entry, idx) => {
                      const { name, code } = getSubjectInfo(entry);
                      return (
                        <div
                          key={entry._id || `${exam._id}-${idx}`}
                          className="published-exam-mobile-card"
                        >
                          <div className="published-exam-mobile-card-header">
                            <span className="published-exam-subject-name">
                              {name}
                            </span>
                            <span className="published-exam-subject-code">
                              {code || "—"}
                            </span>
                          </div>
                          <div className="published-exam-mobile-card-body">
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">
                                Date
                              </span>
                              <span>{formatDate(entry.examDate)}</span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">
                                Time
                              </span>
                              <span>
                                {entry.startTime && entry.endTime
                                  ? `${formatTime12Hour(entry.startTime)} - ${formatTime12Hour(entry.endTime)}`
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">
                                Session
                              </span>
                              <span>{formatSession(entry.session)}</span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">
                                Room
                              </span>
                              <span>{entry.room || "—"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* List view — subjects without schedule timing */
                <div className="published-exam-subject-summary">
                  <h6 className="published-exam-subject-summary-title">
                    {subjects.length}{" "}
                    {subjects.length === 1 ? "Subject" : "Subjects"}
                  </h6>
                  <div className="published-exam-subject-tag-list">
                    {subjects.map((entry, idx) => {
                      const { name, code } = getSubjectInfo(entry);
                      return (
                        <span
                          key={entry._id || `${exam._id}-${idx}`}
                          className="published-exam-subject-tag"
                          title={name}
                        >
                          {name}
                          {code ? ` (${code})` : ""}
                        </span>
                      );
                    })}
                  </div>
                  {onExamClick && (
                    <p className="published-exam-subject-hint">
                      Click "View Timetable" to see the full schedule.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
