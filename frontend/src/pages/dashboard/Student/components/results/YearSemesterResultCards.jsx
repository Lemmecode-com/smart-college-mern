import React from "react";
import PropTypes from "prop-types";
import {
  FaGraduationCap,
  FaEye,
  FaDownload,
  FaCalendarAlt,
  FaBook,
} from "react-icons/fa";

/**
 * Compact Year -> Semester Result Cards Component.
 *
 * Displays academic results hierarchically:
 * First Year
 *   ├── Semester 1 (Clean Card: Semester, Exam Name, AY, Course, Preview, Download)
 *   └── Semester 2 (Clean Card: Semester, Exam Name, AY, Course, Preview, Download)
 * Second Year
 *   ├── Semester 3
 *   └── Semester 4
 * etc.
 *
 * Subject breakdowns appear exclusively inside the Preview modal / PDF statement.
 */
export default function YearSemesterResultCards({
  groupedYears = [],
  onPreview,
  onDownload,
  selectedYear = null,
  selectedSemester = "ALL",
}) {
  if (!Array.isArray(groupedYears) || groupedYears.length === 0) {
    return null;
  }

  // Filter if a specific year is chosen
  const filteredYearsByYear =
    selectedYear !== null && selectedYear !== undefined && selectedYear !== "ALL"
      ? groupedYears.filter((group) => Number(group.yearNumber) === Number(selectedYear))
      : groupedYears;

  // Filter if a specific semester is chosen
  const filteredYears =
    selectedSemester === "ALL" || !selectedSemester
      ? filteredYearsByYear
      : filteredYearsByYear
          .map((group) => ({
            ...group,
            semesters: group.semesters.filter(
              (s) => Number(s.semester) === Number(selectedSemester)
            ),
          }))
          .filter((group) => group.semesters.length > 0);

  if (filteredYears.length === 0) {
    return null;
  }

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
                <h3 className="sr-year-title">
                  {yearGroup.yearNumber === 4 ? "Fourth Year" : yearGroup.yearLabel}
                </h3>
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
              const examName =
                result.examName ||
                result.exam_id?.name ||
                `Semester ${semNum} Examination`;

              const ayDisplay = result.academicYear
                ? String(result.academicYear).trim().startsWith("AY")
                  ? result.academicYear
                  : `AY ${result.academicYear}`
                : null;

              const courseName =
                result.course_id?.name ||
                result.courseName ||
                result.course?.name ||
                (typeof result.course === "string" ? result.course : null);

              return (
                <article
                  key={result._id || semNum}
                  className="sr-compact-sem-card"
                  role="listitem"
                  aria-label={`Semester ${semNum} Result Card`}
                >
                  {/* Semester Label & Exam Name */}
                  <div className="sr-compact-card-header">
                    <span className="sr-sem-tag">Semester {semNum}</span>
                    <h4 className="sr-compact-exam-name">{examName}</h4>
                  </div>

                  {/* Metadata Row: Academic Year and Course */}
                  {(ayDisplay || courseName) && (
                    <div className="sr-compact-meta-strip">
                      {ayDisplay && (
                        <span className="sr-compact-meta-item">
                          <FaCalendarAlt aria-hidden="true" />
                          <span>{ayDisplay}</span>
                        </span>
                      )}
                      {courseName && (
                        <span className="sr-compact-meta-item">
                          <FaBook aria-hidden="true" />
                          <span>{courseName}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons: Preview Result & Download PDF */}
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
  selectedYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
