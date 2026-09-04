import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  FaCalendarAlt,
  FaClock,
  FaGraduationCap,
  FaLayerGroup,
  FaBookOpen,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSave,
  FaSpinner,
  FaInfoCircle,
  FaBullhorn,
} from "react-icons/fa";

import { getExamById } from "../../../api/exam";
import {
  createExamSchedule,
  getExamSchedule,
  publishExamSchedule,
  updateExamSchedule,
} from "../../../api/examSchedule";

import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import ConfirmModal from "../../../components/ConfirmModal";
import ExamScheduleTable, { computeRowStatus } from "./ExamScheduleTable";
import { logger } from "../../../utils/logger";

import "./ExamSchedulePage.css";

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

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const toIsoOrEmpty = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

const toMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const match = TIME_REGEX.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Build the editor row state from the Exam subjects list and an optional
 * existing schedule. Exam subjects are the source of truth — subjects that
 * have no matching entry in the schedule still appear as unscheduled rows.
 */
const buildRowsFromExam = (examSubjects, scheduleSubjects) => {
  const bySubjectId = new Map();
  for (const entry of scheduleSubjects || []) {
    const key = entry?.subject ? String(entry.subject) : null;
    if (!key) continue;
    bySubjectId.set(key, entry);
  }

  return (examSubjects || []).map((examSubject) => {
    const subjectRef = examSubject.subject;
    const subjectId = subjectRef ? String(subjectRef) : null;
    const subj =
      typeof subjectRef === "object" && subjectRef !== null ? subjectRef : null;

    const existing = subjectId ? bySubjectId.get(subjectId) : null;

    return {
      subject: subjectId || String(examSubject._id || ""),
      subjectName: subj?.name || existing?.subject?.name || "Subject",
      subjectCode: subj?.code || existing?.subject?.code || "",
      subjectType: examSubject.subjectType || subj?.subjectType || "",
      examDate: toIsoOrEmpty(existing?.examDate) || "",
      startTime: existing?.startTime || "",
      endTime: existing?.endTime || "",
      session: existing?.session || "",
      room: existing?.room || "",
    };
  });
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

/**
 * Returns null if every row is fully schedulable, otherwise the list of
 * subject identifiers that are missing/invalid (used to drive UI hints).
 */
const findBlockingRows = (rows) => {
  const blocking = [];
  for (const row of rows) {
    if (computeRowStatus(row) !== "SCHEDULED") {
      blocking.push(row);
    }
  }
  return blocking;
};

const formatClockTime = (date) => {
  if (!date) return "";
  try {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function ExamSchedulePage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const [validationErrors, setValidationErrors] = useState(new Map());

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= FETCH EXAM + SCHEDULE ================= */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!examId) {
        setError({
          message: "Missing exam identifier.",
          statusCode: 400,
          errorCode: "EXAM_ID_MISSING",
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      let examData = null;
      let examError = null;
      try {
        const examPayload = await getExamById(examId);
        examData = examPayload?.exam || examPayload;
      } catch (err) {
        examError = err;
      }

      let scheduleData = null;
      let scheduleError = null;
      try {
        const schedulePayload = await getExamSchedule(examId);
        scheduleData = schedulePayload?.schedule || schedulePayload;
      } catch (err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        if (status === 404 || code === "SCHEDULE_NOT_FOUND") {
          scheduleData = null;
        } else {
          scheduleError = err;
        }
      }

      if (cancelled) return;

      if (examError) {
        const { statusCode, errorCode, message } = extractApiError(examError);
        setError({ message, statusCode, errorCode });
        logger.error(
          "ExamSchedulePage: failed to load exam",
          statusCode,
          errorCode,
        );
      } else if (scheduleError) {
        const { statusCode, errorCode, message } = extractApiError(scheduleError);
        setError({ message, statusCode, errorCode });
        logger.error(
          "ExamSchedulePage: failed to load schedule",
          statusCode,
          errorCode,
        );
      } else {
        setExam(examData);
        setSchedule(scheduleData);
        setRows(buildRowsFromExam(examData?.subjects, scheduleData?.subjects));
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  /* ================= ROW STATE HANDLING ================= */
  const handleRowChange = (subjectKey, field, value) => {
    if (!subjectKey) return;
    setRows((prev) =>
      prev.map((row) =>
        row.subject === subjectKey ? { ...row, [field]: value } : row,
      ),
    );
    // Clear any client validation error for this row once the user edits.
    setValidationErrors((prev) => {
      if (!prev.has(subjectKey)) return prev;
      const next = new Map(prev);
      next.delete(subjectKey);
      return next;
    });
  };

  /* ================= DERIVED STATE ================= */
  const totalSubjects = useMemo(() => rows.length, [rows]);
  const scheduledCount = useMemo(
    () => rows.filter((r) => computeRowStatus(r) === "SCHEDULED").length,
    [rows],
  );
  const unscheduledCount = Math.max(0, totalSubjects - scheduledCount);

  const scheduleStatus = schedule?.status || "NONE";
  const readOnly = scheduleStatus === "PUBLISHED";
  const hasSchedule = Boolean(schedule);
  const hasDraft = hasSchedule && scheduleStatus === "DRAFT";

  const blockingRows = useMemo(() => findBlockingRows(rows), [rows]);
  const canPublish = hasDraft && blockingRows.length === 0 && totalSubjects > 0;

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (saving || publishing || readOnly || !examId) return;

    setSaveError(null);
    const errors = validateRowsForSave(rows);
    if (errors.length > 0) {
      const first = errors[0];
      setValidationErrors(first.rowErrors);
      toast.error(first.message);
      return;
    }
    setValidationErrors(new Map());

    const payload = {
      exam_id: examId,
      subjects: rows.map((row) => ({
        subject: row.subject,
        examDate: row.examDate || undefined,
        startTime: row.startTime || undefined,
        endTime: row.endTime || undefined,
        session: row.session || undefined,
        room: row.room || undefined,
      })),
    };

    setSaving(true);
    try {
      const isUpdate = hasDraft;
      const response = isUpdate
        ? await updateExamSchedule(examId, payload)
        : await createExamSchedule(examId, payload);

      const returned = response?.schedule || response;
      if (returned) {
        setSchedule(returned);
        setRows(buildRowsFromExam(exam?.subjects, returned.subjects));
      }

      const now = new Date();
      setLastSavedAt(now);
      setStatusAnnouncement(
        isUpdate ? "Draft saved successfully." : "Schedule created successfully.",
      );

      toast.success(
        response?.message ||
          (isUpdate
            ? "Draft saved successfully."
            : "Schedule created successfully."),
      );
    } catch (err) {
      const { statusCode, errorCode, message } = extractApiError(err);
      logger.error("ExamSchedulePage: save failed", statusCode, errorCode);

      if (AUTH_ERROR_CODES.has(errorCode)) {
        setError({ message, statusCode, errorCode });
        return;
      }

      if (errorCode === "SCHEDULE_ALREADY_EXISTS") {
        try {
          const refreshedPayload = await getExamSchedule(examId);
          const refreshed = refreshedPayload?.schedule || refreshedPayload;
          if (refreshed) {
            setSchedule(refreshed);
            setRows(buildRowsFromExam(exam?.subjects, refreshed.subjects));
          }
        } catch {
          /* ignore */
        }
      }

      setSaveError({ message, errorCode });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ================= PUBLISH ================= */
  const handlePublishClick = () => {
    if (saving || publishing || !hasDraft || !examId) return;

    // Defensive client-side gate — the backend re-validates, but never
    // call the publish endpoint for incomplete / invalid schedules.
    if (blockingRows.length > 0 || totalSubjects === 0) {
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

  const handlePublishCancel = () => {
    if (publishing) return;
    setShowPublishConfirm(false);
  };

  const handlePublishConfirm = async () => {
    if (publishing || !hasDraft || !examId) return;

    // Re-check right before the call (state may have drifted).
    if (blockingRows.length > 0 || totalSubjects === 0) {
      setShowPublishConfirm(false);
      const msg =
        "Complete the timetable for all subjects before publishing.";
      setPublishError({ message: msg, errorCode: "SCHEDULE_INCOMPLETE" });
      toast.error(msg);
      return;
    }

    setPublishing(true);
    try {
      const response = await publishExamSchedule(examId);
      const returned = response?.schedule || response;

      if (returned) {
        setSchedule(returned);
        setRows(buildRowsFromExam(exam?.subjects, returned.subjects));
      } else if (exam?.subjects) {
        // Fallback: rebuild with the existing local rows but mark as published.
        setSchedule((prev) =>
          prev ? { ...prev, status: "PUBLISHED" } : prev,
        );
      }

      setStatusAnnouncement("Exam timetable published successfully.");
      toast.success(
        response?.message || "Exam timetable published successfully.",
      );

      setShowPublishConfirm(false);
      // Clear transient save indicators (matches Step 5 publish behavior).
      setLastSavedAt(null);
    } catch (err) {
      const { statusCode, errorCode, message } = extractApiError(err);
      logger.error(
        "ExamSchedulePage: publish failed",
        statusCode,
        errorCode,
      );

      if (AUTH_ERROR_CODES.has(errorCode)) {
        setError({ message, statusCode, errorCode });
        setShowPublishConfirm(false);
        return;
      }

      setPublishError({ message, errorCode });
      toast.error(message);
      // Keep the modal closed on a server-side rejection so the user can
      // correct the data; re-open it by clicking Publish again. The spec
      // requires the page to remain usable after a publish failure.
      setShowPublishConfirm(false);
    } finally {
      setPublishing(false);
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return <Loading message="Loading exam timetable..." />;
  }

  if (error) {
    if (AUTH_ERROR_CODES.has(error.errorCode)) {
      return (
        <ApiError
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          message={error.message}
        />
      );
    }
    return (
      <div className="exam-schedule-page container-fluid p-4">
        <div className="exam-schedule-fallback">
          <div className="exam-schedule-fallback-icon danger">
            <FaExclamationTriangle />
          </div>
          <h5 className="exam-schedule-fallback-title">
            Unable to load timetable
          </h5>
          <p className="exam-schedule-fallback-text">{error.message}</p>
          <button
            type="button"
            className="exam-schedule-btn-primary"
            onClick={() => navigate("/dashboard/exam/list")}
          >
            <FaArrowLeft />
            Back to Exam List
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="exam-schedule-page container-fluid p-4">
        <div className="exam-schedule-fallback">
          <div className="exam-schedule-fallback-icon warning">
            <FaExclamationTriangle />
          </div>
          <h5 className="exam-schedule-fallback-title">Exam not found</h5>
          <p className="exam-schedule-fallback-text">
            The requested exam could not be loaded.
          </p>
          <button
            type="button"
            className="exam-schedule-btn-primary"
            onClick={() => navigate("/dashboard/exam/list")}
          >
            <FaArrowLeft />
            Back to Exam List
          </button>
        </div>
      </div>
    );
  }

  const examName = exam.name || "Untitled Exam";
  const courseName = exam.course_id?.name || "—";
  const courseCode = exam.course_id?.code || "";
  const semester = exam.semester;
  const academicYear = exam.academicYear;

  const showCreate = !hasSchedule && !readOnly;
  const showDraftActions = hasDraft && !readOnly;
  const showSaveButton = showCreate || showDraftActions;
  const saveButtonLabel = showCreate ? "Create Schedule" : "Save Draft";
  const savingLabel = showCreate ? "Creating..." : "Saving...";
  const showPublishButton = showDraftActions;

  const publishIncomplete =
    showPublishButton &&
    (totalSubjects === 0 || blockingRows.length > 0);

  return (
    <div className="exam-schedule-page container-fluid p-4">
      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Exam List", path: "/dashboard/exam/list" },
          { label: "Exam Timetable" },
        ]}
      />

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={handlePublishCancel}
        onConfirm={handlePublishConfirm}
        title="Publish Exam Timetable?"
        message={
          "Once published, this timetable becomes read-only and can no longer be modified.\n\n" +
          `Exam: ${examName}\n` +
          `Total subjects: ${totalSubjects}\n` +
          `Scheduled subjects: ${scheduledCount}`
        }
        type="warning"
        confirmText="Publish Timetable"
        cancelText="Cancel"
        isLoading={publishing}
      />

      {/* Header card */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="exam-schedule-card mt-2"
      >
        <div className="exam-schedule-card-header">
          <div className="exam-schedule-card-header-left">
            <div className="exam-schedule-card-header-icon">
              <FaCalendarAlt />
            </div>
            <div>
              <h4 className="exam-schedule-card-title">{examName}</h4>
              <p className="exam-schedule-card-subtitle">
                Exam Timetable · {courseName}
                {courseCode ? ` (${courseCode})` : ""}
              </p>
            </div>
          </div>
          {renderStatusPill(scheduleStatus, hasSchedule)}
        </div>

        <div className="exam-schedule-card-body">
          {/* Info grid */}
          <div className="exam-schedule-info-grid">
            <div className="exam-schedule-info-item">
              <div className="exam-schedule-info-icon primary">
                <FaGraduationCap />
              </div>
              <div>
                <span className="exam-schedule-info-label">Course</span>
                <span className="exam-schedule-info-value">{courseName}</span>
                <span className="exam-schedule-info-sub">
                  {courseCode || " "}
                </span>
              </div>
            </div>
            <div className="exam-schedule-info-item">
              <div className="exam-schedule-info-icon info">
                <FaLayerGroup />
              </div>
              <div>
                <span className="exam-schedule-info-label">Semester</span>
                <span className="exam-schedule-info-value">
                  {semester ? `Semester ${semester}` : "—"}
                </span>
              </div>
            </div>
            <div className="exam-schedule-info-item">
              <div className="exam-schedule-info-icon warning">
                <FaClock />
              </div>
              <div>
                <span className="exam-schedule-info-label">Academic Year</span>
                <span className="exam-schedule-info-value">
                  {academicYear || "—"}
                </span>
              </div>
            </div>
            <div className="exam-schedule-info-item">
              <div className="exam-schedule-info-icon success">
                <FaBookOpen />
              </div>
              <div>
                <span className="exam-schedule-info-label">Scheduled Subjects</span>
                <span className="exam-schedule-info-value">
                  {scheduledCount} / {totalSubjects}
                </span>
                <span className="exam-schedule-info-sub">
                  {totalSubjects === 0
                    ? "No subjects in this exam"
                    : "Subjects with date & time assigned"}
                </span>
              </div>
            </div>
          </div>

          {/* Save error banner (top of card body) */}
          {saveError && (
            <div className="exam-schedule-alert danger" role="alert">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <strong>{saveError.errorCode || "Save failed"}</strong>
                <span>{saveError.message}</span>
              </div>
            </div>
          )}

          {/* Publish error banner */}
          {publishError && (
            <div className="exam-schedule-alert danger" role="alert">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <strong>{publishError.errorCode || "Publish failed"}</strong>
                <span>{publishError.message}</span>
              </div>
            </div>
          )}

          {/* Schedule editor / view */}
          <ExamScheduleTable
            rows={rows}
            readOnly={readOnly}
            onRowChange={handleRowChange}
            validationErrors={validationErrors}
            statusAnnouncement={statusAnnouncement}
          />

          {/* Publish-readiness hint (informational only) */}
          {!readOnly && totalSubjects > 0 && (
            <div
              className={`exam-schedule-readiness ${
                unscheduledCount === 0 ? "is-ready" : "is-pending"
              }`}
              role="status"
            >
              {unscheduledCount === 0 ? (
                <>
                  <FaCheckCircle aria-hidden="true" />
                  <span>
                    All <strong>{totalSubjects}</strong> subjects are
                    scheduled.
                  </span>
                </>
              ) : (
                <>
                  <FaInfoCircle aria-hidden="true" />
                  <span>
                    {scheduledCount} / {totalSubjects} subjects scheduled.{" "}
                    {unscheduledCount} subject
                    {unscheduledCount === 1 ? "" : "s"} still need
                    scheduling before publishing.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Publish-specific gate message when Save Draft exists but the
              schedule isn't ready to publish. */}
          {showPublishButton && publishIncomplete && (
            <div
              className="exam-schedule-readiness is-pending"
              role="status"
            >
              <FaExclamationTriangle aria-hidden="true" />
              <span>
                Complete the timetable for all subjects before publishing.{" "}
                <strong>
                  {scheduledCount} of {totalSubjects}
                </strong>{" "}
                subjects scheduled.
              </span>
            </div>
          )}

          {/* Footer / action area */}
          <div
            className="exam-schedule-actions"
            aria-busy={saving || publishing ? "true" : "false"}
          >
            <div className="exam-schedule-actions-left">
              <button
                type="button"
                className="exam-schedule-btn-outline"
                onClick={() => navigate(`/dashboard/exam/view/${examId}`)}
                disabled={saving || publishing}
              >
                <FaArrowLeft />
                Back to Exam
              </button>
              {lastSavedAt && !readOnly && (
                <span className="exam-schedule-last-saved" aria-live="polite">
                  <FaCheckCircle aria-hidden="true" />
                  Last saved at {formatClockTime(lastSavedAt)}
                </span>
              )}
            </div>

            <div className="exam-schedule-actions-right">
              {showPublishButton && (
                <button
                  type="button"
                  className="exam-schedule-btn-warning"
                  onClick={handlePublishClick}
                  disabled={
                    saving ||
                    publishing ||
                    totalSubjects === 0 ||
                    blockingRows.length > 0
                  }
                  aria-busy={publishing ? "true" : "false"}
                  title={
                    publishIncomplete
                      ? "Complete the timetable for all subjects before publishing."
                      : "Publish this timetable"
                  }
                >
                  {publishing ? (
                    <>
                      <FaSpinner
                        className="exam-schedule-spin"
                        aria-hidden="true"
                      />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FaBullhorn aria-hidden="true" />
                      Publish
                    </>
                  )}
                </button>
              )}

              {showSaveButton && (
                <button
                  type="button"
                  className="exam-schedule-btn-primary"
                  onClick={handleSave}
                  disabled={
                    saving || publishing || totalSubjects === 0
                  }
                  aria-busy={saving ? "true" : "false"}
                >
                  {saving ? (
                    <>
                      <FaSpinner
                        className="exam-schedule-spin"
                        aria-hidden="true"
                      />
                      {savingLabel}
                    </>
                  ) : (
                    <>
                      <FaSave aria-hidden="true" />
                      {saveButtonLabel}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function renderStatusPill(status, hasSchedule) {
  if (status === "PUBLISHED") {
    return (
      <span className="exam-schedule-pill success">
        <span className="exam-schedule-pill-dot" />
        Published
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="exam-schedule-pill warning">
        <span className="exam-schedule-pill-dot" />
        Draft
      </span>
    );
  }
  if (!hasSchedule) {
    return (
      <span className="exam-schedule-pill slate">
        <span className="exam-schedule-pill-dot" />
        Not scheduled
      </span>
    );
  }
  return (
    <span className="exam-schedule-pill slate">
      <span className="exam-schedule-pill-dot" />
      —
    </span>
  );
}