import { useContext, useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { getMyResults } from "../../../api/results";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaFileAlt, FaSyncAlt, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

// CSS Stylesheet
import "./StudentResults.css";

// Subcomponents
import SemesterSelector from "./components/results/SemesterSelector";
import ResultSummaryHero from "./components/results/ResultSummaryHero";
import YearSemesterResultCards from "./components/results/YearSemesterResultCards";
import ResultStatementModal from "./components/results/ResultStatementModal";
import BacklogSection from "./components/results/BacklogSection";
import ResultsEmptyState from "./components/results/ResultsEmptyState";

// Formatters & Utilities
import {
  getAvailableSemesters,
  getCurrentSemesterNumber,
  filterResultsBySemester,
  groupBacklogsBySubject,
} from "../../../utils/resultFormatters.util";
import {
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
  const [selectedSemester, setSelectedSemester] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Statement Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeStatementData, setActiveStatementData] = useState(null);

  // Derived in-memory models (called unconditionally at top of component)
  const availableSemesters = useMemo(
    () => getAvailableSemesters(results),
    [results]
  );

  const currentSemester = useMemo(
    () => getCurrentSemesterNumber(results),
    [results]
  );

  const groupedYears = useMemo(
    () => groupSemestersByYear(results),
    [results]
  );

  const filteredResults = useMemo(
    () => filterResultsBySemester(results, selectedSemester),
    [results, selectedSemester]
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

        // Concurrently fetch authoritative results and student profile metadata
        const [resultsRes, profileRes] = await Promise.allSettled([
          getMyResults(),
          api.get("/students/my-profile"),
        ]);

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

        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      } catch (err) {
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
        setLoading(false);
      }
    };

    fetchResults();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [retryCount, user]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
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

      {hasNoResultsAtAll ? (
        <ResultsEmptyState
          type="no-published-results"
          onGoBack={handleGoBack}
        />
      ) : (
        <>
          {/* 1. Horizontal Semester Selector */}
          {availableSemesters.length > 0 && (
            <SemesterSelector
              semesters={availableSemesters}
              selectedSemester={selectedSemester}
              onSelectSemester={setSelectedSemester}
              currentSemester={currentSemester}
            />
          )}

          {/* 2. Overview Mode vs. Selected Semester Filter */}
          {selectedSemester === "ALL" ? (
            <ResultSummaryHero
              isAllView={true}
              allResults={results}
              onSelectSemester={setSelectedSemester}
            />
          ) : (
            <>
              {/* Back to All Semesters Navigation Strip */}
              <div className="sr-back-to-overview-strip">
                <button
                  type="button"
                  className="sr-back-to-all-btn"
                  onClick={() => setSelectedSemester("ALL")}
                  aria-label="Back to All Semesters overview"
                >
                  <FaArrowLeft aria-hidden="true" />
                  <span>Back to All Semesters</span>
                </button>
                <span className="sr-active-sem-tag">
                  Viewing Results for Semester {selectedSemester}
                </span>
              </div>

              {filteredResults.length === 0 && (
                <ResultsEmptyState
                  type="no-semester-results"
                  semesterNumber={selectedSemester}
                  onResetFilter={() => setSelectedSemester("ALL")}
                />
              )}
            </>
          )}

          {/* 3. Year -> Semester Result Cards (NO main-page subject tables) */}
          <YearSemesterResultCards
            groupedYears={groupedYears}
            onPreview={handlePreviewResult}
            onDownload={handleDownloadPdf}
            selectedSemester={selectedSemester}
          />

          {/* 4. Backlog & Re-Examination Section */}
          <BacklogSection groupedBacklogs={groupedBacklogs} />

          {/* 5. Statement of Marks Preview & PDF Download Modal */}
          <ResultStatementModal
            isOpen={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            statementData={activeStatementData}
          />
        </>
      )}
    </div>
  );
}