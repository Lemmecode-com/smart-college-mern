import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { getMyResults, getMyConsolidatedResult } from "../../../api/results";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaFileAlt,
  FaSyncAlt,
  FaExclamationTriangle,
  FaGraduationCap,
  FaEye,
  FaDownload,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaLayerGroup,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaAward,
  FaClipboardList,
  FaStar,
  FaBook,
  FaInfoCircle,
  FaTrophy,
  FaCalendarAlt,
  FaCalculator,
  FaPercentage,
  FaRedoAlt,
} from "react-icons/fa";

// CSS Stylesheet
import "./StudentResults.css";

// Subcomponents (Modals & Cards)
import YearSemesterResultCards from "./components/results/YearSemesterResultCards";
import ResultStatementModal from "./components/results/ResultStatementModal";
import ConsolidatedStatementModal from "./components/results/ConsolidatedStatementModal";

// Formatters & Utilities
import {
  groupBacklogsBySubject,
  formatMark,
  formatMarksRatio,
  formatSubjectType,
  getResultStatusLabel,
  getResultStatusTone,
  calculateBacklogSummary,
  calculateCumulativeSummary,
  formatPercentage,
} from "../../../utils/resultFormatters.util";
import { formatDate } from "../../../utils/format";
import {
  deriveAcademicYearsForCourse,
  groupSemestersByYear,
  mapResultToStatement,
} from "../../../utils/resultStatementDataMapper";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
  "STUDENT_NOT_FOUND",
]);

export default function StudentResults() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const loadTimeoutRef = useRef(null);

  const [results, setResults] = useState([]);
  const [allBacklogResults, setAllBacklogResults] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const userSelectedYearRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Consolidated Course Result State
  const [consolidatedResult, setConsolidatedResult] = useState(null);
  const [consolidatedLoading, setConsolidatedLoading] = useState(true);
  const [consolidatedError, setConsolidatedError] = useState(null);

  // Statement Preview Modal State (Single Semester)
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeStatementData, setActiveStatementData] = useState(null);

  // Final Consolidated Statement Modal State (Full Course)
  const [finalStatementModalOpen, setFinalStatementModalOpen] = useState(false);
  const [finalStatementAutoDownload, setFinalStatementAutoDownload] = useState(false);

  // Authoritative course configuration from profile or published results
  const courseConfig = useMemo(() => {
    return (
      studentProfile?.course ||
      studentProfile?.student?.course_id ||
      results[0]?.course_id ||
      null
    );
  }, [studentProfile, results]);

  // Dynamically derived academic year filters matching the course duration
  const academicYears = useMemo(() => {
    return deriveAcademicYearsForCourse(courseConfig, results);
  }, [courseConfig, results]);

  // Derived in-memory models (called unconditionally at top of component)
  const groupedYears = useMemo(
    () => groupSemestersByYear(results, courseConfig),
    [results, courseConfig]
  );

  // Latest academic/curriculum year that contains at least one published semester result
  const latestPublishedYear = useMemo(() => {
    if (!Array.isArray(groupedYears) || groupedYears.length === 0) {
      return academicYears[0]?.yearNumber || 1;
    }
    const yearsWithResults = groupedYears
      .filter((g) => Array.isArray(g.semesters) && g.semesters.length > 0)
      .map((g) => g.yearNumber);

    return yearsWithResults.length > 0
      ? Math.max(...yearsWithResults)
      : academicYears[0]?.yearNumber || 1;
  }, [groupedYears, academicYears]);

  // Synchronize default selected year with latest published year when results load
  useEffect(() => {
    const validYearNumbers = new Set(academicYears.map((y) => y.yearNumber));
    if (!userSelectedYearRef.current) {
      setSelectedYear(latestPublishedYear);
    } else if (selectedYear !== null && !validYearNumbers.has(selectedYear)) {
      setSelectedYear(latestPublishedYear);
    }
  }, [latestPublishedYear, selectedYear, academicYears]);

  // Effective active year (fallback to latestPublishedYear if not explicitly set)
  const currentSelectedYear = selectedYear ?? latestPublishedYear;

  const handleSelectYear = (yearNumber) => {
    userSelectedYearRef.current = true;
    setSelectedYear(yearNumber);
  };

  const selectedYearObj = useMemo(
    () => academicYears.find((y) => y.yearNumber === currentSelectedYear),
    [academicYears, currentSelectedYear]
  );
  const selectedYearLabel = selectedYearObj ? selectedYearObj.label : `Year ${currentSelectedYear}`;

  const selectedYearGroup = useMemo(() => {
    return (
      groupedYears.find((g) => Number(g.yearNumber) === Number(currentSelectedYear)) || null
    );
  }, [groupedYears, currentSelectedYear]);

  const hasSelectedYearResults = Boolean(
    selectedYearGroup &&
      Array.isArray(selectedYearGroup.semesters) &&
      selectedYearGroup.semesters.length > 0
  );

  const groupedBacklogs = useMemo(
    () => groupBacklogsBySubject(allBacklogResults),
    [allBacklogResults]
  );

  // Fetch student published results and profile metadata
  useEffect(() => {
    if (!user || user.role !== "STUDENT") {
      setLoading(false);
      return;
    }

    let isMounted = true;

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      logger.warn("Student results request timed out", {
        page: "StudentResults",
        role: user?.role,
      });
      setError({
        message: "Request timed out. Please check your connection and try again.",
        statusCode: 408,
        errorCode: undefined,
      });
      setLoading(false);
    }, 30000);

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        setConsolidatedLoading(true);
        setConsolidatedError(null);

        // Concurrently fetch authoritative results, student profile metadata, and consolidated status
        const [resultsRes, profileRes, consolidatedRes] = await Promise.allSettled([
          getMyResults(),
          api.get("/students/my-profile"),
          getMyConsolidatedResult(),
        ]);

        if (!isMounted) return;

        if (resultsRes.status === "fulfilled") {
          const data = resultsRes.value;
          const regularResults = Array.isArray(data)
            ? data
            : (data?.data || data?.regularResults || []);

          const rawBacklogs = Array.isArray(data?.backlogResults)
            ? data.backlogResults
            : Array.isArray(data?.data?.backlogResults)
              ? data.data.backlogResults
              : regularResults.flatMap((r) => r.backlogResults || []);

          setResults(regularResults);
          setAllBacklogResults(rawBacklogs);
        } else {
          throw resultsRes.reason;
        }

        if (profileRes.status === "fulfilled" && profileRes.value?.data) {
          setStudentProfile(profileRes.value.data);
        }

        // Handle consolidated result evaluation (non-fatal if it fails)
        if (consolidatedRes.status === "fulfilled") {
          const cData = consolidatedRes.value?.data ?? consolidatedRes.value;
          setConsolidatedResult(cData);
          setConsolidatedError(null);
        } else {
          const cErr = consolidatedRes.reason;
          logger.warn("Consolidated academic result load failed (non-fatal):", {
            statusCode: cErr?.response?.status,
            errorCode: cErr?.response?.data?.code || cErr?.response?.data?.error?.code,
            message: cErr?.message,
          });
          setConsolidatedError({
            message:
              cErr?.response?.data?.message ||
              cErr?.message ||
              "Failed to load consolidated academic result.",
            statusCode: cErr?.response?.status,
            errorCode: cErr?.response?.data?.code || cErr?.response?.data?.error?.code,
          });
          setConsolidatedResult(null);
        }
        setConsolidatedLoading(false);

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      } catch (err) {
        if (!isMounted) return;
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Student results load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "StudentResults",
          role: user?.role,
        });

        if (AUTH_ERROR_CODES.has(errorCode)) {
          return;
        }

        setError({
          message:
            backendMessage ||
            "Failed to load your examination results. Please try again later.",
          statusCode,
          errorCode,
        });

        toast.error("Failed to load results. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [retryCount, user]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleRetryConsolidated = async () => {
    try {
      setConsolidatedLoading(true);
      setConsolidatedError(null);
      const res = await getMyConsolidatedResult();
      const cData = res?.data ?? res;
      setConsolidatedResult(cData);
    } catch (err) {
      logger.warn("Consolidated result retry failed:", err);
      setConsolidatedError({
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load consolidated academic result.",
        statusCode: err?.response?.status,
        errorCode: err?.response?.data?.code || err?.response?.data?.error?.code,
      });
    } finally {
      setConsolidatedLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

  // Preview Result handler: maps data to marksheet format and opens modal
  const handlePreviewResult = (semesterResult) => {
    const statement = mapResultToStatement(semesterResult, studentProfile, user);
    setActiveStatementData(statement);
    setPreviewModalOpen(true);
  };

  // Download PDF handler: opens modal with statement to trigger A4 generation
  const handleDownloadPdf = (semesterResult) => {
    const statement = mapResultToStatement(semesterResult, studentProfile, user);
    setActiveStatementData(statement);
    setPreviewModalOpen(true);
  };

  // Final Consolidated Statement Handlers
  const handlePreviewFinalResult = () => {
    setFinalStatementAutoDownload(false);
    setFinalStatementModalOpen(true);
  };

  const handleDownloadFinalPdf = () => {
    setFinalStatementAutoDownload(true);
    setFinalStatementModalOpen(true);
  };

  const finalStatementData = useMemo(() => {
    if (!consolidatedResult) return null;
    const cData = consolidatedResult?.data || consolidatedResult;
    const collegeData = studentProfile?.college || results[0]?.college_id || {};

    return {
      student: {
        name: cData.student?.fullName || studentProfile?.student?.fullName || user?.name || "Student",
        enrollmentNumber: cData.student?.enrollmentNumber || studentProfile?.student?.enrollmentNumber || "—",
        motherName: cData.student?.motherName || studentProfile?.student?.motherName || "—",
        fatherName: cData.student?.fatherName || studentProfile?.student?.fatherName || "—",
        status: cData.student?.status || studentProfile?.student?.status,
      },
      college: {
        name: collegeData.name || "COLLEGE / INSTITUTION NAME",
        code: collegeData.code || "",
        logo: collegeData.logo || null,
        address: collegeData.address || "",
      },
      course: {
        name: cData.course?.name || courseConfig?.name || "Course",
        code: cData.course?.code || courseConfig?.code || "",
        durationYears: cData.course?.durationYears ?? courseConfig?.durationYears ?? null,
        durationSemesters: cData.course?.durationSemesters ?? courseConfig?.durationSemesters ?? null,
        programLevel: cData.course?.programLevel || courseConfig?.programLevel || "UG",
      },
      semesters: cData.semesters || [],
      clearedBacklogs: cData.clearedBacklogs || [],
      grandTotalMarks: cData.grandTotalMarks,
      grandTotalMaxMarks: cData.grandTotalMaxMarks,
      aggregatePercentage: cData.aggregatePercentage,
      summary: cData.summary || {
        grandTotalMarks: cData.grandTotalMarks,
        grandTotalMaxMarks: cData.grandTotalMaxMarks,
        aggregatePercentage: cData.aggregatePercentage,
        overallResult: cData.isEligible ? "PASS" : "INCOMPLETE",
      },
    };
  }, [consolidatedResult, studentProfile, results, courseConfig, user]);

  // Auth protection guard (rendered after all hooks have been declared)
  if (!user || user.role !== "STUDENT") {
    return null;
  }

  // Loading State
  if (loading) {
    return (
      <div className="student-results-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loading
          size="md"
          color="primary"
          text="Loading your results... Please wait while we retrieve your examination records."
        />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="student-results-page">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/student/dashboard" },
            { label: "My Results" },
          ]}
        />
        <ApiError
          title="Results Loading Error"
          message={error.message}
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          onRetry={handleRetry}
          onGoBack={handleGoBack}
          retryCount={retryCount}
          maxRetry={3}
        />
      </div>
    );
  }

  // Zero published results overall
  const hasNoResultsAtAll = results.length === 0 && allBacklogResults.length === 0;

  return (
    <div
      className="student-results-page"
      role="main"
      aria-label="My Results"
    >
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/student/dashboard" },
          { label: "My Results" },
        ]}
      />

      <PageHeader
        icon={FaFileAlt}
        title="My Results"
        subtitle="Academic Performance & Examination Records"
        actions={
          <div className="student-results-header-actions">
            <button
              type="button"
              className="student-results-refresh-btn"
              onClick={handleRetry}
              aria-label="Refresh examination results"
            >
              <FaSyncAlt aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Consolidated Academic Result & Course Completion Status Banner */}
      <ConsolidatedResultBanner
        data={consolidatedResult}
        loading={consolidatedLoading}
        error={consolidatedError}
        onPreview={handlePreviewFinalResult}
        onDownload={handleDownloadFinalPdf}
      />

      {/* Year Quick Filters */}
      <nav
        className="sr-year-quick-filters-wrapper sr-semester-selector-wrapper"
        aria-label="Filter results by academic year"
      >
        <span className="sr-semester-selector-label">
          <FaGraduationCap style={{ marginRight: "6px" }} aria-hidden="true" />
          Year:
        </span>
        <div className="sr-year-quick-filters-pills sr-semester-pills" role="tablist">
          {academicYears.map((year) => {
            const isSelected = currentSelectedYear === year.yearNumber;
            return (
              <button
                key={year.yearNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-pressed={isSelected}
                className={`sr-year-filter-btn sr-semester-pill ${
                  isSelected ? "active" : ""
                }`}
                onClick={() => handleSelectYear(year.yearNumber)}
              >
                <span>{year.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {hasNoResultsAtAll ? (
        <ResultsEmptyState
          type="no-published-results"
          onGoBack={handleGoBack}
        />
      ) : (
        <>
          {/* Selected Year Results */}
          <div className="sr-selected-year-container" aria-label={`${selectedYearLabel} Results`}>
            {hasSelectedYearResults ? (
              <YearSemesterResultCards
                groupedYears={groupedYears}
                selectedYear={currentSelectedYear}
                onPreview={handlePreviewResult}
                onDownload={handleDownloadPdf}
              />
            ) : (
              <ResultsEmptyState
                type="no-year-results"
                yearLabel={selectedYearLabel}
              />
            )}
          </div>

          {/* Backlog & Re-Examination Section */}
          <BacklogSection groupedBacklogs={groupedBacklogs} />

          {/* Statement of Marks Preview & PDF Download Modal (Single Semester) */}
          <ResultStatementModal
            isOpen={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            statementData={activeStatementData}
          />

          {/* Final Consolidated Marksheet Preview & PDF Download Modal (Full Course) */}
          <ConsolidatedStatementModal
            isOpen={finalStatementModalOpen}
            onClose={() => setFinalStatementModalOpen(false)}
            statementData={finalStatementData}
            autoDownload={finalStatementAutoDownload}
          />
        </>
      )}
    </div>
  );
}

/**
 * Concise status description for final consolidated action bar.
 */
const getConciseStatusHint = ({ isEligible, status, loading, error, activeBacklogsCount }) => {
  if (loading) return "Verifying academic completion...";
  if (error) return "Status unavailable";
  if (isEligible) return "Course Completed — Verified";

  switch (status) {
    case "UNKNOWN_ADMISSION_PATH":
      return "Admission verification required";
    case "ACTIVE_BACKLOGS":
      return `${activeBacklogsCount || 1} active backlog(s) pending clearance`;
    case "FAILED_SEMESTERS":
      return "Course requirements incomplete (Failed semester)";
    case "INCOMPLETE_SEMESTERS":
      return "Evaluation incomplete";
    case "UNPUBLISHED_SEMESTERS":
      return "Results awaiting publication";
    case "MISSING_SEMESTERS":
      return "Course in progress";
    case "AMBIGUOUS_RESULT":
      return "Conflicting result records detected";
    case "INELIGIBLE":
    default:
      return "Course requirements in progress";
  }
};

/**
 * Clean Final Consolidated Result Action Bar.
 */
export function ConsolidatedResultBanner({
  data = null,
  loading = false,
  error = null,
  onPreview,
  onDownload,
}) {
  const bannerData = data?.data || data;

  const isEligibleAuthoritative = Boolean(
    !loading &&
    !error &&
    bannerData &&
    bannerData.isEligible === true &&
    bannerData.status === "ELIGIBLE"
  );

  const statusHint = getConciseStatusHint({
    isEligible: isEligibleAuthoritative,
    status: bannerData?.status,
    loading,
    error,
    activeBacklogsCount: bannerData?.activeBacklogsCount,
  });

  const disabledTooltip = !isEligibleAuthoritative
    ? `Final result actions disabled: ${statusHint}`
    : "";

  return (
    <section
      className="crb-final-action-bar"
      aria-label="Final Consolidated Result Actions"
      data-testid="final-consolidated-result-section"
    >
      <div className="crb-final-info">
        <div className="crb-final-icon" aria-hidden="true">
          {loading ? (
            <FaSpinner className="fa-spin" />
          ) : (
            <FaGraduationCap />
          )}
        </div>
        <div className="crb-final-text">
          <div className="crb-final-title-group">
            <h3 className="crb-final-title">Final Consolidated Result</h3>
            <span
              className={`crb-final-status-badge ${
                isEligibleAuthoritative
                  ? "eligible"
                  : loading
                  ? "loading"
                  : "ineligible"
              }`}
            >
              {statusHint}
            </span>
          </div>
          <span className="crb-final-subtitle">
            {isEligibleAuthoritative
              ? "Authoritative full-course academic statement and marksheet."
              : "Final marksheet is issued upon completing all course semesters with 0 active backlogs."}
          </span>
        </div>
      </div>

      <div className="crb-final-buttons" role="group" aria-label="Final Result Actions">
        <button
          type="button"
          className="crb-action-button preview-btn"
          onClick={onPreview}
          disabled={!isEligibleAuthoritative}
          title={isEligibleAuthoritative ? "Preview Final Consolidated Marksheet" : disabledTooltip}
          aria-label="Preview Final Result"
          data-testid="preview-final-result-btn"
        >
          <FaEye aria-hidden="true" />
          <span>Preview Final Result</span>
        </button>

        <button
          type="button"
          className="crb-action-button download-btn"
          onClick={onDownload}
          disabled={!isEligibleAuthoritative}
          title={isEligibleAuthoritative ? "Download Final Consolidated PDF" : disabledTooltip}
          aria-label="Download Final Result PDF"
          data-testid="download-final-pdf-btn"
        >
          <FaDownload aria-hidden="true" />
          <span>Download PDF</span>
        </button>
      </div>
    </section>
  );
}

ConsolidatedResultBanner.propTypes = {
  data: PropTypes.shape({
    isEligible: PropTypes.bool,
    status: PropTypes.string,
    activeBacklogsCount: PropTypes.number,
    reasons: PropTypes.array,
    data: PropTypes.object,
  }),
  loading: PropTypes.bool,
  error: PropTypes.any,
  onPreview: PropTypes.func,
  onDownload: PropTypes.func,
};

/**
 * Student-friendly Empty State for results.
 */
export function ResultsEmptyState({
  type = "no-published-results",
  semesterNumber,
  yearLabel,
  onResetFilter,
  onGoBack,
}) {
  if (type === "no-year-results") {
    return (
      <div className="sr-empty-card" role="status">
        <div className="sr-empty-icon-wrap" aria-hidden="true">
          <FaGraduationCap />
        </div>
        <h3 className="sr-empty-title">
          No published results for {yearLabel || "this year"} yet.
        </h3>
        <p className="sr-empty-description">
          There are currently no published examination results available for {yearLabel || "this academic year"}. Once your results are officially approved and published, they will appear here.
        </p>
      </div>
    );
  }

  if (type === "no-semester-results") {
    return (
      <div className="sr-empty-card" role="status">
        <div className="sr-empty-icon-wrap" aria-hidden="true">
          <FaLayerGroup />
        </div>
        <h3 className="sr-empty-title">
          No Published Result for Semester {semesterNumber}
        </h3>
        <p className="sr-empty-description">
          There is currently no published examination result available for this specific semester.
        </p>
        {onResetFilter && (
          <button
            type="button"
            className="sr-empty-action-btn"
            onClick={onResetFilter}
          >
            <FaLayerGroup aria-hidden="true" /> View All Semesters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sr-empty-card" role="status">
      <div className="sr-empty-icon-wrap" aria-hidden="true">
        <FaFileAlt />
      </div>
      <h3 className="sr-empty-title">No Results Published Yet</h3>
      <p className="sr-empty-description">
        Your examination results haven't been published yet. Once your results are officially approved and published by the exam coordinator, they will appear here.
      </p>
      {onGoBack && (
        <button
          type="button"
          className="sr-empty-action-btn"
          onClick={onGoBack}
        >
          <FaArrowLeft aria-hidden="true" /> Back to Dashboard
        </button>
      )}
    </div>
  );
}

ResultsEmptyState.propTypes = {
  type: PropTypes.oneOf(["no-published-results", "no-semester-results", "no-year-results"]),
  semesterNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yearLabel: PropTypes.string,
  onResetFilter: PropTypes.func,
  onGoBack: PropTypes.func,
};

/**
 * Backlog & Re-Examination Section.
 */
export function BacklogSection({ groupedBacklogs = [] }) {
  const [expandedBacklogIds, setExpandedBacklogIds] = useState(() => new Set());

  const toggleExpand = (id) => {
    setExpandedBacklogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const summary = calculateBacklogSummary(groupedBacklogs);

  if (groupedBacklogs.length === 0) {
    return (
      <section className="sr-section-card sr-backlog-compact-card" aria-label="Backlog Examination Records">
        <div className="sr-backlog-compact-content">
          <div className="sr-backlog-compact-left">
            <div className="sr-backlog-compact-icon" aria-hidden="true">
              <FaCheckCircle />
            </div>
            <div>
              <h4 className="sr-backlog-compact-title">No Active Backlogs</h4>
              <p className="sr-backlog-compact-desc">
                Great! You currently don't have any backlog subjects in your available academic results.
              </p>
            </div>
          </div>
          <span className="sr-status-pill tone-success">
            <FaCheckCircle aria-hidden="true" />
            <span>0 Backlogs</span>
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="sr-section-card" aria-label="Backlog & Re-Examination Records">
      <div className="sr-section-header">
        <h3 className="sr-section-title">
          <FaHistory style={{ color: "#d97706" }} aria-hidden="true" />
          Backlog & Re-Examination Records
        </h3>
        <span className="sr-section-badge">
          {groupedBacklogs.length} {groupedBacklogs.length === 1 ? "Subject" : "Subjects"} Recorded
        </span>
      </div>

      {/* Summary Metrics Strip (Counts UNIQUE Subjects) */}
      <div className="sr-backlog-summary-strip" aria-label="Backlog summary metrics">
        <div className="sr-backlog-summary-item">
          <span className="sr-backlog-summary-value">{summary.total}</span>
          <span className="sr-backlog-summary-label">Total Backlogs</span>
        </div>
        <div className="sr-backlog-summary-item" style={{ borderColor: "#bbf7d0" }}>
          <span className="sr-backlog-summary-value" style={{ color: "#15803d" }}>
            {summary.cleared}
          </span>
          <span className="sr-backlog-summary-label" style={{ color: "#166534" }}>
            Cleared
          </span>
        </div>
        {summary.reappear > 0 && (
          <div className="sr-backlog-summary-item" style={{ borderColor: "#fecaca" }}>
            <span className="sr-backlog-summary-value" style={{ color: "#b91c1c" }}>
              {summary.reappear}
            </span>
            <span className="sr-backlog-summary-label" style={{ color: "#991b1b" }}>
              Re-appear Required
            </span>
          </div>
        )}
        {summary.pending > 0 && (
          <div className="sr-backlog-summary-item" style={{ borderColor: "#bae6fd" }}>
            <span className="sr-backlog-summary-value" style={{ color: "#0369a1" }}>
              {summary.pending}
            </span>
            <span className="sr-backlog-summary-label" style={{ color: "#075985" }}>
              Evaluation Pending
            </span>
          </div>
        )}
      </div>

      {/* Unique Backlog Subject Cards */}
      <div className="sr-backlog-cards-container" role="list">
        {groupedBacklogs.map((item) => {
          const cardKey = String(item.backlogId || item.subjectId || item.subjectCode);
          const isExpanded = expandedBacklogIds.has(cardKey);
          const finalTone = item.finalStatusTone;

          return (
            <div
              key={cardKey}
              className={`sr-backlog-card ${item.isCleared ? "is-cleared" : ""}`}
              role="listitem"
            >
              <div className="sr-backlog-card-header">
                <div className="sr-backlog-subject-info">
                  <div className="sr-backlog-subject-title">
                    <span>{item.subjectName || "Subject"}</span>
                    <span className="sr-type-badge">
                      {formatSubjectType(item.subjectType)}
                    </span>
                  </div>
                  <div className="sr-backlog-meta-tags">
                    <span>Code: {item.subjectCode || "N/A"}</span>
                    {item.originalSemester && (
                      <span>• Original Term: Sem {item.originalSemester} {item.originalAcademicYear ? `(${item.originalAcademicYear})` : ""}</span>
                    )}
                  </div>
                </div>

                <div className="sr-backlog-action-wrap">
                  <span className={`sr-status-pill tone-${finalTone.tone}`}>
                    {item.isCleared ? (
                      <FaCheckCircle aria-hidden="true" />
                    ) : item.finalStatus === "ATTEMPTED" ? (
                      <FaClock aria-hidden="true" />
                    ) : (
                      <FaTimesCircle aria-hidden="true" />
                    )}
                    <span>{item.finalStatusLabel}</span>
                  </span>

                  <button
                    type="button"
                    className="sr-toggle-history-btn"
                    onClick={() => toggleExpand(cardKey)}
                    aria-expanded={isExpanded}
                    aria-controls={`history-${cardKey}`}
                  >
                    <span>{item.attemptCount} {item.attemptCount === 1 ? "Attempt" : "Attempts"}</span>
                    {isExpanded ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Expandable Attempt History Drawer */}
              {isExpanded && (
                <div id={`history-${cardKey}`} className="sr-attempts-history-drawer">
                  <h4 className="sr-attempts-history-title">
                    <FaClipboardList aria-hidden="true" />
                    Complete Attempt History
                  </h4>
                  <div style={{ overflowX: "auto" }}>
                    <table className="sr-attempts-table" aria-label={`Attempt history for ${item.subjectName}`}>
                      <thead>
                        <tr>
                          <th scope="col" style={{ width: "12%" }}>Attempt</th>
                          <th scope="col" style={{ width: "38%" }}>Examination Term</th>
                          <th scope="col" style={{ width: "12%", textAlign: "right" }}>Internal</th>
                          <th scope="col" style={{ width: "12%", textAlign: "right" }}>External</th>
                          <th scope="col" style={{ width: "12%", textAlign: "right" }}>Total</th>
                          <th scope="col" style={{ width: "14%", textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.attempts.map((att, aIdx) => {
                          const attLabel = getResultStatusLabel(att.resultStatus);
                          const attTone = getResultStatusTone(att.resultStatus);

                          return (
                            <tr key={att.attemptId || aIdx}>
                              <td>
                                <strong>Attempt #{att.attemptNumber}</strong>
                              </td>
                              <td>
                                <div>
                                  <span>{att.examName}</span>
                                  {att.evaluatedAt && (
                                    <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b" }}>
                                      Evaluated: {formatDate(att.evaluatedAt)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                                {formatMark(att.internalMarks)}
                              </td>
                              <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                                {att.subjectType === "PRACTICAL" ? "—" : formatMark(att.externalMarks)}
                              </td>
                              <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                                {formatMark(att.totalMarks)}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className={`sr-status-pill tone-${attTone.tone}`}>
                                  {att.cleared || att.resultStatus === "PASS" ? (
                                    <FaCheckCircle aria-hidden="true" />
                                  ) : att.resultStatus === "FAIL" ? (
                                    <FaTimesCircle aria-hidden="true" />
                                  ) : (
                                    <FaClock aria-hidden="true" />
                                  )}
                                  <span>{attLabel}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

BacklogSection.propTypes = {
  groupedBacklogs: PropTypes.arrayOf(
    PropTypes.shape({
      backlogId: PropTypes.string,
      subjectId: PropTypes.string,
      subjectName: PropTypes.string,
      subjectCode: PropTypes.string,
      subjectType: PropTypes.string,
      originalSemester: PropTypes.number,
      originalAcademicYear: PropTypes.string,
      attemptCount: PropTypes.number,
      isCleared: PropTypes.bool,
      finalStatus: PropTypes.string,
      finalStatusLabel: PropTypes.string,
      finalStatusTone: PropTypes.object,
      attempts: PropTypes.array,
    })
  ),
};

/**
 * Horizontal Semester Selector for Student Results.
 */
export function SemesterSelector({
  semesters,
  selectedSemester,
  onSelectSemester,
  currentSemester,
}) {
  if (!Array.isArray(semesters) || semesters.length === 0) {
    return null;
  }

  return (
    <nav
      className="sr-semester-selector-wrapper"
      aria-label="Filter results by semester"
    >
      <span className="sr-semester-selector-label">
        <FaLayerGroup style={{ marginRight: "4px" }} aria-hidden="true" />
        Semester:
      </span>
      <div className="sr-semester-pills" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={selectedSemester === "ALL"}
          className={`sr-semester-pill ${selectedSemester === "ALL" ? "active" : ""}`}
          onClick={() => onSelectSemester("ALL")}
        >
          All Semesters
        </button>

        {semesters.map((sem) => {
          const isSelected = selectedSemester === sem;
          const isCurrent = sem === currentSemester;

          return (
            <button
              key={sem}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`sr-semester-pill ${isSelected ? "active" : ""}`}
              onClick={() => onSelectSemester(sem)}
            >
              <span>Semester {sem}</span>
              {isCurrent && (
                <span className="sr-current-tag" title="Latest Published Semester">
                  <FaStar style={{ fontSize: "0.6rem", marginRight: "2px" }} aria-hidden="true" />
                  Latest
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

SemesterSelector.propTypes = {
  semesters: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedSemester: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSelectSemester: PropTypes.func.isRequired,
  currentSemester: PropTypes.number,
};

/**
 * Subject-wise Results Section.
 */
export function SubjectResultsSection({ subjects = [], examName }) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return null;
  }

  const renderStatusBadge = (status) => {
    const label = getResultStatusLabel(status);
    const tone = getResultStatusTone(status);

    return (
      <span className={`sr-status-pill tone-${tone.tone}`}>
        {status === "PASS" ? (
          <FaCheckCircle aria-hidden="true" />
        ) : status === "FAIL" ? (
          <FaTimesCircle aria-hidden="true" />
        ) : (
          <FaClock aria-hidden="true" />
        )}
        <span>{label}</span>
      </span>
    );
  };

  return (
    <section className="sr-section-card" aria-label="Subject-wise Results">
      <div className="sr-section-header">
        <h3 className="sr-section-title">
          <FaBook style={{ color: "#1a4b6d" }} aria-hidden="true" />
          Subject-wise Results
        </h3>
        <span className="sr-section-badge">
          {subjects.length} {subjects.length === 1 ? "Subject" : "Subjects"}
        </span>
      </div>

      <div className="sr-table-container">
        <table
          className="sr-table"
          aria-label={`Subject breakdown for ${examName || "current semester"}`}
        >
          <thead>
            <tr>
              <th scope="col" style={{ width: "35%" }}>Subject</th>
              <th scope="col" style={{ width: "15%" }}>Type</th>
              <th scope="col" className="align-right" style={{ width: "12%" }}>Internal</th>
              <th scope="col" className="align-right" style={{ width: "12%" }}>External</th>
              <th scope="col" className="align-right" style={{ width: "12%" }}>Total</th>
              <th scope="col" className="align-center" style={{ width: "14%" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subj, idx) => {
              const isPractical = subj.subjectType === "PRACTICAL";
              const externalDisplay = isPractical ? "—" : formatMark(subj.externalMarks);

              return (
                <tr key={subj.subject || idx}>
                  <td>
                    <div className="sr-subject-name-cell">
                      <span className="sr-subject-title">
                        {subj.subjectName || "Unnamed Subject"}
                      </span>
                      <span className="sr-subject-code">
                        {subj.subjectCode || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="sr-type-badge">
                      {formatSubjectType(subj.subjectType)}
                    </span>
                  </td>
                  <td className="align-right">
                    <span className="sr-marks-num">
                      {formatMark(subj.internalMarks)}
                    </span>
                  </td>
                  <td className="align-right">
                    <span className="sr-marks-num" title={isPractical ? "External not applicable for practical" : undefined}>
                      {externalDisplay}
                    </span>
                  </td>
                  <td className="align-right">
                    <span className="sr-marks-total">
                      {subj.maxMarks != null
                        ? formatMarksRatio(subj.totalMarks, subj.maxMarks)
                        : formatMark(subj.totalMarks)}
                    </span>
                  </td>
                  <td className="align-center">
                    {renderStatusBadge(subj.status)}
                    {!subj.marksRecorded && (
                      <span
                        title="Marks not yet entered"
                        style={{ marginLeft: "6px", color: "#d97706", display: "inline-block" }}
                      >
                        <FaInfoCircle aria-hidden="true" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sr-mobile-subjects-list" role="list">
        {subjects.map((subj, idx) => {
          const isPractical = subj.subjectType === "PRACTICAL";
          const externalDisplay = isPractical ? "—" : formatMark(subj.externalMarks);

          return (
            <div key={subj.subject || idx} className="sr-mobile-subject-card" role="listitem">
              <div className="sr-mobile-card-header">
                <div className="sr-subject-name-cell">
                  <span className="sr-subject-title">{subj.subjectName || "Unnamed Subject"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "2px" }}>
                    <span className="sr-subject-code">{subj.subjectCode || "N/A"}</span>
                    <span className="sr-type-badge">{formatSubjectType(subj.subjectType)}</span>
                  </div>
                </div>
                {renderStatusBadge(subj.status)}
              </div>

              <div className="sr-mobile-marks-grid">
                <div className="sr-mobile-mark-box">
                  <span className="sr-mobile-mark-label">Internal</span>
                  <span className="sr-mobile-mark-value">{formatMark(subj.internalMarks)}</span>
                </div>
                <div className="sr-mobile-mark-box">
                  <span className="sr-mobile-mark-label">{isPractical ? "External (N/A)" : "External"}</span>
                  <span className="sr-mobile-mark-value">{externalDisplay}</span>
                </div>
                <div className="sr-mobile-mark-box">
                  <span className="sr-mobile-mark-label">Total</span>
                  <span className="sr-mobile-mark-value" style={{ color: "#1a4b6d" }}>
                    {subj.maxMarks != null
                      ? formatMarksRatio(subj.totalMarks, subj.maxMarks)
                      : formatMark(subj.totalMarks)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

SubjectResultsSection.propTypes = {
  subjects: PropTypes.arrayOf(
    PropTypes.shape({
      subject: PropTypes.string,
      subjectName: PropTypes.string,
      subjectCode: PropTypes.string,
      subjectType: PropTypes.string,
      internalMarks: PropTypes.number,
      externalMarks: PropTypes.number,
      totalMarks: PropTypes.number,
      maxMarks: PropTypes.number,
      status: PropTypes.string,
      marksRecorded: PropTypes.bool,
    })
  ),
  examName: PropTypes.string,
};

/**
 * Result Summary Hero Card.
 */
export function ResultSummaryHero({
  result,
  isAllView = false,
  allResults = [],
  onSelectSemester,
}) {
  if (isAllView) {
    const summary = calculateCumulativeSummary(allResults);
    const latestResult = allResults && allResults.length > 0 ? allResults[0] : null;

    const latestExam = latestResult?.exam_id || {};
    const latestCourse = latestResult?.course_id || {};
    const latestStatusLabel = latestResult ? getResultStatusLabel(latestResult.overallResult) : "";
    const latestStatusTone = latestResult ? getResultStatusTone(latestResult.overallResult) : { tone: "neutral" };
    const latestTotalMarksDisplay = latestResult
      ? formatMarksRatio(latestResult.totalMarks, latestResult.totalMaxMarks)
      : "—";
    const latestPercentageDisplay = latestResult ? formatPercentage(latestResult.percentage) : "Pending";
    const isLatestPercentagePending =
      !latestResult ||
      latestResult.overallResult === "INCOMPLETE" ||
      latestResult.percentage === null ||
      latestResult.percentage === undefined;

    return (
      <div className="sr-overview-flow">
        {latestResult && (
          <section className="sr-hero-card sr-latest-hero-card" aria-label="Latest Examination Result">
            <div className="sr-hero-header">
              <div className="sr-hero-title-group">
                <div className="sr-hero-badge-tag">
                  <FaTrophy aria-hidden="true" />
                  <span>Latest Examination Result</span>
                </div>
                <h2 className="sr-hero-title">
                  Semester {latestResult.semester}
                </h2>
                <div className="sr-hero-subtitle">
                  <span className="sr-hero-meta-item">
                    {latestResult.examName || latestExam.name || `Semester ${latestResult.semester} Examination`}
                  </span>
                  {latestCourse.name && (
                    <span className="sr-hero-meta-item">• {latestCourse.name}</span>
                  )}
                  {latestResult.academicYear && (
                    <span className="sr-hero-meta-item">• AY {latestResult.academicYear}</span>
                  )}
                  {latestResult.publishedAt && (
                    <span className="sr-hero-meta-item">
                      <FaCalendarAlt aria-hidden="true" /> Published {formatDate(latestResult.publishedAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="sr-hero-overall-badge-wrapper">
                <div
                  className={`sr-overall-badge tone-${latestStatusTone.tone}`}
                  role="status"
                  aria-label={`Result: ${latestStatusLabel}`}
                >
                  {latestResult.overallResult === "PASS" ? (
                    <FaCheckCircle aria-hidden="true" />
                  ) : latestResult.overallResult === "FAIL" ? (
                    <FaTimesCircle aria-hidden="true" />
                  ) : (
                    <FaClock aria-hidden="true" />
                  )}
                  <span>{latestStatusLabel.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="sr-hero-showcase-grid">
              <div className={`sr-showcase-box highlight-percentage ${isLatestPercentagePending ? "tone-pending" : ""}`}>
                <div className="sr-showcase-icon" aria-hidden="true">
                  <FaPercentage />
                </div>
                <div className="sr-showcase-content">
                  <span className="sr-showcase-value">{latestPercentageDisplay}</span>
                  <span className="sr-showcase-label">
                    {isLatestPercentagePending ? "Percentage Pending" : "Overall Percentage"}
                  </span>
                </div>
              </div>

              <div className="sr-showcase-box highlight-marks">
                <div className="sr-showcase-icon" aria-hidden="true">
                  <FaCalculator />
                </div>
                <div className="sr-showcase-content">
                  <span className="sr-showcase-value">{latestTotalMarksDisplay}</span>
                  <span className="sr-showcase-label">Total Marks</span>
                </div>
              </div>
            </div>

            <div className="sr-hero-metrics-grid">
              <div className="sr-metric-card tone-success">
                <div className="sr-metric-icon-wrap" aria-hidden="true">
                  <FaCheckCircle />
                </div>
                <div className="sr-metric-info">
                  <span className="sr-metric-value">{latestResult.passedSubjects ?? 0}</span>
                  <span className="sr-metric-label">Passed</span>
                </div>
              </div>

              <div className={`sr-metric-card ${(latestResult.failedSubjects ?? 0) > 0 ? "tone-danger" : "tone-neutral"}`}>
                <div className="sr-metric-icon-wrap" aria-hidden="true">
                  <FaTimesCircle />
                </div>
                <div className="sr-metric-info">
                  <span className="sr-metric-value">{latestResult.failedSubjects ?? 0}</span>
                  <span className="sr-metric-label">Failed</span>
                </div>
              </div>

              <div className={`sr-metric-card ${(latestResult.backlogCount ?? 0) > 0 ? "tone-warning" : "tone-neutral"}`}>
                <div className="sr-metric-icon-wrap" aria-hidden="true">
                  <FaRedoAlt />
                </div>
                <div className="sr-metric-info">
                  <span className="sr-metric-value">{latestResult.backlogCount ?? 0}</span>
                  <span className="sr-metric-label">Backlogs</span>
                </div>
              </div>

              <div className="sr-metric-card tone-neutral">
                <div className="sr-metric-icon-wrap" aria-hidden="true">
                  <FaBook />
                </div>
                <div className="sr-metric-info">
                  <span className="sr-metric-value">{latestResult.totalSubjects ?? 0}</span>
                  <span className="sr-metric-label">Total Subjects</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="sr-section-card sr-academic-performance-section" aria-label="Academic Performance">
          <div className="sr-academic-perf-header">
            <div>
              <h3 className="sr-academic-perf-title">
                <FaGraduationCap aria-hidden="true" /> Academic Performance
              </h3>
              <span className="sr-academic-perf-subtitle">
                Semester Performance Breakdown
              </span>
            </div>

            {summary.totalMax > 0 && (
              <div className="sr-cumulative-summary-badge" title="Overall academic summary across all published semesters">
                <span className="sr-cumul-badge-title">Overall Academic Summary</span>
                <div className="sr-cumul-badge-body">
                  <span className="sr-cumul-badge-marks">{summary.totalObtained} / {summary.totalMax} Total Marks</span>
                  {summary.cumulativePercentage !== null && (
                    <span className="sr-cumul-badge-pct"> • {summary.cumulativePercentage.toFixed(2)}%</span>
                  )}
                  <span className="sr-cumul-badge-terms"> • Across {allResults.length} Published Semesters</span>
                </div>
                <div className="sr-cumul-badge-counts">
                  <span className="text-success">{summary.totalPassed} Passed Subjects</span>
                  {summary.totalFailed > 0 && (
                    <span className="text-danger"> • {summary.totalFailed} Failed Subjects</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="sr-all-semesters-section" style={{ padding: "0 1.5rem 1.5rem" }}>
            <div className="sr-semesters-overview-grid" role="list">
              {summary.semesters.map((sem) => {
                const tone = getResultStatusTone(sem.overallResult);
                const label = getResultStatusLabel(sem.overallResult);
                const isPending = sem.overallResult === "INCOMPLETE" || sem.percentage === null;

                return (
                  <div
                    key={sem.id || sem.semester}
                    className="sr-semester-overview-card"
                    role="listitem"
                    onClick={() => onSelectSemester && onSelectSemester(sem.semester)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && onSelectSemester) {
                        onSelectSemester(sem.semester);
                      }
                    }}
                    title="Click to view detailed semester breakdown"
                  >
                    <div className="sr-sem-card-top">
                      <div>
                        <h4 className="sr-sem-card-title">Semester {sem.semester}</h4>
                        <span className="sr-sem-card-exam">{sem.examName}</span>
                      </div>
                      <span className={`sr-status-pill tone-${tone.tone}`}>
                        {label}
                      </span>
                    </div>

                    <div className="sr-sem-card-metrics">
                      <div className="sr-sem-metric-col">
                        <span className="sr-sem-metric-label">Total Marks</span>
                        <span className="sr-sem-metric-val">
                          {formatMarksRatio(sem.totalMarks, sem.totalMaxMarks)}
                        </span>
                      </div>
                      <div className="sr-sem-metric-col align-right">
                        <span className="sr-sem-metric-label">Overall Percentage</span>
                        <span className={`sr-sem-metric-val ${isPending ? "text-pending" : "text-percentage"}`}>
                          {formatPercentage(sem.percentage)}
                        </span>
                      </div>
                    </div>

                    <div className="sr-sem-card-footer">
                      <div className="sr-sem-card-counts">
                        <span className="sr-sem-badge-item text-success">
                          ✓ {sem.passedSubjects} Passed
                        </span>
                        <span className={`sr-sem-badge-item ${sem.failedSubjects > 0 ? "text-danger" : "text-muted"}`}>
                          ✕ {sem.failedSubjects} Failed
                        </span>
                        <span className={`sr-sem-badge-item ${sem.backlogCount > 0 ? "text-warning" : "text-muted"}`}>
                          ↻ {sem.backlogCount} Backlogs
                        </span>
                      </div>

                      <button
                        type="button"
                        className="sr-view-details-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSemester && onSelectSemester(sem.semester);
                        }}
                        aria-label={`View details for Semester ${sem.semester}`}
                      >
                        <span>View Details</span>
                        <FaArrowRight aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!result) return null;

  const exam = result.exam_id || {};
  const course = result.course_id || {};
  const statusLabel = getResultStatusLabel(result.overallResult);
  const statusTone = getResultStatusTone(result.overallResult);

  const totalMarksDisplay = formatMarksRatio(result.totalMarks, result.totalMaxMarks);
  const percentageDisplay = formatPercentage(result.percentage);
  const isPercentagePending =
    result.overallResult === "INCOMPLETE" ||
    result.percentage === null ||
    result.percentage === undefined;

  const passedCount = result.passedSubjects ?? 0;
  const failedCount = result.failedSubjects ?? 0;
  const backlogCount = result.backlogCount ?? 0;
  const totalCount = result.totalSubjects ?? 0;

  return (
    <section className="sr-hero-card" aria-label={`Semester ${result.semester} Summary`}>
      <div className="sr-hero-header">
        <div className="sr-hero-title-group">
          <h2 className="sr-hero-title">
            <FaTrophy aria-hidden="true" />
            Semester {result.semester} Result
          </h2>
          <div className="sr-hero-subtitle">
            <span className="sr-hero-meta-item">
              {result.examName || exam.name || `Semester ${result.semester} Examination`}
            </span>
            {course.name && (
              <span className="sr-hero-meta-item">• {course.name}</span>
            )}
            {result.academicYear && (
              <span className="sr-hero-meta-item">• AY {result.academicYear}</span>
            )}
            {result.publishedAt && (
              <span className="sr-hero-meta-item">
                <FaCalendarAlt aria-hidden="true" /> Published {formatDate(result.publishedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="sr-hero-overall-badge-wrapper">
          <div
            className={`sr-overall-badge tone-${statusTone.tone}`}
            role="status"
            aria-label={`Overall result: ${statusLabel}`}
          >
            {result.overallResult === "PASS" ? (
              <FaCheckCircle aria-hidden="true" />
            ) : result.overallResult === "FAIL" ? (
              <FaTimesCircle aria-hidden="true" />
            ) : (
              <FaClock aria-hidden="true" />
            )}
            <span>{statusLabel.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="sr-hero-showcase-grid">
        <div className={`sr-showcase-box highlight-percentage ${isPercentagePending ? "tone-pending" : ""}`}>
          <div className="sr-showcase-icon" aria-hidden="true">
            <FaPercentage />
          </div>
          <div className="sr-showcase-content">
            <span className="sr-showcase-value">{percentageDisplay}</span>
            <span className="sr-showcase-label">
              {isPercentagePending ? "Percentage Pending" : "Overall Percentage"}
            </span>
          </div>
        </div>

        <div className="sr-showcase-box highlight-marks">
          <div className="sr-showcase-icon" aria-hidden="true">
            <FaCalculator />
          </div>
          <div className="sr-showcase-content">
            <span className="sr-showcase-value">{totalMarksDisplay}</span>
            <span className="sr-showcase-label">Total Marks</span>
          </div>
        </div>
      </div>

      <div className="sr-hero-metrics-grid">
        <div className="sr-metric-card tone-success">
          <div className="sr-metric-icon-wrap" aria-hidden="true">
            <FaCheckCircle />
          </div>
          <div className="sr-metric-info">
            <span className="sr-metric-value">{passedCount}</span>
            <span className="sr-metric-label">Passed</span>
          </div>
        </div>

        <div className={`sr-metric-card ${failedCount > 0 ? "tone-danger" : "tone-neutral"}`}>
          <div className="sr-metric-icon-wrap" aria-hidden="true">
            <FaTimesCircle />
          </div>
          <div className="sr-metric-info">
            <span className="sr-metric-value">{failedCount}</span>
            <span className="sr-metric-label">Failed</span>
          </div>
        </div>

        <div className={`sr-metric-card ${backlogCount > 0 ? "tone-warning" : "tone-neutral"}`}>
          <div className="sr-metric-icon-wrap" aria-hidden="true">
            <FaRedoAlt />
          </div>
          <div className="sr-metric-info">
            <span className="sr-metric-value">{backlogCount}</span>
            <span className="sr-metric-label">Backlogs</span>
          </div>
        </div>

        <div className="sr-metric-card tone-neutral">
          <div className="sr-metric-icon-wrap" aria-hidden="true">
            <FaBook />
          </div>
          <div className="sr-metric-info">
            <span className="sr-metric-value">{totalCount}</span>
            <span className="sr-metric-label">Total Subjects</span>
          </div>
        </div>
      </div>
    </section>
  );
}

ResultSummaryHero.propTypes = {
  result: PropTypes.shape({
    semester: PropTypes.number,
    academicYear: PropTypes.string,
    overallResult: PropTypes.string,
    totalMarks: PropTypes.number,
    totalMaxMarks: PropTypes.number,
    percentage: PropTypes.number,
    examName: PropTypes.string,
    backlogCount: PropTypes.number,
    passedSubjects: PropTypes.number,
    failedSubjects: PropTypes.number,
    incompleteSubjects: PropTypes.number,
    totalSubjects: PropTypes.number,
    publishedAt: PropTypes.string,
    exam_id: PropTypes.object,
    course_id: PropTypes.object,
    subjects: PropTypes.array,
  }),
  isAllView: PropTypes.bool,
  allResults: PropTypes.array,
  onSelectSemester: PropTypes.func,
};