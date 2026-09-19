import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSave,
  FaFileAlt,
  FaUsers,
  FaBookOpen,
  FaLayerGroup,
  FaGraduationCap,
} from "react-icons/fa";
import { getExamById } from "../../../api/exam";
import {
  getExamSchedule,
  publishExamSchedule,
  updateExamSchedule,
} from "../../../api/examSchedule";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import ConfirmModal from "../../../components/ConfirmModal";
import ExamTimetableTable from "../../../components/ExamTimetableTable";
import Loading from "../../../components/Loading";
import { logger } from "../../../utils/logger";
import "./CreateExam.css";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
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

const pageStyles = `
  .exam-timetable-page {
    background: linear-gradient(135deg, #f4f9fd 0%, #eaf5fc 100%);
    min-height: 100%;
    color: #06192c;
  }

  /* ================= HEADER ================= */

  .exam-timetable-page .exam-timetable-header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #eaf7ff 0%,
    #dff2fb 50%,
    #d4edf7 100%
  );
  border-radius: 16px;
  padding: 1.5rem 1.6rem;
  margin-bottom: 1rem;
  border: 1px solid #d5e8f2;
  box-shadow: 0 6px 20px rgba(12, 43, 71, 0.05);
}

  .exam-timetable-page .exam-timetable-header::after {
  content: "";
  position: absolute;
  width: 360px;
  height: 360px;
  right: -100px;
  top: -220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

  .exam-timetable-page .exam-timetable-header-row {
    position: relative;
    z-index: 1;
    align-items: center;
    gap: 1rem;
  }

  .exam-timetable-page .exam-timetable-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: #12304a;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
}

.exam-timetable-page .exam-timetable-title svg {
  color: #0e93ab;
  background: #ffffff;
  padding: 0.65rem;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(14, 147, 171, 0.1);
}

  .exam-timetable-page .exam-timetable-subtitle {
    color: #365a7c;
    margin: 0.35rem 0 0 3.9rem;
    font-size: 1rem;
  }

  /* ================= META CARDS ================= */

  .exam-timetable-page .exam-timetable-meta {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .exam-timetable-page .exam-timetable-meta-item {
    background: #fff;
    border: 1px solid #dce7ef;
    border-radius: 12px;
    padding: 0.9rem;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 4px 14px rgba(12, 43, 71, 0.04);
  }

  .exam-timetable-page .exam-timetable-meta-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 11px;
    background: #eaf4ff;
    color: #0875ee;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
  }

  .exam-timetable-page .exam-timetable-meta-content {
    min-width: 0;
  }

  .exam-timetable-page .exam-timetable-meta-label {
    display: block;
    color: #8293a7;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .exam-timetable-page .exam-timetable-meta-value {
    display: block;
    color: #17253a;
    font-weight: 650;
    font-size: 0.92rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  /* ================= STATUS ================= */

  .exam-timetable-page .exam-timetable-status {
     align-items: center;
  display: flex;
  gap: 0.7rem;
  margin-bottom: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #effaf5;
  color: #183b2d;
  border: 1px solid #cfeee0;
  box-shadow: 0 3px 10px rgba(12, 43, 71, 0.03);
  }

  .exam-timetable-page .exam-timetable-status svg {
    color: #159765;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .exam-timetable-page .exam-timetable-status strong {
    color: #167653;
    font-size: 0.9rem;
    font-weight: 700;
  }

  /* ================= RESPONSIVE ================= */

  @media (max-width: 1100px) {
    .exam-timetable-page .exam-timetable-meta {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .exam-timetable-page .exam-timetable-meta {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .exam-timetable-page .exam-timetable-title {
      font-size: 1.7rem;
    }

    .exam-timetable-page .exam-timetable-header {
      padding: 1.4rem;
    }
  }

  @media (max-width: 576px) {
    .exam-timetable-page {
      padding: 0.75rem !important;
    }

    .exam-timetable-page .exam-timetable-header {
      padding: 1.1rem;
      border-radius: 14px;
    }

    .exam-timetable-page .exam-timetable-header-row {
      flex-direction: column;
      align-items: stretch;
    }

    .exam-timetable-page .exam-timetable-title {
      font-size: 1.4rem;
      gap: 0.65rem;
    }

    .exam-timetable-page .exam-timetable-title svg {
      width: 44px;
      height: 44px;
      padding: 0.5rem;
    }

    .exam-timetable-page .exam-timetable-subtitle {
      margin-left: 0;
      margin-top: 0.5rem;
      font-size: 0.88rem;
      line-height: 1.4;
    }

    .exam-timetable-page .exam-timetable-meta {
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }

    .exam-timetable-page .exam-timetable-meta-item {
      padding: 0.75rem;
    }

    .exam-timetable-page .exam-timetable-status {
      align-items: flex-start;
      flex-wrap: wrap;
      font-size: 0.88rem;
    }
  }
`;
const getErrorDetails = (error, fallback) => ({
  statusCode: error?.response?.status,
  errorCode: error?.response?.data?.code,
  message: error?.response?.data?.message || fallback,
});

const isScheduleMissing = (error) =>
  error?.response?.status === 404 ||
  error?.response?.data?.code === "SCHEDULE_NOT_FOUND";

const getSubjectId = (subject) => {
  const value = subject?.subject || subject;
  return value?._id || value;
};

const normalizeRows = (scheduleSubjects, examSubjects) => {
  const subjectDetails = new Map(
    (examSubjects || []).map((entry) => {
      const subject = entry?.subject?._id ? entry.subject : entry;
      const id = getSubjectId(entry);
      return [String(id), subject];
    }),
  );

  return (scheduleSubjects || []).map((row) => {
    const rowSubject = row.subject;
    const subjectId = getSubjectId(rowSubject);
    const subject =
      (rowSubject && typeof rowSubject === "object" && rowSubject) ||
      subjectDetails.get(String(subjectId)) ||
      {};

    return {
      ...row,
      subject: subjectId,
      subjectName: row.subjectName || subject.name || "Subject",
      subjectCode: row.subjectCode || subject.code || "",
      subjectType: row.subjectType || subject.subjectType || "",
    };
  });
};

const toSchedulePayload = (rows) => ({
  subjects: rows.map((row) => ({
    subject: getSubjectId(row.subject),
    examDate: row.examDate || undefined,
    startTime: row.startTime || undefined,
    endTime: row.endTime || undefined,
    session: row.session || undefined,
    room: row.room || undefined,
  })),
});

const validateRowsForSave = (rows) => {
  const errors = new Map();

  rows.forEach((row) => {
    const hasStart = Boolean(row.startTime);
    const hasEnd = Boolean(row.endTime);
    if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
      errors.set(row.subject, {
        startTime: hasStart ? undefined : "Start time is required.",
        endTime: hasEnd ? undefined : "End time is required.",
        message: "Start and end time are both required.",
      });
      return;
    }

    if (hasStart && hasEnd) {
      const start = TIME_REGEX.exec(row.startTime);
      const end = TIME_REGEX.exec(row.endTime);
      const startMinutes = start
        ? Number(start[1]) * 60 + Number(start[2])
        : null;
      const endMinutes = end ? Number(end[1]) * 60 + Number(end[2]) : null;
      if (
        startMinutes !== null &&
        endMinutes !== null &&
        startMinutes >= endMinutes
      ) {
        errors.set(row.subject, {
          startTime: "Start time must be earlier than end time.",
          endTime: "End time must be later than start time.",
          message: "Start time must be earlier than end time.",
        });
      }
    }
  });

  return errors;
};

const getDisplayValue = (value) => {
  if (!value) return "N/A";
  if (typeof value === "object") return value.name || value.code || "N/A";
  return value;
};

export default function ExamTimetable() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);
  const [validationErrors, setValidationErrors] = useState(new Map());
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const loadPage = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    setScheduleError(null);

    try {
      const examResponse = await getExamById(examId);
      const examData = examResponse?.exam || examResponse;
      setExam(examData);

      try {
        const scheduleResponse = await getExamSchedule(examId);
        const scheduleData = scheduleResponse?.schedule || scheduleResponse;
        setSchedule(scheduleData || null);
        setRows(normalizeRows(scheduleData?.subjects, examData?.subjects));
      } catch (scheduleFetchError) {
        if (isScheduleMissing(scheduleFetchError)) {
          setSchedule(null);
          setRows([]);
        } else {
          setScheduleError(
            getErrorDetails(scheduleFetchError, "Failed to load timetable."),
          );
        }
      }
    } catch (examFetchError) {
      const details = getErrorDetails(
        examFetchError,
        "Failed to load exam details.",
      );
      setError(details);
      logger.error("Error loading exam timetable page:", details);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    let isCancelled = false;
    if (!examId) {
      setLoading(false);
      setError({ message: "An exam ID is required to load this timetable." });
      return undefined;
    }

    const run = async () => {
      if (!isCancelled) await loadPage();
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [examId, loadPage]);

  const readOnly = schedule?.status === "PUBLISHED";
  const scheduleStatus = schedule?.status || "NONE";
  const scheduleLabel =
    scheduleStatus === "PUBLISHED"
      ? "Published"
      : scheduleStatus === "DRAFT"
        ? "Draft"
        : "No Timetable";
  const course = exam?.course_id;
  const department = course?.department_id;

  const handleRowChange = (subjectId, field, value) => {
    if (readOnly) return;
    setRows((currentRows) =>
      currentRows.map((row) =>
        String(row.subject) === String(subjectId)
          ? { ...row, [field]: value }
          : row,
      ),
    );
    setValidationErrors((currentErrors) => {
      if (!currentErrors.has(subjectId)) return currentErrors;
      const next = new Map(currentErrors);
      next.delete(subjectId);
      return next;
    });
  };

  const handleSaveDraft = async () => {
    const rowErrors = validateRowsForSave(rows);
    if (rowErrors.size > 0) {
      setValidationErrors(rowErrors);
      toast.error(Array.from(rowErrors.values())[0].message);
      return;
    }

    setSaving(true);
    try {
      const response = await updateExamSchedule(
        examId,
        toSchedulePayload(rows),
      );
      const updatedSchedule = response?.schedule || response;
      setSchedule((current) => ({
        ...current,
        ...updatedSchedule,
        status: "DRAFT",
      }));
      toast.success("Timetable draft saved successfully.");
      setStatusAnnouncement("Timetable draft saved successfully.");
    } catch (saveError) {
      const details = getErrorDetails(
        saveError,
        "Failed to save timetable draft.",
      );
      toast.error(details.message);
      logger.error(
        "Error saving exam timetable:",
        details.statusCode,
        details.errorCode,
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setShowPublishConfirm(false);
    setSaving(true);
    try {
      const response = await publishExamSchedule(examId);
      const publishedSchedule = response?.schedule || response;
      setSchedule((current) => ({
        ...current,
        ...publishedSchedule,
        status: "PUBLISHED",
      }));
      toast.success("Timetable published successfully.");
      setStatusAnnouncement(
        "Timetable published successfully and is now read-only.",
      );
    } catch (publishError) {
      const details = getErrorDetails(
        publishError,
        "Failed to publish timetable.",
      );
      toast.error(details.message);
      logger.error(
        "Error publishing exam timetable:",
        details.statusCode,
        details.errorCode,
      );
    } finally {
      setSaving(false);
    }
  };

  const examInfo = useMemo(
  () => [
    {
      label: "Exam Name",
      value: exam?.name,
      icon: <FaFileAlt />,
    },
    {
      label: "Department",
      value: department?.name,
      icon: <FaUsers />,
    },
    {
      label: "Course",
      value: course?.name,
      icon: <FaBookOpen />,
    },
    {
      label: "Semester",
      value: exam?.semester,
      icon: <FaLayerGroup />,
    },
    {
      label: "Academic Year",
      value: exam?.academicYear,
      icon: <FaGraduationCap />,
    },
  ],
    [
      course?.name,
      department?.name,
      exam?.academicYear,
      exam?.name,
      exam?.semester,
    ],
  );

  if (loading) return <Loading message="Loading exam timetable..." />;

  if (error) {
    if (AUTH_ERROR_CODES.has(error.errorCode) || error.statusCode === 401) {
      return (
        <ApiError
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          message={error.message}
        />
      );
    }
    return (
      <div className="exam-timetable-page container-fluid p-4">
        <style>{pageStyles}</style>
        <div className="exam-timetable-error alert-edx alert-edx-danger">
          <FaExclamationTriangle />
          <span>{error.message || "Exam not found."}</span>
        </div>
        <button
          type="button"
          className="btn-edx-outline"
          onClick={() => navigate("/dashboard/exam/list")}
        >
          <FaArrowLeft />
          Back to Exam List
        </button>
      </div>
    );
  }

  return (
    <div className="exam-timetable-page exam-form container-fluid p-4">
      <style>{pageStyles}</style>
      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Exam List", path: "/dashboard/exam/list" },
          { label: "Exam Timetable" },
        ]}
      />

      <div className="exam-timetable-header create-exam-page-header">
        <div className="exam-timetable-header-row d-flex justify-content-between">
          <div>
            <h1 className="exam-timetable-title create-exam-title">
              <FaCalendarAlt aria-hidden="true" />
              Exam Timetable
            </h1>
            <p className="exam-timetable-subtitle">
              Manage the subject-wise schedule for {getDisplayValue(exam?.name)}
              .
            </p>
          </div>
          <button
            type="button"
            className="btn-edx-outline"
            onClick={() => navigate("/dashboard/exam/list")}
          >
            <FaArrowLeft />
            Back to Exam List
          </button>
        </div>
      </div>

      <div className="exam-timetable-meta">
  {examInfo.map(({ label, value, icon }) => (
    <div className="exam-timetable-meta-item" key={label}>
      <div className="exam-timetable-meta-icon">
        {icon}
      </div>

      <div className="exam-timetable-meta-content">
        <span className="exam-timetable-meta-label">
          {label}
        </span>

        <span className="exam-timetable-meta-value">
          {getDisplayValue(value)}
        </span>
      </div>
    </div>
  ))}
</div>

      <div className="exam-timetable-status" role="status">
        {readOnly ? (
          <FaCheckCircle aria-hidden="true" />
        ) : (
          <FaExclamationTriangle aria-hidden="true" />
        )}
        <strong>{scheduleLabel}</strong>
        {exam?.status && <span>Exam status: {exam.status}</span>}
      </div>

      {scheduleError ? (
        <div className="alert-edx alert-edx-danger" role="alert">
          <FaExclamationTriangle />
          <span>{scheduleError.message}</span>
          <button type="button" className="btn-edx-outline" onClick={loadPage}>
            Retry
          </button>
        </div>
      ) : !schedule ? (
        <div className="exam-timetable-empty" role="status">
          <div className="exam-timetable-empty-icon">
            <FaExclamationTriangle aria-hidden="true" />
          </div>
          <h2>No Timetable Created</h2>
          <p>
            This exam does not have a timetable yet. Create one through the
            existing exam creation workflow before managing it here.
          </p>
        </div>
      ) : (
        <>
          <ExamTimetableTable
            rows={rows}
            readOnly={readOnly}
            onRowChange={handleRowChange}
            validationErrors={validationErrors}
            statusAnnouncement={statusAnnouncement}
          />

          {!readOnly && schedule.status === "DRAFT" && (
            <div className="exam-timetable-actions">
              <button
                type="button"
                className="btn-edx-draft"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                <FaSave />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="btn-edx-publish"
                onClick={() => setShowPublishConfirm(true)}
                disabled={saving}
              >
                <FaCheckCircle />
                Publish
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublish}
        title="Publish Timetable"
        message="Publish this timetable? The published timetable will become read-only."
        type="success"
        confirmText="Publish Timetable"
        isLoading={saving}
      />
    </div>
  );
}
