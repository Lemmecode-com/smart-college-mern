import React, { useMemo, useState } from "react";
import {
  FaBook,
  FaCalendarAlt,
  FaEye,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaCalendarDay,
} from "react-icons/fa";
import {
  formatTime12Hour,
  calculateDuration,
  formatSession,
  getRelativeExamStatus,
  sortScheduleSubjects,
  filterScheduleSubjects,
  getScheduleSummaryMetrics,
  getExamDateRange,
  normalizeExamItem,
  getSubjectInfo,
  hasScheduleData,
  formatDateWithWeekday,
} from "../utils/examTimetable.util";
import "./PublishedExamTimetable.css";

/* =========================================================
   Subcomponents
   ========================================================= */

function RelativeStatusBadge({ statusInfo }) {
  if (!statusInfo || statusInfo.key === "UNSCHEDULED") {
    return (
      <span className="published-exam-relative-badge is-unscheduled">
        <FaClock aria-hidden="true" /> {statusInfo?.label || "Date not set"}
      </span>
    );
  }

  if (statusInfo.key === "COMPLETED") {
    return (
      <span className="published-exam-relative-badge is-completed">
        <FaCheckCircle aria-hidden="true" /> Completed
      </span>
    );
  }

  if (statusInfo.key === "TODAY") {
    return (
      <span className="published-exam-relative-badge is-today">
        <FaCalendarDay aria-hidden="true" /> Today
      </span>
    );
  }

  if (statusInfo.key === "TOMORROW") {
    return (
      <span className="published-exam-relative-badge is-tomorrow">
        <FaClock aria-hidden="true" /> Tomorrow
      </span>
    );
  }

  return (
    <span className="published-exam-relative-badge is-future">
      <FaClock aria-hidden="true" /> {statusInfo.label}
    </span>
  );
}

function SubjectCategoryBadge({ category, originalSemester }) {
  if (category === "BACKLOG") {
    return (
      <span className="published-exam-backlog-badge" title="Backlog Subject">
        BACKLOG{originalSemester ? ` · Sem ${originalSemester}` : ""}
      </span>
    );
  }

  return (
    <span className="published-exam-regular-badge" title="Regular Subject">
      REGULAR
    </span>
  );
}

function RoomDisplay({ room }) {
  const isAssigned = Boolean(room && room.trim());
  return (
    <span className={`published-exam-room ${isAssigned ? "is-assigned" : "is-unassigned"}`}>
      <FaMapMarkerAlt className="room-pin-icon" aria-hidden="true" />
      <span>{isAssigned ? room.trim() : "Room not assigned"}</span>
    </span>
  );
}

function ExamScheduleCard({ exam, onExamClick }) {
  const [activeFilter, setActiveFilter] = useState("ALL");

  const rawSubjects = useMemo(() => {
    return Array.isArray(exam.subjects) ? exam.subjects : [];
  }, [exam.subjects]);

  const showSchedule = hasScheduleData(rawSubjects);

  // Chronological sorting (primary: examDate asc, secondary: startTime asc)
  const sortedSubjects = useMemo(() => {
    return sortScheduleSubjects(rawSubjects);
  }, [rawSubjects]);

  const summaryMetrics = useMemo(() => {
    return getScheduleSummaryMetrics(sortedSubjects);
  }, [sortedSubjects]);

  const filteredSubjects = useMemo(() => {
    return filterScheduleSubjects(sortedSubjects, activeFilter);
  }, [sortedSubjects, activeFilter]);

  const dateRange = useMemo(() => {
    return getExamDateRange(sortedSubjects);
  }, [sortedSubjects]);

  const courseName = exam.course_id?.name || "—";
  const courseCode = exam.course_id?.code || "";
  const examName = exam.name || "Exam";
  const isPublished = exam.status === "PUBLISHED";

  return (
    <div className="published-exam-card">
      {/* ── Card Header ── */}
      <div className="published-exam-card-header">
        <div className="published-exam-card-header-left">
          <div className="published-exam-card-header-icon" aria-hidden="true">
            <FaCalendarAlt />
          </div>
          <div>
            <h4 className="published-exam-card-title">{examName}</h4>
            <p className="published-exam-card-subtitle">
              {courseName}
              {courseCode ? ` (${courseCode})` : ""} · Semester {exam.semester ?? "—"}
              {exam.academicYear ? ` · ${exam.academicYear}` : ""}
            </p>
            {dateRange && (
              <p className="published-exam-card-dates">
                <FaCalendarAlt className="date-range-icon" aria-hidden="true" />
                <span>Exam Dates: {dateRange}</span>
              </p>
            )}
          </div>
        </div>

        <div className="published-exam-card-meta">
          <span
            className={`published-exam-status-badge ${
              isPublished ? "is-published" : "is-draft"
            }`}
          >
            <span className="published-exam-status-dot" aria-hidden="true" />
            {isPublished ? "Published" : exam.status || "Draft"}
          </span>
          {onExamClick && (
            <button
              type="button"
              className="published-exam-view-btn"
              onClick={() => onExamClick(exam)}
            >
              <FaEye aria-hidden="true" />
              View Timetable
            </button>
          )}
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="published-exam-card-body">
        {sortedSubjects.length === 0 ? (
          <div className="published-exam-empty">
            <p>No subjects scheduled for this exam.</p>
          </div>
        ) : showSchedule ? (
          <>
            {/* Quick Summary Strip */}
            <div className="published-exam-summary-grid">
              <div className="published-exam-summary-card is-next">
                <span className="summary-card-label">Next Exam</span>
                <span className="summary-card-value">
                  {summaryMetrics.nextExamText ||
                    (summaryMetrics.completedPapers === summaryMetrics.totalPapers &&
                    summaryMetrics.totalPapers > 0
                      ? "Completed"
                      : "—")}
                </span>
              </div>
              <div className="published-exam-summary-card">
                <span className="summary-card-label">Total Papers</span>
                <span className="summary-card-value">{summaryMetrics.totalPapers}</span>
              </div>
              <div className="published-exam-summary-card">
                <span className="summary-card-label">Regular</span>
                <span className="summary-card-value">{summaryMetrics.regularPapers}</span>
              </div>
              {summaryMetrics.backlogPapers > 0 && (
                <div className="published-exam-summary-card is-backlog-metric">
                  <span className="summary-card-label">Backlog</span>
                  <span className="summary-card-value">{summaryMetrics.backlogPapers}</span>
                </div>
              )}
            </div>

            {/* Upcoming / Completed Filter Bar */}
            <div className="published-exam-filter-row">
              <div
                className="published-exam-filter-tabs"
                role="tablist"
                aria-label="Filter schedule entries"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === "ALL"}
                  className={`published-exam-filter-btn ${
                    activeFilter === "ALL" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveFilter("ALL")}
                >
                  All <span className="filter-badge">({summaryMetrics.totalPapers})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === "UPCOMING"}
                  className={`published-exam-filter-btn ${
                    activeFilter === "UPCOMING" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveFilter("UPCOMING")}
                >
                  Upcoming{" "}
                  <span className="filter-badge">({summaryMetrics.upcomingPapers})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === "COMPLETED"}
                  className={`published-exam-filter-btn ${
                    activeFilter === "COMPLETED" ? "is-active" : ""
                  }`}
                  onClick={() => setActiveFilter("COMPLETED")}
                >
                  Completed{" "}
                  <span className="filter-badge">({summaryMetrics.completedPapers})</span>
                </button>
              </div>
            </div>

            {/* Filtered Empty States */}
            {filteredSubjects.length === 0 ? (
              <div className="published-exam-filter-empty">
                {activeFilter === "UPCOMING" ? (
                  <>
                    <FaCheckCircle className="filter-empty-icon is-completed" aria-hidden="true" />
                    <h6 className="filter-empty-title">
                      All exams in this schedule have been completed
                    </h6>
                    <p className="filter-empty-text">
                      Select "All" or "Completed" above to view past paper schedules.
                    </p>
                  </>
                ) : (
                  <>
                    <FaClock className="filter-empty-icon is-upcoming" aria-hidden="true" />
                    <h6 className="filter-empty-title">No completed exams yet</h6>
                    <p className="filter-empty-text">
                      Exams will appear here once their scheduled date and time has passed.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="published-exam-table-wrap">
                  <table className="published-exam-table">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "28%" }}>Subject</th>
                        <th scope="col" style={{ width: "13%" }}>Code</th>
                        <th scope="col" style={{ width: "17%" }}>Exam Date</th>
                        <th scope="col" style={{ width: "18%" }}>Time & Duration</th>
                        <th scope="col" style={{ width: "11%" }}>Session</th>
                        <th scope="col" style={{ width: "13%" }}>Room No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((entry, idx) => {
                        const { name, code, category, originalSemester } = getSubjectInfo(entry);
                        const { weekday, dateStr, isoDate } = formatDateWithWeekday(entry.examDate);
                        const duration = calculateDuration(entry.startTime, entry.endTime);
                        const statusInfo = getRelativeExamStatus(
                          entry.examDate,
                          entry.startTime,
                          entry.endTime,
                        );

                        return (
                          <tr key={entry._id || `${exam._id}-${idx}`}>
                            <td>
                              <div className="published-exam-subject-cell">
                                <div className="published-exam-subject-top">
                                  <span className="published-exam-subject-name">{name}</span>
                                  <RelativeStatusBadge statusInfo={statusInfo} />
                                </div>
                                <div className="published-exam-badges-row">
                                  <SubjectCategoryBadge
                                    category={category}
                                    originalSemester={originalSemester}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="published-exam-subject-code">{code || "—"}</span>
                            </td>
                            <td>
                              <div className="published-exam-date-block">
                                <span className="published-exam-date-weekday">{weekday}</span>
                                <time className="published-exam-date-value" dateTime={isoDate}>
                                  {dateStr}
                                </time>
                              </div>
                            </td>
                            <td>
                              <div className="published-exam-time-block">
                                <span className="published-exam-time-range">
                                  {entry.startTime && entry.endTime
                                    ? `${formatTime12Hour(entry.startTime)} – ${formatTime12Hour(entry.endTime)}`
                                    : entry.startTime
                                      ? formatTime12Hour(entry.startTime)
                                      : "N/A"}
                                </span>
                                {duration && (
                                  <span className="published-exam-duration-chip">
                                    {duration}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="published-exam-session-chip">
                                {formatSession(entry.session)}
                              </span>
                            </td>
                            <td>
                              <RoomDisplay room={entry.room} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="published-exam-mobile-list">
                  {filteredSubjects.map((entry, idx) => {
                    const { name, code, category, originalSemester } = getSubjectInfo(entry);
                    const { weekday, dateStr, isoDate } = formatDateWithWeekday(entry.examDate);
                    const duration = calculateDuration(entry.startTime, entry.endTime);
                    const statusInfo = getRelativeExamStatus(
                      entry.examDate,
                      entry.startTime,
                      entry.endTime,
                    );

                    return (
                      <div
                        key={entry._id || `${exam._id}-${idx}`}
                        className="published-exam-mobile-card"
                      >
                        <div className="published-exam-mobile-card-header">
                          <div className="published-exam-mobile-title-wrap">
                            <span className="published-exam-subject-name">{name}</span>
                            <span className="published-exam-subject-code">{code || "—"}</span>
                          </div>
                          <RelativeStatusBadge statusInfo={statusInfo} />
                        </div>
                        <div className="published-exam-mobile-card-body">
                          <div className="published-exam-mobile-row">
                            <span className="published-exam-mobile-label">Type</span>
                            <SubjectCategoryBadge
                              category={category}
                              originalSemester={originalSemester}
                            />
                          </div>
                          <div className="published-exam-mobile-row">
                            <span className="published-exam-mobile-label">Date</span>
                            <span className="published-exam-mobile-date-val">
                              <span className="published-exam-weekday-chip">{weekday}</span>
                              <time dateTime={isoDate}>{dateStr}</time>
                            </span>
                          </div>
                          <div className="published-exam-mobile-row">
                            <span className="published-exam-mobile-label">Time</span>
                            <span>
                              {entry.startTime && entry.endTime
                                ? `${formatTime12Hour(entry.startTime)} – ${formatTime12Hour(entry.endTime)}`
                                : "N/A"}
                              {duration ? ` · ${duration}` : ""}
                            </span>
                          </div>
                          <div className="published-exam-mobile-row">
                            <span className="published-exam-mobile-label">Session</span>
                            <span>{formatSession(entry.session)}</span>
                          </div>
                          <div className="published-exam-mobile-row">
                            <span className="published-exam-mobile-label">Room No.</span>
                            <RoomDisplay room={entry.room} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* List View — Subjects without schedule timing yet */
          <div className="published-exam-subject-summary">
            <h6 className="published-exam-subject-summary-title">
              {sortedSubjects.length} {sortedSubjects.length === 1 ? "Subject" : "Subjects"}
            </h6>
            <div className="published-exam-subject-tag-list">
              {sortedSubjects.map((entry, idx) => {
                const { name, code, category, originalSemester } = getSubjectInfo(entry);
                return (
                  <span
                    key={entry._id || `${exam._id}-${idx}`}
                    className={`published-exam-subject-tag ${category === "BACKLOG" ? "is-backlog" : ""}`}
                    title={name}
                  >
                    <span className="tag-subject-name">{name}</span>
                    {code ? <span className="tag-subject-code"> ({code})</span> : null}
                    <span className="tag-subject-category">
                      {category === "BACKLOG"
                        ? ` [BACKLOG${originalSemester ? ` · Sem ${originalSemester}` : ""}]`
                        : " [REGULAR]"}
                    </span>
                  </span>
                );
              })}
            </div>
            {onExamClick && (
              <p className="published-exam-subject-hint">
                Click "View Timetable" to see the full schedule, timings, and rooms.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublishedExamTimetable({ exams, onExamClick }) {
  const examList = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams.map(normalizeExamItem).filter((item) => item != null);
  }, [exams]);

  if (!examList.length) {
    return (
      <div className="published-exam-timetable-empty">
        <div className="published-exam-timetable-empty-icon" aria-hidden="true">
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
      {examList.map((exam) => (
        <ExamScheduleCard key={exam._id} exam={exam} onExamClick={onExamClick} />
      ))}
    </div>
  );
}
