import React from "react";
import PropTypes from "prop-types";
import {
  FaGraduationCap,
  FaEye,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendarAlt,
  FaCalculator,
  FaPercentage,
} from "react-icons/fa";

import {
  formatMarksRatio,
  formatPercentage,
  getResultStatusLabel,
  getResultStatusTone,
} from "../../../../../utils/resultFormatters.util";

/**
 * Compact Year -> Semester Result Cards Component.
 *
 * Displays academic results hierarchically:
 * First Year
 *   ├── Semester 1 (Compact Card: Preview, Download)
 *   └── Semester 2 (Compact Card: Preview, Download)
 * Second Year
 *   ├── Semester 3
 *   └── Semester 4
 * etc.
 *
 * IMPORTANT:
 * Subject tables are NOT displayed here. Full subject breakdowns
 * appear exclusively inside the Preview modal.
 */
export default function YearSemesterResultCards({
  groupedYears = [],
  onPreview,
  onDownload,
  selectedSemester = "ALL",
}) {
  if (!Array.isArray(groupedYears) || groupedYears.length === 0) {
    return null;
  }

  // Filter if a specific semester is chosen
  const filteredYears =
    selectedSemester === "ALL"
      ? groupedYears
      : groupedYears
          .map((group) => ({
            ...group,
            semesters: group.semesters.filter(
              (s) => Number(s.semester) === Number(selectedSemester)
            ),
          }))
          .filter((group) => group.semesters.length > 0);

  return (
    <div className="sr-year-hierarchy-container" aria-label="Semester Results by Academic Year">
      {filteredYears.map((yearGroup) => (
        <section
          key={yearGroup.yearNumber}
          className="sr-year-section"
          aria-label={`${yearGroup.yearLabel} Results`}
        >
          {/* Year Section Header */}
          <div className="sr-year-header">
            <div className="sr-year-title-wrapper">
              <div className="sr-year-icon-pill" aria-hidden="true">
                <FaGraduationCap />
              </div>
              <div>
                <h3 className="sr-year-title">{yearGroup.yearLabel}</h3>
                <span className="sr-year-subtitle">
                  Academic Year {yearGroup.yearNumber} • {yearGroup.semesters.length}{" "}
                  {yearGroup.semesters.length === 1 ? "Semester" : "Semesters"} Available
                </span>
              </div>
            </div>
          </div>

          {/* Semesters Grid */}
          <div className="sr-semester-cards-grid" role="list">
            {yearGroup.semesters.map((result) => {
              const semNum = Number(result.semester);
              const statusTone = getResultStatusTone(result.overallResult);
              const statusLabel = getResultStatusLabel(result.overallResult);
              const isPercentagePending =
                result.overallResult === "INCOMPLETE" ||
                result.percentage === null ||
                result.percentage === undefined;

              const totalMarksDisplay = formatMarksRatio(
                result.totalMarks,
                result.totalMaxMarks
              );
              const percentageDisplay = formatPercentage(result.percentage);

              return (
                <article
                  key={result._id || semNum}
                  className="sr-compact-sem-card"
                  role="listitem"
                  aria-label={`Semester ${semNum} Result Card`}
                >
                  {/* Top Bar: Semester & Status */}
                  <div className="sr-compact-card-header">
                    <div>
                      <span className="sr-sem-tag">Semester {semNum}</span>
                      <h4 className="sr-compact-exam-name">
                        {result.examName ||
                          result.exam_id?.name ||
                          `Semester ${semNum} Examination`}
                      </h4>
                    </div>

                    <span className={`sr-status-pill tone-${statusTone.tone}`}>
                      {result.overallResult === "PASS" ? (
                        <FaCheckCircle aria-hidden="true" />
                      ) : result.overallResult === "FAIL" ? (
                        <FaTimesCircle aria-hidden="true" />
                      ) : (
                        <FaClock aria-hidden="true" />
                      )}
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Meta Strip: Academic Year & Published Date */}
                  <div className="sr-compact-meta-strip">
                    {result.academicYear && (
                      <span className="sr-compact-meta-item">
                        <FaCalendarAlt aria-hidden="true" /> AY {result.academicYear}
                      </span>
                    )}
                    {result.course_id?.name && (
                      <span className="sr-compact-meta-item">
                        • {result.course_id.name}
                      </span>
                    )}
                  </div>

                  {/* Core Metrics: Total Marks & Overall Percentage */}
                  <div className="sr-compact-metrics-grid">
                    <div className="sr-compact-metric-box">
                      <div className="sr-metric-mini-label">
                        <FaCalculator aria-hidden="true" />
                        <span>Total Marks</span>
                      </div>
                      <span className="sr-metric-mini-val">
                        {totalMarksDisplay}
                      </span>
                    </div>

                    <div className="sr-compact-metric-box">
                      <div className="sr-metric-mini-label">
                        <FaPercentage aria-hidden="true" />
                        <span>Overall Percentage</span>
                      </div>
                      <span
                        className={`sr-metric-mini-val ${
                          isPercentagePending ? "text-pending" : "text-percentage"
                        }`}
                      >
                        {percentageDisplay}
                      </span>
                    </div>
                  </div>

                  {/* Subject Counts Indicator */}
                  <div className="sr-compact-counts-bar">
                    <span className="text-success">
                      ✓ {result.passedSubjects ?? 0} Passed
                    </span>
                    {(result.failedSubjects ?? 0) > 0 && (
                      <span className="text-danger">
                        ✕ {result.failedSubjects} Failed
                      </span>
                    )}
                    {(result.backlogCount ?? 0) > 0 && (
                      <span className="text-warning">
                        ↻ {result.backlogCount} Backlogs
                      </span>
                    )}
                  </div>

                  {/* Primary Actions: Preview Result & Download PDF */}
                  <div className="sr-compact-card-actions">
                    <button
                      type="button"
                      className="sr-card-btn preview-btn"
                      onClick={() => onPreview && onPreview(result)}
                      aria-label={`Preview result statement for Semester ${semNum}`}
                      title="Preview Statement of Marks"
                    >
                      <FaEye aria-hidden="true" />
                      <span>Preview Result</span>
                    </button>

                    <button
                      type="button"
                      className="sr-card-btn download-btn"
                      onClick={() => onDownload && onDownload(result)}
                      aria-label={`Download PDF result statement for Semester ${semNum}`}
                      title="Download Statement PDF"
                    >
                      <FaDownload aria-hidden="true" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

YearSemesterResultCards.propTypes = {
  groupedYears: PropTypes.arrayOf(
    PropTypes.shape({
      yearNumber: PropTypes.number.isRequired,
      yearLabel: PropTypes.string.isRequired,
      semesters: PropTypes.array.isRequired,
    })
  ).isRequired,
  onPreview: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  selectedSemester: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
