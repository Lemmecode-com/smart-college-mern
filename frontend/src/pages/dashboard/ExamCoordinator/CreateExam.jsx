import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { createExam, publishExam } from "../../../api/exam";
import {
  createExamSchedule,
  publishExamSchedule,
} from "../../../api/examSchedule";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft,
  FaLayerGroup,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaInfoCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUsers,
  FaClock,
  FaAward,
  FaCalendarAlt,
  FaBook,
  FaTrash,
  FaBullhorn,
  FaUniversity,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import "./CreateExam.css";

const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
  secondary: {
    main: "#6c757d",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)",
  },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" },
  }),
};

/**
 * Build schedule row state from the selected subject objects (loaded from
 * the subjects API) and any existing rows. This mirrors the logic in
 * ExamSchedulePage.buildRowsFromExam but works with full subject objects
 * rather than exam-subject snapshots, avoiding the ObjectId-toString issue.
 * Existing row data is preserved for subjects that remain selected.
 */
const buildRowsFromSelectedSubjects = (selectedSubjectObjs, existingRows = []) => {
  const existingBySubject = new Map();
  for (const row of existingRows || []) {
    if (row.subject) existingBySubject.set(String(row.subject), row);
  }

  return (selectedSubjectObjs || []).map((subj) => {
    const key = String(subj._id);
    const existing = existingBySubject.get(key);
    if (existing) {
      return {
        ...existing,
        subject: subj._id,
        subjectName: subj.name || "Subject",
        subjectCode: subj.code || "",
        subjectType: subj.subjectType || existing.subjectType || "",
      };
    }
    return {
      subject: subj._id,
      subjectName: subj.name || "Subject",
      subjectCode: subj.code || "",
      subjectType: subj.subjectType || "",
      examDate: "",
      startTime: "",
      endTime: "",
      session: "",
      room: "",
    };
  });
};

/* =========================================================
   Time / validation helpers
   (previously imported from ExamSchedulePage.jsx — now local
   so this file has no dependency on that page)
   ========================================================= */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const match = TIME_REGEX.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const extractApiError = (err) => {
  const statusCode = err?.response?.status;
  const errorCode = err?.response?.data?.code;
  const message =
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again.";
  return { statusCode, errorCode, message };
};

/**
 * Lightweight client-side validation that mirrors the backend rules for
 * the fields the backend actually rejects. We intentionally do NOT block
 * Save Draft on missing date or incomplete rows (backend permits drafts).
 */
const validateRowsForSave = (rows) => {
  const errors = [];
  const rowErrors = new Map();

  rows.forEach((row) => {
    const hasStart = Boolean(row.startTime);
    const hasEnd = Boolean(row.endTime);

    if (
      (hasStart && !hasEnd) ||
      (!hasStart && hasEnd)
    ) {
      rowErrors.set(row.subject, {
        startTime: hasStart && !hasEnd ? "End time is required." : undefined,
        endTime: hasEnd && !hasStart ? "Start time is required." : undefined,
        message: "Start and end time are both required.",
      });
      return;
    }

    if (hasStart && hasEnd) {
      const startMin = toMinutes(row.startTime);
      const endMin = toMinutes(row.endTime);
      if (startMin !== null && endMin !== null && startMin >= endMin) {
        rowErrors.set(row.subject, {
          startTime: "Start time must be earlier than end time.",
          endTime: "End time must be later than start time.",
          message: "Start time must be earlier than end time.",
        });
      }
    }
  });

  if (rowErrors.size > 0) {
    const list = Array.from(rowErrors.values());
    const first = list[0];
    errors.push({
      title:
        list.length === 1
          ? "One row has an issue"
          : `${list.length} rows have issues`,
      message: first?.message || "Please fix the highlighted time fields.",
      rowErrors,
    });
  }

  return errors;
};

/* =========================================================
   Subject-wise schedule table
   (previously ExamScheduleTable.jsx — now local so this file
   has no dependency on that component file)
   ========================================================= */
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

const computeRowStatus = (entry) => {
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

function ExamScheduleTable({
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

/* =========================================================
   3-Step Progress Indicator (Phase 1 — informational only)
   ========================================================= */
const STEP_LABELS = ["Exam Information", "Select Subjects", "Subject-wise Schedule"];

const CreateExamProgress = ({ step1Complete, step2Complete, step3Complete }) => {
  const states = [
    step1Complete ? "completed" : "active",
    step2Complete ? "completed" : step1Complete ? "active" : "pending",
    step3Complete ? "completed" : step2Complete ? "active" : "pending",
  ];

  return (
    <nav
      className="create-exam-progress"
      aria-label="Create exam progress"
    >
      {STEP_LABELS.map((label, index) => {
        const state = states[index];
        return (
          <div
            key={label}
            className={`create-exam-progress-step ${state}`}
            aria-current={state === "active" ? "step" : undefined}
          >
            <span
              className="create-exam-progress-marker"
              aria-hidden="true"
            >
              {state === "completed" ? <FaCheckCircle /> : index + 1}
            </span>
            <span className="create-exam-progress-label">{label}</span>
          </div>
        );
      })}
    </nav>
  );
};

export default function CreateExam() {
  const navigate = useNavigate();

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    name: "",
    course_id: "",
    semester: "",
    academicYear: "",
    subjects: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= SCHEDULE STATE ================= */
  const [scheduleRows, setScheduleRows] = useState([]);
  const [rowValidationErrors, setRowValidationErrors] = useState(new Map());
  const [publishError, setPublishError] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        const depts = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.departments)
          ? res.data.departments
          : [];
        setDepartments(depts);
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await api.get(
          `/courses?departmentId=${formData.department_id}`,
        );
        const coursesData = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.courses)
          ? res.data.courses
          : [];
        setCourses(coursesData);
      } catch {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [formData.department_id]);

  /* ================= LOAD SUBJECTS WHEN COURSE/SEMESTER CHANGES ================= */
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!formData.course_id || !formData.semester) {
        setSubjects([]);
        return;
      }

      setLoadingSubjects(true);
      try {
        const res = await api.get(`/subjects/course/${formData.course_id}?semester=${formData.semester}`);
        const subjectsData = Array.isArray(res.data) ? res.data :
                             Array.isArray(res.data.data) ? res.data.data : [];
        setSubjects(subjectsData);
      } catch {
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

     fetchSubjects();
   }, [formData.course_id, formData.semester]);

   /* ================= SYNC SCHEDULE ROWS WITH SELECTED SUBJECTS ================= */
   useEffect(() => {
     const selectedSubjectObjs = formData.subjects
       .map((id) =>
         subjects.find((s) => String(s._id) === String(id)),
       )
       .filter(Boolean);
     setScheduleRows((prev) =>
       buildRowsFromSelectedSubjects(selectedSubjectObjs, prev),
     );
   }, [formData.subjects, subjects]);

  /* ================= HANDLERS ================= */
   const handleInputChange = (e) => {
     const { name, value } = e.target;
     const resetsSubjects = name === "department_id" || name === "course_id" || name === "semester";
     setFormData((prev) => ({
       ...prev,
       [name]: value,
       ...(name === "department_id" ? { course_id: "", semester: "", subjects: [] } : {}),
       ...(resetsSubjects && name !== "department_id" ? { subjects: [] } : {}),
     }));
     if (validationErrors[name]) {
       setValidationErrors((prev) => ({ ...prev, [name]: "" }));
     }
     if (resetsSubjects && validationErrors.subjects) {
       setValidationErrors((prev) => ({ ...prev, subjects: "" }));
     }
   };

   const toggleSubject = (subjectId) => {
     setFormData((prev) => {
       const exists = prev.subjects.includes(subjectId);
       return {
         ...prev,
         subjects: exists
           ? prev.subjects.filter((id) => id !== subjectId)
           : [...prev.subjects, subjectId],
       };
     });
   };

   /* ================= SCHEDULE ROW CHANGE ================= */
   const handleRowChange = (subjectKey, field, value) => {
     if (!subjectKey) return;
     setScheduleRows((prev) =>
       prev.map((row) =>
         row.subject === subjectKey ? { ...row, [field]: value } : row,
       ),
     );
     setRowValidationErrors((prev) => {
       if (!prev.has(subjectKey)) return prev;
       const next = new Map(prev);
       next.delete(subjectKey);
       return next;
     });
   };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Exam name is required";
    }

    if (!formData.department_id) {
      errors.department_id = "Department is required";
    }

    if (!formData.course_id) {
      errors.course_id = "Course is required";
    }

    if (!formData.semester) {
      errors.semester = "Semester is required";
    }

    if (!formData.academicYear.trim()) {
      errors.academicYear = "Academic year is required";
    }

    if (formData.subjects.length === 0) {
      errors.subjects = "At least one subject must be selected";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (mode) => {
    // mode: "DRAFT" | "PUBLISH"
    if (loading) return;

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    // Validate schedule rows for time format / range errors
    const rowErrors = validateRowsForSave(scheduleRows);
    if (rowErrors.length > 0) {
      const first = rowErrors[0];
      setRowValidationErrors(first.rowErrors);
      toast.error(first.message);
      return;
    }
    setRowValidationErrors(new Map());

    // For Publish, every row must be fully scheduled
    if (mode === "PUBLISH") {
      const blocking = scheduleRows.filter(
        (r) => computeRowStatus(r) !== "SCHEDULED",
      );
      if (blocking.length > 0 || scheduleRows.length === 0) {
        const msg =
          "Complete the timetable for all subjects before publishing.";
        setPublishError({
          message: msg,
          errorCode: "SCHEDULE_INCOMPLETE",
        });
        toast.error(msg);
        return;
      }
    }

    setLoading(true);
    setError("");
    setPublishError(null);

    try {
      // Step 1: Create the Exam
      const examRes = await createExam({
        name: formData.name.trim(),
        course_id: formData.course_id,
        semester: Number(formData.semester),
        academicYear: formData.academicYear.trim(),
        subjects: formData.subjects,
      });

      const createdExam = examRes?.exam || examRes;
      const examId = createdExam?._id;

      if (!examId) {
        throw new Error("Failed to get exam ID after creation");
      }

      toast.success("Exam created successfully!");

      // Step 2: Create / save the subject-wise timetable (DRAFT)
      const schedulePayload = {
        exam_id: examId,
        subjects: scheduleRows.map((row) => ({
          subject: row.subject,
          examDate: row.examDate || undefined,
          startTime: row.startTime || undefined,
          endTime: row.endTime || undefined,
          session: row.session || undefined,
          room: row.room || undefined,
        })),
      };

      await createExamSchedule(examId, schedulePayload);

      if (mode === "DRAFT") {
        toast.success("Exam created and saved as draft!");
      }

      // Step 3: If Publish, publish the schedule and the exam
      if (mode === "PUBLISH") {
        await publishExamSchedule(examId);
        await publishExam(examId);
        toast.success("Exam created and published successfully!");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard/exam");
      }, 1500);
    } catch (err) {
      const { statusCode, errorCode, message } = extractApiError(err);
      logger.error(
        "Error in exam creation workflow:",
        statusCode,
        errorCode,
      );

      if (AUTH_ERROR_CODES.has(errorCode)) {
        setError({
          message,
          statusCode,
          errorCode,
          isAuthError: true,
        });
      } else if (mode === "PUBLISH") {
        setPublishError({ message, errorCode });
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = (e) => {
    e.preventDefault();
    handleSubmit("DRAFT");
  };

  const handlePublishClick = (e) => {
    e.preventDefault();
    if (loading) return;

    const blocking = scheduleRows.filter(
      (r) => computeRowStatus(r) !== "SCHEDULED",
    );
    if (blocking.length > 0 || scheduleRows.length === 0) {
      const msg =
        "Complete the timetable for all subjects before publishing.";
      setPublishError({
        message: msg,
        errorCode: "SCHEDULE_INCOMPLETE",
      });
      toast.error(msg);
      return;
    }

    setPublishError(null);
    setShowPublishConfirm(true);
  };

  const confirmPublish = async () => {
    setShowPublishConfirm(false);
    await handleSubmit("PUBLISH");
  };

   const selectedCourse = courses.find((c) => c._id === formData.course_id);

/* ================= SCHEDULE DERIVED STATE ================= */
   const scheduledCount = useMemo(
     () => scheduleRows.filter((r) => computeRowStatus(r) === "SCHEDULED").length,
     [scheduleRows],
   );
   const totalSelectedSubjects = scheduleRows.length;
   const allScheduled =
     totalSelectedSubjects > 0 && scheduledCount === totalSelectedSubjects;

   /* ================= PROGRESS INDICATOR STATE (informational only) ================= */
   const step1Complete = Boolean(
     formData.name.trim() &&
       formData.department_id &&
       formData.course_id &&
       formData.semester &&
       formData.academicYear.trim(),
   );
   const step2Complete = formData.subjects.length > 0;
   const step3Complete = step2Complete && allScheduled;

   /* ================= RENDER ================= */
   if (success) {
     return (
       <div className="exam-form create-exam container-fluid p-4">
         <div className="success-screen">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
           <div className="alert-edx alert-edx-success" style={{ justifyContent: "center" }}>
             <FaCheckCircle />
             Exam created successfully! Redirecting...
           </div>
        </div>
      </div>
    );
  }

if (error && typeof error === "object" && error.isAuthError) {
     return (
       <div className="exam-form create-exam container-fluid p-4">
         <ApiError
           statusCode={error.statusCode}
           errorCode={error.errorCode}
           message={error.message}
         />
       </div>
     );
   }

   return (
     <div className="exam-form create-exam container-fluid p-4">
<Breadcrumb
          items={[
            { label: "Home", path: "/dashboard/exam" },
            { label: "Exam Dashboard", path: "/dashboard/exam" },
            { label: "Create Exam" },
          ]}
        />

       <div className="create-exam-page-header">
         <h1 className="create-exam-title">Create Exam</h1>
         <p className="create-exam-subtitle">
           Set exam details, select subjects, and configure the subject-wise timetable.
         </p>
         <CreateExamProgress
           step1Complete={step1Complete}
           step2Complete={step2Complete}
           step3Complete={step3Complete}
         />
       </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="exam-card mt-3"
          >
            <div className="exam-card-header">
              <div className="exam-card-header-icon">
                <FaBookOpen />
              </div>
              <h4 className="exam-card-title">Create New Exam</h4>
            </div>
             <div className="exam-card-body">
               {error && typeof error === "string" && (
                 <div className="alert-edx alert-edx-danger mb-3">
                   <FaExclamationTriangle />
                   {error}
                 </div>
               )}

               <ConfirmModal
                 isOpen={showPublishConfirm}
                 onClose={() => setShowPublishConfirm(false)}
                 onConfirm={confirmPublish}
                 title="Publish Exam"
                 message={
                   "Are you sure you want to publish this exam and its timetable?\n\n" +
                   `Subjects to schedule: ${totalSelectedSubjects}\n` +
                   `Scheduled subjects: ${scheduledCount}\n` +
                   "Once published, the timetable becomes read-only."
                 }
                 type="warning"
                 confirmText="Publish Exam"
                 cancelText="Cancel"
                 isLoading={loading}
               />

<form onSubmit={(e) => e.preventDefault()}>
                  <div className="create-exam-section">
                    <div className="create-exam-section-header">
                      <span className="create-exam-section-num">1</span>
                      <div>
                        <h3 className="create-exam-section-title">Exam Information</h3>
                        <p className="create-exam-section-subtitle">
                          Enter the basic details for this examination.
                        </p>
                      </div>
                    </div>

                    <div className="create-exam-field-grid">
                      {/* Exam Name */}
                      <motion.div
                        custom={0}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="create-exam-field exam-name-field"
                      >
                        <label className="create-exam-field-label">
                          <FaBookOpen className="create-exam-field-label-icon" />
                          Exam Name <span className="create-exam-required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`create-exam-field-input ${validationErrors.name ? "is-invalid" : ""}`}
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g. Mid-Term Examination"
                          disabled={loading}
                        />
                        {validationErrors.name ? (
                          <div className="create-exam-field-helper is-error">
                            <FaExclamationTriangle />
                            {validationErrors.name}
                          </div>
                        ) : (
                          <div className="create-exam-field-helper">
                            A clear, descriptive title for this examination.
                          </div>
                        )}
                      </motion.div>

                      {/* Department Selection */}
                      <motion.div
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="create-exam-field"
                      >
                        <label className="create-exam-field-label">
                          <FaUniversity className="create-exam-field-label-icon" />
                          Department <span className="create-exam-required">*</span>
                        </label>
                        {loadingDepartments ? (
                          <div className="create-exam-loading-state">
                            <FaSpinner className="spin" />
                            Loading departments...
                          </div>
                        ) : (
                          <select
                            className={`create-exam-field-input ${validationErrors.department_id ? "is-invalid" : ""}`}
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleInputChange}
                            disabled={loading}
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                        )}
                        {validationErrors.department_id ? (
                          <div className="create-exam-field-helper is-error">
                            <FaExclamationTriangle />
                            {validationErrors.department_id}
                          </div>
                        ) : (
                          <div className="create-exam-field-helper">
                            Choose the department offering this course.
                          </div>
                        )}
                      </motion.div>

                      {/* Course Selection */}
                      <motion.div
                        custom={2}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="create-exam-field"
                      >
                        <label className="create-exam-field-label">
                          <FaGraduationCap className="create-exam-field-label-icon" />
                          Course <span className="create-exam-required">*</span>
                        </label>
                        {loadingCourses ? (
                          <div className="create-exam-loading-state">
                            <FaSpinner className="spin" />
                            Loading courses...
                          </div>
                        ) : (
                          <select
                            className={`create-exam-field-input ${validationErrors.course_id ? "is-invalid" : ""}`}
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleInputChange}
                            disabled={loading || !formData.department_id}
                          >
                            <option value="">Select Course</option>
                            {courses.map((course) => (
                              <option key={course._id} value={course._id}>
                                {course.name} ({course.code})
                              </option>
                            ))}
                          </select>
                        )}
                        {validationErrors.course_id ? (
                          <div className="create-exam-field-helper is-error">
                            <FaExclamationTriangle />
                            {validationErrors.course_id}
                          </div>
                        ) : !formData.department_id ? (
                          <div className="create-exam-field-helper is-disabled">
                            Select a department first.
                          </div>
                        ) : courses.length === 0 ? (
                          <div className="create-exam-field-helper">
                            No courses available for the selected department.
                          </div>
                        ) : (
                          <div className="create-exam-field-helper">
                            Choose the course this exam belongs to.
                          </div>
                        )}
                      </motion.div>

                      {/* Semester Selection */}
                      <motion.div
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="create-exam-field"
                      >
                        <label className="create-exam-field-label">
                          <FaLayerGroup className="create-exam-field-label-icon" />
                          Semester <span className="create-exam-required">*</span>
                        </label>
                        <select
                          className={`create-exam-field-input ${validationErrors.semester ? "is-invalid" : ""}`}
                          name="semester"
                          value={formData.semester}
                          onChange={handleInputChange}
                          disabled={loading || !formData.course_id}
                        >
                          <option value="">Select Semester</option>
                          {selectedCourse &&
                            Array.from({ length: selectedCourse.durationSemesters }, (_, i) => i + 1).map(
                              (sem) => (
                                <option key={sem} value={sem}>
                                  Semester {sem}
                                </option>
                              )
                            )}
                        </select>
                        {validationErrors.semester ? (
                          <div className="create-exam-field-helper is-error">
                            <FaExclamationTriangle />
                            {validationErrors.semester}
                          </div>
                        ) : !formData.course_id ? (
                          <div className="create-exam-field-helper is-disabled">
                            Select a course first.
                          </div>
                        ) : selectedCourse && selectedCourse.durationSemesters === 0 ? (
                          <div className="create-exam-field-helper">
                            No semesters configured for this course.
                          </div>
                        ) : (
                          <div className="create-exam-field-helper">
                            Select the semester for this exam.
                          </div>
                        )}
                      </motion.div>

                      {/* Academic Year */}
                      <motion.div
                        custom={4}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInVariants}
                        className="create-exam-field"
                      >
                        <label className="create-exam-field-label">
                          <FaCalendarAlt className="create-exam-field-label-icon" />
                          Academic Year <span className="create-exam-required">*</span>
                        </label>
                        <input
                          type="text"
                          className={`create-exam-field-input ${validationErrors.academicYear ? "is-invalid" : ""}`}
                          name="academicYear"
                          value={formData.academicYear}
                          onChange={handleInputChange}
                          placeholder="e.g. 2026-27"
                          disabled={loading}
                        />
                        {validationErrors.academicYear ? (
                          <div className="create-exam-field-helper is-error">
                            <FaExclamationTriangle />
                            {validationErrors.academicYear}
                          </div>
                        ) : (
                          <div className="create-exam-field-helper">
                            Use the academic year format, e.g. 2026-27.
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>

                {/* Subject Selection */}
                <motion.div
                  custom={5}
                   initial="hidden"
                   animate="visible"
                   variants={fadeInVariants}
                   className="field-group"
                 >
                   <label className="field-label">Subjects *</label>
                  {!formData.course_id || !formData.semester ? (
                    <div className="alert-edx alert-edx-info">
                      <FaInfoCircle />
                      Please select a department, course, and semester first to load available subjects.
                    </div>
                  ) : loadingSubjects ? (
                    <div className="text-center py-4" style={{ color: "var(--edx-slate-600)" }}>
                      <FaSpinner className="spin me-2" />
                      Loading subjects...
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="alert-edx alert-edx-warning">
                      <FaExclamationTriangle />
                      No subjects found for the selected course and semester.
                    </div>
                  ) : (
                    <div className="subject-list">
                      {subjects.map((subject) => {
                        const isSelected = formData.subjects.includes(subject._id);
                        return (
                          <div
                            key={subject._id}
                            className={`subject-item ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleSubject(subject._id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSubject(subject._id)}
                              disabled={loading}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="subject-item-icon">
                              <FaBook />
                            </div>
                            <div className="subject-main">
                              <div className="subject-top-row">
                                <div>
                                  <span className="subject-name">{subject.name}</span>
                                  <span className="pill pill-slate">{subject.code}</span>
                                  <span className="pill pill-cyan">{subject.subjectType || "N/A"}</span>
                                </div>
                                <span className="subject-credits">
                                  <FaAward />
                                  {subject.credits} credits
                                </span>
                              </div>
                              {subject.teacher_id?.name && (
                                <div className="subject-teacher">
                                  <FaChalkboardTeacher />
                                  {subject.teacher_id.name}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {validationErrors.subjects && (
                    <div className="field-feedback">{validationErrors.subjects}</div>
                  )}
                </motion.div>

                {/* Publish error banner */}
                {publishError && (
                  <div className="schedule-publish-error danger">
                    <FaExclamationTriangle />
                    <div>
                      <strong>{publishError.errorCode || "Error"}</strong>
                      <span>{publishError.message}</span>
                    </div>
                  </div>
                )}

                {/* Subject-wise Schedule */}
                <AnimatePresence>
                  {formData.subjects.length > 0 && (
                    <motion.div
                      className="schedule-section"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <h5 className="schedule-section-title">
                        <FaCalendarAlt />
                        Subject-wise Schedule
                      </h5>
                      <div className="schedule-info">
                        <FaInfoCircle />
                        {scheduledCount} of {totalSelectedSubjects} subjects
                        scheduled.
                      </div>

                      <ExamScheduleTable
                        rows={scheduleRows}
                        readOnly={false}
                        onRowChange={handleRowChange}
                        validationErrors={rowValidationErrors}
                        statusAnnouncement=""
                      />

                      {!allScheduled && (
                        <div
                          className="schedule-readiness is-pending"
                          role="status"
                        >
                          <FaExclamationTriangle />
                          <span>
                            {scheduledCount} of {totalSelectedSubjects}{" "}
                            subjects scheduled. Complete scheduling before
                            publishing.
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="form-actions">
                  <div className="actions-left">
                    <button
                      type="button"
                      className="btn-edx-outline"
                      onClick={() => navigate("/dashboard/exam")}
                      disabled={loading}
                    >
                      <FaArrowLeft />
                      Cancel
                    </button>
                  </div>

                  <div className="actions-right">
                    <button
                      type="button"
                      className="btn-edx-draft"
                      onClick={handleSaveAsDraft}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <FaSave />
                          Save as Draft
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn-edx-publish"
                      onClick={handlePublishClick}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <FaBullhorn />
                          Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}