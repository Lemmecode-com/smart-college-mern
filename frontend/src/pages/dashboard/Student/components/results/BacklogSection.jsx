import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaAward,
  FaClipboardList,
} from "react-icons/fa";
import {
  formatMark,
  formatSubjectType,
  getResultStatusLabel,
  getResultStatusTone,
  calculateBacklogSummary,
} from "../../../../../utils/resultFormatters.util";
import { formatDate } from "../../../../../utils/format";

/**
 * Backlog & Re-Examination Section.
 * Groups attempts by UNIQUE subject to prevent false double-counting.
 * Provides expandable attempt histories for complete academic transparency.
 */
export default function BacklogSection({ groupedBacklogs = [] }) {
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
