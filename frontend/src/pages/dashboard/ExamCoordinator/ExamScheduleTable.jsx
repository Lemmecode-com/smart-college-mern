import { useMemo } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaBook,
} from "react-icons/fa";

const STATUS = {
  SCHEDULED: "SCHEDULED",
  MISSING_DATE: "MISSING_DATE",
  MISSING_TIME: "MISSING_TIME",
  INVALID_RANGE: "INVALID_RANGE",
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // <input type="date"> expects yyyy-mm-dd in local time
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const computeRowStatus = (entry) => {
  if (!entry) return;
  const hasDate = Boolean(entry.examDate);
  const hasStart = Boolean(entry.startTime);
  const hasEnd = Boolean(entry.endTime);

  if (!hasDate) return STATUS.MISSING_DATE;
  if (!hasStart || !hasEnd) return STATUS.MISSING_TIME;

  const startMin = toMinutes(entry.startTime);
  const endMin = toMinutes(entry.endTime);
  if (startMin === null || endMin === null) return STATUS.MISSING_TIME;
  if (startMin >= endMin) return STATUS.INVALID_RANGE;

  return STATUS.SCHEDULED;
};

const STATUS_META = {
  [STATUS.SCHEDULED]: {
    label: "Scheduled",
    icon: FaCheckCircle,
    className: "success",
  },
  [STATUS.MISSING_DATE]: {
    label: "Missing date",
    icon: FaExclamationTriangle,
    className: "warning",
  },
  [STATUS.MISSING_TIME]: {
    label: "Missing time",
    icon: FaExclamationTriangle,
    className: "warning",
  },
  [STATUS.INVALID_RANGE]: {
    label: "Invalid range",
    icon: FaTimesCircle,
    className: "danger",
  },
};

export default function ExamScheduleTable({
  rows,
  readOnly,
  onRowChange,
  validationErrors,
  statusAnnouncement,
}) {
  const subjectTypePill = (type) => {
    const variants = {
      THEORY: "type-theory",
      PRACTICAL: "type-practical",
      COMPOSITE: "type-composite",
    };
    const cls = variants[type] || "type-default";
    return (
      <span className={`exam-schedule-pill type ${cls}`}>
        {type || "N/A"}
      </span>
    );
  };

  const statusPill = (entry) => {
    const status = computeRowStatus(entry);
    const meta = STATUS_META[status] || STATUS_META[STATUS.MISSING_DATE];
    const Icon = meta.icon;
    return (
      <span className={`exam-schedule-pill ${meta.className}`}>
        <Icon className="exam-schedule-pill-icon" aria-hidden="true" />
        <span className="exam-schedule-pill-dot" />
        {meta.label}
      </span>
    );
  };

  const summary = useMemo(() => {
    let scheduled = 0;
    let unscheduled = 0;
    for (const row of rows) {
      if (computeRowStatus(row) === STATUS.SCHEDULED) scheduled += 1;
      else unscheduled += 1;
    }
    return { scheduled, unscheduled, total: rows.length };
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="exam-schedule-table-card">
        <div className="exam-schedule-empty">
          <div className="exam-schedule-empty-icon">
            <FaBook />
          </div>
          <h5 className="exam-schedule-empty-title">No subjects in this exam</h5>
          <p className="exam-schedule-empty-text">
            Add subjects to the exam before creating a timetable.
          </p>
        </div>
      </div>
    );
  }

  const containerProps = readOnly
    ? { "aria-readonly": true }
    : {};

  return (
    <div
      className={`exam-schedule-table-card${readOnly ? " is-readonly" : ""}`}
      aria-busy="false"
      {...containerProps}
    >
      {/* Banner */}
      <div
        className={`exam-schedule-banner ${
          readOnly ? "is-readonly" : "is-editing"
        }`}
        role="status"
      >
        {readOnly ? (
          <>
            <FaCheckCircle className="exam-schedule-banner-icon" aria-hidden="true" />
            <span>
              This timetable is <strong>published</strong> and read-only.
            </span>
          </>
        ) : (
          <>
            <FaExclamationTriangle
              className="exam-schedule-banner-icon"
              aria-hidden="true"
            />
            <span>
              Schedule each subject with an exam date, start time, end time,
              session and room.
            </span>
          </>
        )}
      </div>

      {/* Summary chips */}
      <div className="exam-schedule-summary-strip">
        <span className="exam-schedule-summary-strip-item">
          <FaCheckCircle
            className="exam-schedule-summary-strip-icon success"
            aria-hidden="true"
          />
          Scheduled <strong>{summary.scheduled}</strong> / {summary.total}
        </span>
        <span className="exam-schedule-summary-strip-item">
          <FaExclamationTriangle
            className="exam-schedule-summary-strip-icon warning"
            aria-hidden="true"
          />
          Unscheduled <strong>{summary.unscheduled}</strong>
        </span>
      </div>

      {/* Live region for screen readers */}
      <p
        className="exam-schedule-sr-only"
        role="status"
        aria-live="polite"
      >
        {statusAnnouncement}
      </p>

      {/* Desktop / tablet table */}
      <div className="exam-schedule-table-wrap">
        <table className="exam-schedule-table">
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
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ScheduleRow
                key={row.subject}
                row={row}
                readOnly={readOnly}
                onRowChange={onRowChange}
                validationErrors={validationErrors}
                statusPill={statusPill}
                subjectTypePill={subjectTypePill}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="exam-schedule-mobile-list">
        {rows.map((row) => (
          <ScheduleCard
            key={row.subject}
            row={row}
            readOnly={readOnly}
            onRowChange={onRowChange}
            validationErrors={validationErrors}
            statusPill={statusPill}
            subjectTypePill={subjectTypePill}
          />
        ))}
      </div>
    </div>
  );
}

function ScheduleRow({
  row,
  readOnly,
  onRowChange,
  validationErrors,
  statusPill,
  subjectTypePill,
}) {
  const status = computeRowStatus(row);
  const fieldDisabled = readOnly;
  const invalidDate = !row.examDate;
  const invalidTime = !row.startTime || !row.endTime;
  const invalidRange = status === STATUS.INVALID_RANGE;

  const rowValidation = validationErrors?.get?.(row.subject) || null;
  const showError = !readOnly && (invalidDate || invalidTime || invalidRange || rowValidation);
  const startError = rowValidation?.startTime;
  const endError = rowValidation?.endTime;

  const handle = (field) => (e) => {
    onRowChange(row.subject, field, e.target.value);
  };

  return (
    <tr className={showError ? "has-error" : ""}>
      <td>
        <span className="exam-schedule-subject-name">
          {row.subjectName || "Subject"}
        </span>
      </td>
      <td>
        <span className="exam-schedule-subject-code">
          {row.subjectCode || "—"}
        </span>
      </td>
      <td>{subjectTypePill(row.subjectType)}</td>
      <td>
        <input
          id={`sched-${row.subject}-date`}
          type="date"
          className={`exam-schedule-field ${
            !readOnly && invalidDate ? "is-invalid" : ""
          }`}
          value={toDateInputValue(row.examDate)}
          onChange={handle("examDate")}
          disabled={fieldDisabled}
          aria-label={`Exam date for ${row.subjectName || "subject"}`}
          aria-invalid={!readOnly && invalidDate ? "true" : "false"}
        />
      </td>
      <td>
        <input
          id={`sched-${row.subject}-start`}
          type="time"
          className={`exam-schedule-field ${
            !readOnly && (invalidTime || invalidRange || startError) ? "is-invalid" : ""
          }`}
          value={row.startTime || ""}
          onChange={handle("startTime")}
          disabled={fieldDisabled}
          aria-label={`Start time for ${row.subjectName || "subject"}`}
          aria-invalid={!readOnly && (invalidTime || !!startError) ? "true" : "false"}
          aria-describedby={
            startError ? `sched-${row.subject}-start-error` : undefined
          }
        />
        {startError && (
          <p
            id={`sched-${row.subject}-start-error`}
            className="exam-schedule-field-error"
            role="alert"
          >
            {startError}
          </p>
        )}
      </td>
      <td>
        <input
          id={`sched-${row.subject}-end`}
          type="time"
          className={`exam-schedule-field ${
            !readOnly && (invalidTime || invalidRange || endError) ? "is-invalid" : ""
          }`}
          value={row.endTime || ""}
          onChange={handle("endTime")}
          disabled={fieldDisabled}
          aria-label={`End time for ${row.subjectName || "subject"}`}
          aria-invalid={!readOnly && (invalidTime || !!endError) ? "true" : "false"}
          aria-describedby={
            endError ? `sched-${row.subject}-end-error` : undefined
          }
        />
        {endError && (
          <p
            id={`sched-${row.subject}-end-error`}
            className="exam-schedule-field-error"
            role="alert"
          >
            {endError}
          </p>
        )}
      </td>
      <td>
        <select
          id={`sched-${row.subject}-session`}
          className="exam-schedule-field"
          value={row.session || ""}
          onChange={handle("session")}
          disabled={fieldDisabled}
          aria-label={`Session for ${row.subjectName || "subject"}`}
        >
          <option value="">—</option>
          <option value="FORENOON">FORENOON</option>
          <option value="AFTERNOON">AFTERNOON</option>
        </select>
      </td>
      <td>
        <input
          id={`sched-${row.subject}-room`}
          type="text"
          className="exam-schedule-field"
          value={row.room || ""}
          onChange={handle("room")}
          disabled={fieldDisabled}
          placeholder="Room"
          aria-label={`Room for ${row.subjectName || "subject"}`}
        />
      </td>
      <td>{statusPill(row)}</td>
    </tr>
  );
}

function ScheduleCard({
  row,
  readOnly,
  onRowChange,
  validationErrors,
  statusPill,
  subjectTypePill,
}) {
  const status = computeRowStatus(row);
  const fieldDisabled = readOnly;
  const invalidDate = !row.examDate;
  const invalidTime = !row.startTime || !row.endTime;
  const invalidRange = status === STATUS.INVALID_RANGE;

  const rowValidation = validationErrors?.get?.(row.subject) || null;
  const startError = rowValidation?.startTime;
  const endError = rowValidation?.endTime;

  const handle = (field) => (e) => {
    onRowChange(row.subject, field, e.target.value);
  };

  return (
    <div className="exam-schedule-mobile-card">
      <div className="exam-schedule-mobile-card-head">
        <div className="exam-schedule-mobile-card-title">
          <span className="exam-schedule-subject-name">
            {row.subjectName || "Subject"}
          </span>
          {row.subjectCode && (
            <span className="exam-schedule-subject-code">
              {row.subjectCode}
            </span>
          )}
        </div>
        {statusPill(row)}
      </div>

      <div className="exam-schedule-mobile-card-type">
        {subjectTypePill(row.subjectType)}
      </div>

      <div className="exam-schedule-mobile-card-fields">
        <div className="exam-schedule-mobile-field">
          <label htmlFor={`m-sched-${row.subject}-date`}>Exam Date</label>
          <input
            id={`m-sched-${row.subject}-date`}
            type="date"
            className={`exam-schedule-field ${
              !readOnly && invalidDate ? "is-invalid" : ""
            }`}
            value={toDateInputValue(row.examDate)}
            onChange={handle("examDate")}
            disabled={fieldDisabled}
            aria-invalid={!readOnly && invalidDate ? "true" : "false"}
          />
        </div>
        <div className="exam-schedule-mobile-field-row">
          <div className="exam-schedule-mobile-field">
            <label htmlFor={`m-sched-${row.subject}-start`}>Start Time</label>
            <input
              id={`m-sched-${row.subject}-start`}
              type="time"
              className={`exam-schedule-field ${
                !readOnly && (invalidTime || invalidRange || startError) ? "is-invalid" : ""
              }`}
              value={row.startTime || ""}
              onChange={handle("startTime")}
              disabled={fieldDisabled}
              aria-invalid={!readOnly && (invalidTime || !!startError) ? "true" : "false"}
              aria-describedby={
                startError ? `m-sched-${row.subject}-start-error` : undefined
              }
            />
            {startError && (
              <p
                id={`m-sched-${row.subject}-start-error`}
                className="exam-schedule-field-error"
                role="alert"
              >
                {startError}
              </p>
            )}
          </div>
          <div className="exam-schedule-mobile-field">
            <label htmlFor={`m-sched-${row.subject}-end`}>End Time</label>
            <input
              id={`m-sched-${row.subject}-end`}
              type="time"
              className={`exam-schedule-field ${
                !readOnly && (invalidTime || invalidRange || endError) ? "is-invalid" : ""
              }`}
              value={row.endTime || ""}
              onChange={handle("endTime")}
              disabled={fieldDisabled}
              aria-invalid={!readOnly && (invalidTime || !!endError) ? "true" : "false"}
              aria-describedby={
                endError ? `m-sched-${row.subject}-end-error` : undefined
              }
            />
            {endError && (
              <p
                id={`m-sched-${row.subject}-end-error`}
                className="exam-schedule-field-error"
                role="alert"
              >
                {endError}
              </p>
            )}
          </div>
        </div>
        <div className="exam-schedule-mobile-field-row">
          <div className="exam-schedule-mobile-field">
            <label htmlFor={`m-sched-${row.subject}-session`}>Session</label>
            <select
              id={`m-sched-${row.subject}-session`}
              className="exam-schedule-field"
              value={row.session || ""}
              onChange={handle("session")}
              disabled={fieldDisabled}
            >
              <option value="">—</option>
              <option value="FORENOON">FORENOON</option>
              <option value="AFTERNOON">AFTERNOON</option>
            </select>
          </div>
          <div className="exam-schedule-mobile-field">
            <label htmlFor={`m-sched-${row.subject}-room`}>Room</label>
            <input
              id={`m-sched-${row.subject}-room`}
              type="text"
              className="exam-schedule-field"
              value={row.room || ""}
              onChange={handle("room")}
              disabled={fieldDisabled}
              placeholder="Room"
            />
          </div>
        </div>
      </div>
    </div>
  );
}