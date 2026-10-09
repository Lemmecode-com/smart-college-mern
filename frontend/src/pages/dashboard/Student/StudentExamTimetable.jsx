import { useContext, useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getPublishedExams } from "../../../api/exam";
import { getPublishedExamSchedule } from "../../../api/examSchedule";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import PublishedExamTimetable from "../../../components/PublishedExamTimetable";
import {
  FaCalendarAlt,
  FaArrowLeft,
  FaSyncAlt,
  FaExclamationTriangle,
  FaBook,
} from "react-icons/fa";

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

export default function StudentExamTimetable() {
  const { user } = useContext(AuthContext);

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [statusCode, setStatusCode] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const breadcrumbItems = [
    { label: "Home", path: "/student/dashboard" },
    { label: "Exam Timetable", icon: FaCalendarAlt },
  ];

  const fetchExams = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setStatusCode(null);
      if (isRetry) setIsRetrying(true);

      const data = await getPublishedExams();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      const code = err?.response?.data?.error?.code || err?.code;
      const status = err?.response?.status;
      setErrorCode(code);
      setStatusCode(status);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to fetch exam timetable",
      );
      logger.error("StudentExamTimetable fetch error", { error: err });
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  const handleViewTimetable = async (exam) => {
    try {
      setScheduleLoading(true);
      setScheduleError(null);
      setSelectedExam(exam);

      const data = await getPublishedExamSchedule(exam._id);
      setSchedule(data);
    } catch (err) {
      const code = err?.response?.data?.error?.code || err?.code;
      const status = err?.response?.status;
      setScheduleError({
        message:
          err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to fetch exam schedule",
        code,
        status,
      });
      setSchedule(null);
      logger.error("StudentExamTimetable schedule fetch error", {
        error: err,
        examId: exam._id,
      });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExam(null);
    setSchedule(null);
    setScheduleError(null);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchExams(true);
  };

  useEffect(() => {
    if (user && user.role === "STUDENT") {
      fetchExams();
    }
  }, [user, fetchExams]);

  // Auth Protection (rendered after all hooks have been declared)
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

  // Loading State
  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading size="md" color="primary" text="Loading Exam Timetable..." />
        </div>
      </div>
    );
  }

  // Error State (List View)
  if (error && !selectedExam) {
    const isAuthError = AUTH_ERROR_CODES.has(errorCode);
    if (isAuthError) {
      return (
        <div className="student-exam-timetable-page">
          <ApiError
            title="Session Expired"
            message="Please sign in again to continue."
            errorCode={errorCode}
            statusCode={statusCode}
          />
        </div>
      );
    }

    return (
      <div className="student-exam-timetable-page">
        <div className="student-exam-timetable-header">
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <div className="student-exam-timetable-error">
          <ApiError
            title="Loading Error"
            message={error}
            errorCode={errorCode}
            statusCode={statusCode}
            onRetry={handleRetry}
            retryCount={retryCount}
            maxRetry={3}
            isRetryLoading={isRetrying}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="student-exam-timetable-page">
      <div className="student-exam-timetable-header">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <div className="student-exam-timetable-content">
        {!selectedExam ? (
          <>
            <PageHeader
              icon={FaCalendarAlt}
              title="Published Exam Timetable"
              subtitle="View your upcoming and past examination schedules below."
              actions={
                <button
                  type="button"
                  className="student-exam-timetable-refresh-btn"
                  onClick={() => fetchExams(true)}
                  disabled={isRetrying}
                >
                  <FaSyncAlt className={isRetrying ? "fa-spin" : ""} aria-hidden="true" />
                  <span>{isRetrying ? "Refreshing..." : "Refresh"}</span>
                </button>
              }
            />

            <PublishedExamTimetable exams={exams} onExamClick={handleViewTimetable} />
          </>
        ) : (
          <div className="student-exam-timetable-detail">
            <button
              type="button"
              className="student-exam-timetable-back"
              onClick={handleBackToList}
            >
              <FaArrowLeft aria-hidden="true" /> Back to Exams
            </button>

            {scheduleLoading && (
              <Loading size="md" color="primary" text="Loading Exam Schedule..." />
            )}

            {scheduleError && !scheduleLoading && (
              <div className="student-exam-timetable-schedule-error">
                <FaExclamationTriangle
                  className="student-exam-timetable-error-icon"
                  aria-hidden="true"
                />
                <p>{scheduleError.message}</p>
                <button
                  type="button"
                  className="student-exam-timetable-retry"
                  onClick={() => handleViewTimetable(selectedExam)}
                >
                  Retry
                </button>
              </div>
            )}

            {!scheduleLoading && !scheduleError && schedule && (
              <PublishedExamTimetable exams={[schedule]} />
            )}

            {!scheduleLoading && !scheduleError && !schedule && (
              <div className="student-exam-timetable-no-schedule">
                <FaBook aria-hidden="true" />
                <p>No published schedule found for this exam.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .student-exam-timetable-page {
          padding: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .student-exam-timetable-header {
          margin-bottom: 1.25rem;
        }

        .student-exam-timetable-content {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .student-exam-timetable-refresh-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .student-exam-timetable-refresh-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .student-exam-timetable-refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .student-exam-timetable-error {
          margin-top: 2rem;
        }

        .student-exam-timetable-detail {
          animation: fadeIn 0.3s ease-out;
        }

        .student-exam-timetable-back {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 1.05rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #1e293b;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.1rem;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        }

        .student-exam-timetable-back:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateX(-2px);
        }

        .student-exam-timetable-schedule-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #991b1b;
          font-size: 0.95rem;
        }

        .student-exam-timetable-error-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .student-exam-timetable-retry {
          margin-left: auto;
          padding: 0.4rem 0.9rem;
          border-radius: 8px;
          border: 1px solid #fecaca;
          background: #fff;
          color: #991b1b;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .student-exam-timetable-retry:hover {
          background: #fef2f2;
        }

        .student-exam-timetable-no-schedule {
          text-align: center;
          padding: 2.5rem 1.5rem;
          color: #64748b;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .student-exam-timetable-no-schedule svg {
          font-size: 2rem;
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .student-exam-timetable-page {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
