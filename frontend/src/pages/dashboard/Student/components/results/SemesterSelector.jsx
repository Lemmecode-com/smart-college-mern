import React from "react";
import PropTypes from "prop-types";
import { FaLayerGroup, FaStar } from "react-icons/fa";

/**
 * Horizontal Semester Selector for Student Results.
 * Enables in-memory filtering without extra network requests.
 */
export default function SemesterSelector({
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
