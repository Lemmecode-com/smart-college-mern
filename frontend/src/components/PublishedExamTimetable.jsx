import { useMemo } from "react";
import {
  FaBook,
  FaCalendarAlt,
  FaClock,
  FaDoorOpen,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatSession = (session) => {
  if (!session) return "N/A";
  return session === "FORENOON" ? "Forenoon" : session === "AFTERNOON" ? "Afternoon" : session;
};

const subjectTypeColor = (type) => {
  switch (type) {
    case "THEORY":
      return { bg: "#e3f2fd", text: "#1565c0", border: "#90caf9" };
    case "PRACTICAL":
      return { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" };
    case "COMPOSITE":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" };
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  }
};

export default function PublishedExamTimetable({ exams, onExamClick }) {
  const examList = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams;
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
          Published exam timetables will appear here once the Exam Coordinator publishes them.
        </p>
      </div>
    );
  }

  return (
    <div className="published-exam-timetable">
      {examList.map((exam) => {
        const subjects = Array.isArray(exam.subjects) ? exam.subjects : [];
        const courseName = exam.course_id?.name || "N/A";
        const courseCode = exam.course_id?.code || "N/A";

        return (
          <div key={exam._id} className="published-exam-card">
            <div className="published-exam-card-header">
              <div className="published-exam-card-header-left">
                <div className="published-exam-card-header-icon">
                  <FaCalendarAlt />
                </div>
                <div>
                  <h4 className="published-exam-card-title">{exam.name || "Exam"}</h4>
                  <p className="published-exam-card-subtitle">
                    {courseName} ({courseCode}) • Semester {exam.semester ?? "N/A"} • {exam.academicYear || "N/A"}
                  </p>
                </div>
              </div>
              {onExamClick && (
                <button
                  type="button"
                  className="published-exam-card-action"
                  onClick={() => onExamClick(exam)}
                >
                  View Timetable
                </button>
              )}
            </div>

            <div className="published-exam-card-body">
              {subjects.length === 0 ? (
                <div className="published-exam-empty">
                  <p>No subjects scheduled for this exam.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="published-exam-table-wrap">
                    <table className="published-exam-table">
                      <thead>
                        <tr>
                          <th scope="col">Subject</th>
                          <th scope="col">Code</th>
                          <th scope="col">Type</th>
                          <th scope="col">Exam Date</th>
                          <th scope="col">Start Time</th>
                          <th scope="col">End Time</th>
                          <th scope="col">Session</th>
                          <th scope="col">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((entry) => {
                          const sub = entry?.subject || {};
                          const type = entry?.subjectType || sub?.subjectType || "THEORY";
                          const colors = subjectTypeColor(type);

                          return (
                            <tr key={entry._id || sub._id}>
                              <td>
                                <span className="published-exam-subject-name">
                                  {sub.name || "N/A"}
                                </span>
                              </td>
                              <td>
                                <span className="published-exam-subject-code">
                                  {sub.code || "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className="published-exam-type-pill"
                                  style={{
                                    background: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                  }}
                                >
                                  {type}
                                </span>
                              </td>
                              <td>{entry.examDate ? toDateInputValue(entry.examDate) : "N/A"}</td>
                              <td>{entry.startTime ? formatTime12Hour(entry.startTime) : "N/A"}</td>
                              <td>{entry.endTime ? formatTime12Hour(entry.endTime) : "N/A"}</td>
                              <td>{formatSession(entry.session)}</td>
                              <td>{entry.room || "N/A"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="published-exam-mobile-list">
                    {subjects.map((entry) => {
                      const sub = entry?.subject || {};
                      const type = entry?.subjectType || sub?.subjectType || "THEORY";
                      const colors = subjectTypeColor(type);

                      return (
                        <div key={entry._id || sub._id} className="published-exam-mobile-card">
                          <div className="published-exam-mobile-card-header">
                            <span className="published-exam-subject-name">{sub.name || "N/A"}</span>
                            <span
                              className="published-exam-type-pill"
                              style={{
                                background: colors.bg,
                                color: colors.text,
                                border: `1px solid ${colors.border}`,
                              }}
                            >
                              {type}
                            </span>
                          </div>
                          <div className="published-exam-mobile-card-body">
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">Code</span>
                              <span className="published-exam-subject-code">{sub.code || "—"}</span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">Date</span>
                              <span>{entry.examDate ? toDateInputValue(entry.examDate) : "N/A"}</span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">Time</span>
                              <span>
                                {entry.startTime && entry.endTime
                                  ? `${formatTime12Hour(entry.startTime)} - ${formatTime12Hour(entry.endTime)}`
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">Session</span>
                              <span>{formatSession(entry.session)}</span>
                            </div>
                            <div className="published-exam-mobile-row">
                              <span className="published-exam-mobile-label">Room</span>
                              <span>{entry.room || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
