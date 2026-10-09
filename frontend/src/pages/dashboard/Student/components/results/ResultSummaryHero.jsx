import React from "react";
import PropTypes from "prop-types";
import {
  FaTrophy,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaBook,
  FaCalendarAlt,
  FaGraduationCap,
  FaCalculator,
  FaPercentage,
  FaRedoAlt,
  FaExclamationCircle,
  FaArrowRight,
} from "react-icons/fa";
import {
  getResultStatusLabel,
  getResultStatusTone,
  formatPercentage,
  formatMarksRatio,
  calculateCumulativeSummary,
} from "../../../../../utils/resultFormatters.util";
import { formatDate } from "../../../../../utils/format";

/**
 * Result Summary Hero Card.
 * Prominently highlights:
 * 1. Overall Semester Percentage
 * 2. Total Marks / Maximum Marks
 * 3. Result Status (PASS / FAIL / INCOMPLETE)
 * 4. Passed, Failed, and Backlog distribution
 */
export default function ResultSummaryHero({
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
        {/* 1. Latest Examination Result (Hero Card) */}
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

            {/* Prominent Results Showcase: Percentage (Priority 1) + Total Marks (Priority 2) */}
            <div className="sr-hero-showcase-grid">
              {/* Priority 1: Overall Percentage */}
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

              {/* Priority 2: Total Marks / Maximum Marks */}
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

            {/* Priority 4: Passed, Failed, Backlogs, Total Subjects */}
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

        {/* 2. Academic Performance Section */}
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

            {/* Secondary Cumulative Career Summary */}
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

          {/* Semester-wise Academic Performance Cards */}
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

      {/* Prominent Results Showcase: Percentage + Total Marks */}
      <div className="sr-hero-showcase-grid">
        {/* Priority 1: Overall Percentage */}
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

        {/* Priority 2: Total Marks / Maximum Marks */}
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

      {/* Secondary Metrics Row: Passed, Failed, Backlogs, Total Subjects */}
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
