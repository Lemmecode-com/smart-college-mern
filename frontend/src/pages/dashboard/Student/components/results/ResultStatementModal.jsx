import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  FaPrint,
  FaDownload,
  FaTimes,
  FaUniversity,
  FaFileAlt,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { formatDate } from "../../../../../utils/format";
import {
  formatMark,
  formatMarksRatio,
  getResultStatusLabel,
} from "../../../../../utils/resultFormatters.util";
import { generateResultStatementFilename } from "../../../../../utils/resultStatementDataMapper";
import "./ResultStatementModal.css";

/**
 * Result Statement Modal & Marksheet Preview Component.
 *
 * Implements an authentic university marksheet preview with an A4 paper layout.
 * Supports:
 * 1. Instant interactive on-screen preview
 * 2. 1-click A4 portrait PDF generation via html2canvas + jsPDF
 * 3. Browser printing via window.print() and dedicated @media print styles
 */
export default function ResultStatementModal({
  isOpen,
  onClose,
  statementData,
}) {
  const sheetRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isGeneratingPdf) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, isGeneratingPdf]);

  if (!isOpen || !statementData) {
    return null;
  }

  const {
    student = {},
    college = {},
    course = {},
    examination = {},
    subjects = [],
    summary = {},
  } = statementData;

  /* ==========================================================================
     PDF GENERATION HANDLER (Client-side jsPDF + html2canvas)
     ========================================================================== */
  const handleDownloadPdf = async () => {
    if (!sheetRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    const toastId = toast.loading("Preparing Result Statement PDF...");

    try {
      // 1. Render Sheet to High-Resolution Canvas
      const canvas = await Promise.race([
        html2canvas(sheetRef.current, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            const images = clonedDoc.getElementsByTagName("img");
            return Promise.all(
              Array.from(images).map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              })
            );
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("PDF generation timed out")),
            30000
          )
        ),
      ]);

      if (!canvas || !canvas.toDataURL) {
        throw new Error("Unable to capture statement document");
      }

      const imgData = canvas.toDataURL("image/png");

      // 2. Initialize Portrait A4 jsPDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate proportional height in millimeters
      const pdfHeight = (canvas.height * pageWidth) / canvas.width;

      // 3. Single-Page vs Multi-Page Clean Pagination
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pdfHeight);
      } else {
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pageWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pageWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      }

      // 4. Save with Authoritative Filename
      const filename = generateResultStatementFilename(statementData);
      pdf.save(filename);

      toast.update(toastId, {
        render: "Result Statement downloaded successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3500,
      });
    } catch (err) {
      toast.update(toastId, {
        render: err.message || "Failed to generate PDF. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /* ==========================================================================
     PRINT HANDLER
     ========================================================================== */
  const handlePrint = () => {
    window.print();
  };

  const statusLower = String(summary.overallResult || "").toLowerCase();
  const statusClass =
    statusLower === "pass"
      ? "pass"
      : statusLower === "fail"
      ? "fail"
      : "incomplete";

  const percentageDisplay =
    summary.percentage !== null && summary.percentage !== undefined
      ? `${summary.percentage.toFixed(2)}%`
      : "Pending";

  return (
    <div
      className="rsm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rsm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGeneratingPdf) {
          onClose();
        }
      }}
    >
      <div className="rsm-dialog">
        {/* Action Toolbar (Sticky at top) */}
        <div className="rsm-toolbar no-print">
          <div className="rsm-toolbar-title-group">
            <div className="rsm-toolbar-icon" aria-hidden="true">
              <FaFileAlt />
            </div>
            <div>
              <h3 id="rsm-modal-title" className="rsm-toolbar-title">
                Result Statement Preview
              </h3>
              <span className="rsm-toolbar-subtitle">
                Semester {examination.semester} • {course.name || "Course"}
              </span>
            </div>
          </div>

          <div className="rsm-toolbar-actions">
            <button
              type="button"
              className="rsm-action-btn"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              title="Print result statement"
            >
              <FaPrint aria-hidden="true" />
              <span>Print</span>
            </button>

            <button
              type="button"
              className="rsm-action-btn primary"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              title="Download A4 PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <FaSpinner className="fa-spin" aria-hidden="true" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FaDownload aria-hidden="true" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="rsm-action-btn close-btn"
              onClick={onClose}
              disabled={isGeneratingPdf}
              aria-label="Close Preview"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Container */}
        <div className="rsm-content">
          {/* Printable A4 Marksheet Sheet Container */}
          <div
            className="result-statement-paper"
            ref={sheetRef}
            id="result-statement-sheet"
          >
            <div className="rsm-paper-inner-frame">
              {/* 1. HEADER */}
              <header className="rsm-header">
                <div className="rsm-logo-wrapper">
                  {college.logo ? (
                    <img
                      src={college.logo}
                      alt={college.name || "College Logo"}
                      className="rsm-college-logo"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="rsm-logo-fallback" aria-hidden="true">
                      <FaUniversity />
                    </div>
                  )}
                </div>

                <h1 className="rsm-college-name">
                  {college.name || "COLLEGE / INSTITUTION NAME"}
                </h1>

                {college.address && (
                  <p className="rsm-college-address">{college.address}</p>
                )}

                <div>
                  <span className="rsm-statement-banner">
                    STATEMENT OF MARKS & GRADES
                  </span>
                </div>

                <div className="rsm-exam-info">
                  <span>{examination.name}</span>
                  {examination.academicYear && examination.academicYear !== "—" && (
                    <span> • Academic Year: {examination.academicYear}</span>
                  )}
                </div>
              </header>

              {/* 2. STUDENT DETAILS STRIP */}
              <section className="rsm-student-strip" aria-label="Student Information">
                <div className="rsm-student-grid">
                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Student Name:</span>
                    <span className="rsm-detail-value">{student.name}</span>
                  </div>

                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Enrollment No:</span>
                    <span className="rsm-detail-value">{student.enrollmentNumber}</span>
                  </div>

                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Course / Branch:</span>
                    <span className="rsm-detail-value">
                      {course.name}
                      {course.code ? ` (${course.code})` : ""}
                    </span>
                  </div>

                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Semester:</span>
                    <span className="rsm-detail-value">
                      Semester {examination.semester}
                    </span>
                  </div>

                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Mother's Name:</span>
                    <span className="rsm-detail-value">{student.motherName}</span>
                  </div>

                  <div className="rsm-detail-row">
                    <span className="rsm-detail-label">Father's Name:</span>
                    <span className="rsm-detail-value">{student.fatherName}</span>
                  </div>
                </div>
              </section>

              {/* 3. SUBJECT-WISE MARKS TABLE */}
              <section className="rsm-table-container" aria-label="Marks Details">
                <table className="rsm-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: "12%" }}>Sub Code</th>
                      <th scope="col" style={{ width: "32%" }}>Subject Name</th>
                      <th scope="col" style={{ width: "12%" }}>Type</th>
                      <th scope="col" className="align-right" style={{ width: "12%" }}>
                        Internal
                      </th>
                      <th scope="col" className="align-right" style={{ width: "12%" }}>
                        External
                      </th>
                      <th scope="col" className="align-right" style={{ width: "12%" }}>
                        Total
                      </th>
                      <th scope="col" className="align-center" style={{ width: "8%" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length > 0 ? (
                      subjects.map((sub, idx) => {
                        const isPractical = sub.isPractical;
                        const subStatusLower = String(sub.status || "").toLowerCase();
                        const tagClass =
                          subStatusLower === "pass"
                            ? "pass"
                            : subStatusLower === "fail"
                            ? "fail"
                            : "incomplete";

                        const internalDisplay =
                          sub.internalMaxMarks != null
                            ? formatMarksRatio(sub.internalMarks, sub.internalMaxMarks)
                            : formatMark(sub.internalMarks);

                        const externalDisplay = isPractical
                          ? "—"
                          : sub.externalMaxMarks != null
                          ? formatMarksRatio(sub.externalMarks, sub.externalMaxMarks)
                          : formatMark(sub.externalMarks);

                        const totalDisplay =
                          sub.maxMarks != null
                            ? formatMarksRatio(sub.totalMarks, sub.maxMarks)
                            : formatMark(sub.totalMarks);

                        return (
                          <tr key={sub.subjectCode || idx}>
                            <td>
                              <span className="rsm-sub-code">{sub.subjectCode}</span>
                            </td>
                            <td>
                              <span className="rsm-sub-name">{sub.subjectName}</span>
                            </td>
                            <td>
                              <span className="rsm-sub-type">{sub.formattedType}</span>
                            </td>
                            <td className="align-right">{internalDisplay}</td>
                            <td className="align-right">{externalDisplay}</td>
                            <td className="align-right">
                              <strong>{totalDisplay}</strong>
                            </td>
                            <td className="align-center">
                              <span className={`rsm-status-tag ${tagClass}`}>
                                {sub.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "16px" }}>
                          No subject marks recorded for this semester.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              {/* 4. SEMESTER SUMMARY PANEL */}
              <section className="rsm-summary-block" aria-label="Semester Summary">
                <div className="rsm-summary-header">Semester Summary</div>
                <div className="rsm-summary-grid">
                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Total Marks Obtained:</span>
                    <span className="rsm-summary-val">
                      {formatMarksRatio(summary.totalMarks, summary.totalMaxMarks)}
                    </span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Overall Percentage:</span>
                    <span className="rsm-summary-val highlight-percentage">
                      {percentageDisplay}
                    </span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Result Status:</span>
                    <span className={`rsm-summary-val highlight-status rsm-status-tag ${statusClass}`}>
                      {getResultStatusLabel(summary.overallResult)}
                    </span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Total Subjects:</span>
                    <span className="rsm-summary-val">{summary.totalSubjects}</span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Passed Subjects:</span>
                    <span className="rsm-summary-val text-success">
                      {summary.passedSubjects}
                    </span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Failed Subjects:</span>
                    <span className="rsm-summary-val text-danger">
                      {summary.failedSubjects}
                    </span>
                  </div>

                  <div className="rsm-summary-item">
                    <span className="rsm-summary-label">Pending Evaluation:</span>
                    <span className="rsm-summary-val">
                      {summary.incompleteSubjects}
                    </span>
                  </div>

                  <div className="rsm-summary-item" style={{ gridColumn: "span 2" }}>
                    <span className="rsm-summary-label">Result Published Date:</span>
                    <span className="rsm-summary-val">
                      {examination.resultDate
                        ? formatDate(examination.resultDate)
                        : "—"}
                    </span>
                  </div>
                </div>
              </section>

              {/* 5. FOOTER & VERIFICATION BLOCK */}
              <footer className="rsm-footer">
                <div className="rsm-sign-grid">
                  <div className="rsm-sign-box">
                    <div className="rsm-sign-space"></div>
                    <div className="rsm-sign-line">Checked By</div>
                  </div>

                  <div className="rsm-sign-box">
                    <div className="rsm-sign-space"></div>
                    <div className="rsm-sign-line">Controller of Examinations</div>
                  </div>

                  <div className="rsm-sign-box">
                    <div className="rsm-sign-space"></div>
                    <div className="rsm-sign-line">Principal / Dean</div>
                  </div>
                </div>

                <p className="rsm-disclaimer">
                  This document is an authentic Statement of Marks generated by the
                  Examination Automation System. It reflects the official examination
                  records maintained by the institution.
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ResultStatementModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  statementData: PropTypes.shape({
    student: PropTypes.object,
    college: PropTypes.object,
    course: PropTypes.object,
    examination: PropTypes.object,
    subjects: PropTypes.array,
    summary: PropTypes.object,
  }),
};
