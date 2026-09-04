import { useContext, useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import { getPublishedExams } from "../../../api/exam";
import { getPublishedExamSchedule } from "../../../api/examSchedule";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Breadcrumb from "../../../components/Breadcrumb";
import PublishedExamTimetable from "../../../components/PublishedExamTimetable";
import {
  FaCalendarAlt,
  FaArrowLeft,
  FaSyncAlt,
  FaExclamationTriangle,
  FaBook,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d" },
  success: { main: "#28a745" },
  danger: { main: "#dc3545" },
  warning: { main: "#ffc107" },
  info: { main: "#17a2b8" },
  secondary: { main: "#6c757d" },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: "easeOut" },
  }),
};

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
  const navigate = useNavigate();

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

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

  const breadcrumbItems = [
    { label: "Home", path: "/student/dashboard" },
    { label: "Exam Timetable", icon: FaCalendarAlt },
  ];

  const fetchExams = async (isRetry = false) => {
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
      setError(err?.response?.data?.error?.message || err?.message || "Failed to fetch exam timetable");
      logger.error("StudentExamTimetable fetch error", { error: err });
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

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
        message: err?.response?.data?.error?.message || err?.message || "Failed to fetch exam schedule",
        code,
        status,
      });
      setSchedule(null);
      logger.error("StudentExamTimetable schedule fetch error", { error: err, examId: exam._id });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExam(null);
    setSchedule(null);
    setScheduleError(null);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchExams(true);
  };

  if (loading) {
    return <Loading fullScreen text="Loading exam timetable..." />;
  }

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="student-exam-timetable-content"
      >
        {!selectedExam ? (
          <>
            <div className="student-exam-timetable-title-row">
              <div>
                <h2 className="student-exam-timetable-title">Published Exam Timetable</h2>
                <p className="student-exam-timetable-subtitle">
                  View your published exam schedules below.
                </p>
              </div>
            </div>

            <PublishedExamTimetable exams={exams} onExamClick={handleViewTimetable} />
          </>
        ) : (
          <div className="student-exam-timetable-detail">
            <div className="student-exam-timetable-detail-header">
              <button
                type="button"
                className="student-exam-timetable-back"
                onClick={handleBackToList}
              >
                <FaArrowLeft /> Back to Exams
              </button>
              <h3 className="student-exam-timetable-detail-title">
                {selectedExam.name || "Exam Timetable"}
              </h3>
              <p className="student-exam-timetable-detail-subtitle">
                {selectedExam.course_id?.name || "N/A"} ({selectedExam.course_id?.code || "N/A"}) •
                Semester {selectedExam.semester ?? "N/A"} • {selectedExam.academicYear || "N/A"}
              </p>
            </div>

            {scheduleLoading && <Loading text="Loading schedule..." />}

            {scheduleError && !scheduleLoading && (
              <div className="student-exam-timetable-schedule-error">
                <FaExclamationTriangle className="student-exam-timetable-error-icon" />
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
                <FaBook />
                <p>No published schedule found for this exam.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

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
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .student-exam-timetable-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .student-exam-timetable-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .student-exam-timetable-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0.25rem 0 0;
        }

        .student-exam-timetable-error {
          margin-top: 2rem;
        }

        .student-exam-timetable-detail {
          animation: fadeIn 0.35s ease-out;
        }

        .student-exam-timetable-detail-header {
          margin-bottom: 1.25rem;
        }

        .student-exam-timetable-back {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 0.75rem;
        }

        .student-exam-timetable-back:hover {
          background: #f8f9fa;
          border-color: #cbd5e1;
        }

        .student-exam-timetable-detail-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .student-exam-timetable-detail-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0.25rem 0 0;
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
          padding: 2rem;
          color: #64748b;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #eef2f6;
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

          .student-exam-timetable-title {
            font-size: 1.15rem;
          }

          .student-exam-timetable-title-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
