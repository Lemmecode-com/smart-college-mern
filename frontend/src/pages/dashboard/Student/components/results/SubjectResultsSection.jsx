import React from "react";
import PropTypes from "prop-types";
import {
  FaBook,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaInfoCircle,
} from "react-icons/fa";
import {
  formatMark,
  formatMarksRatio,
  formatSubjectType,
  getResultStatusLabel,
  getResultStatusTone,
} from "../../../../../utils/resultFormatters.util";

/**
 * Subject-wise Results Section.
 * Renders an accessible desktop table alongside responsive cards on mobile screens.
 */
export default function SubjectResultsSection({ subjects = [], examName }) {
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

      {/* Desktop Table View */}
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

      {/* Mobile Card List View (No horizontal scrolling on <= 768px) */}
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
      status: PropTypes.string,
      marksRecorded: PropTypes.bool,
    })
  ).isRequired,
  examName: PropTypes.string,
};
