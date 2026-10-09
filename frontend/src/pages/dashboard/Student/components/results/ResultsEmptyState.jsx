import React from "react";
import PropTypes from "prop-types";
import { FaFileAlt, FaArrowLeft, FaLayerGroup, FaGraduationCap } from "react-icons/fa";

/**
 * Student-friendly Empty State for results.
 */
export default function ResultsEmptyState({
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
