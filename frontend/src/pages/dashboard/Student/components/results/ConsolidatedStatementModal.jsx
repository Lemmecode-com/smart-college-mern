import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  FaDownload,
  FaTimes,
  FaUniversity,
  FaFileAlt,
  FaSpinner,
  FaGraduationCap,
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
import { generateConsolidatedStatementFilename } from "../../../../../utils/resultStatementDataMapper";
import "./ConsolidatedStatementModal.css";

/**
 * Final Consolidated Result Statement Modal & Multi-Page Marksheet Component.
 *
 * Implements an authoritative university consolidated marksheet spanning all
 * completed course semesters, separate backlog clearance history, and grand totals.
 *
 * Supports:
 * 1. Clean interactive on-screen marksheet preview
 * 2. 1-click A4 portrait multi-page PDF generation via html2canvas + jsPDF
 * 3. Browser printing via window.print() and dedicated @media print rules
 */
export default function ConsolidatedStatementModal({
  isOpen,
  onClose,
  statementData,
  autoDownload = false,
}) {
  const sheetRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const autoDownloadedRef = useRef(false);

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

  // Handle PDF Generation (html2canvas + jsPDF with clean pagination)
  const handleDownloadPdf = async () => {
    if (!sheetRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    const toastId = toast.loading("Preparing Final Consolidated Marksheet PDF...");

    try {
      // 1. Render Sheet to High-Resolution Canvas
      const canvas = await Promise.race([
        html2canvas(sheetRef.current, {
          scale: 2.2,
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
        throw new Error("Unable to capture consolidated statement document");
      }

      const imgData = canvas.toDataURL("image/png");

      // 2. Initialize Portrait A4 jsPDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Proportional height in millimeters
      const pdfHeight = (canvas.height * pageWidth) / canvas.width;

      // 3. Clean Multi-Page Pagination
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
      const filename = generateConsolidatedStatementFilename(statementData);
      pdf.save(filename);

      toast.update(toastId, {
        render: "Final Consolidated Marksheet downloaded successfully!",
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

  // Trigger auto-download if requested on modal open
  useEffect(() => {
    if (isOpen && autoDownload && !autoDownloadedRef.current && sheetRef.current) {
      autoDownloadedRef.current = true;
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 400);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      autoDownloadedRef.current = false;
    }
  }, [isOpen, autoDownload]);

  if (!isOpen || !statementData) {
    return null;
  }

  const {
    student = {},
    college = {},
    course = {},
    semesters = [],
    clearedBacklogs = [],
    grandTotalMarks = null,
    grandTotalMaxMarks = null,
    aggregatePercentage = null,
    summary = {},
  } = statementData;

  const percentageDisplay =
    aggregatePercentage !== null && aggregatePercentage !== undefined
      ? `${Number(aggregatePercentage).toFixed(2)}%`
      : "—";

  const overallResultDisplay = summary?.overallResult || "PASS";

  return (
    <div
      className="csm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csm-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGeneratingPdf) {
          onClose();
        }
      }}
      data-testid="consolidated-statement-modal"
    >
      <div className="csm-dialog">
        {/* Action Toolbar (Sticky at Top) */}
        <div className="csm-toolbar no-print">
          <div className="csm-toolbar-title-group">
            <div className="csm-toolbar-icon" aria-hidden="true">
              <FaGraduationCap />
            </div>
            <div>
              <h3 id="csm-modal-title" className="csm-toolbar-title">
                Final Consolidated Statement Preview
              </h3>
              <span className="csm-toolbar-subtitle">
                {course.name || "Degree Course"} • Complete Course Records
              </span>
            </div>
          </div>

          <div className="csm-toolbar-actions">
            <button
              type="button"
              className="csm-action-btn primary"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              title="Download Consolidated A4 PDF"
              data-testid="csm-download-pdf-btn"
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
              className="csm-action-btn close-btn"
              onClick={onClose}
              disabled={isGeneratingPdf}
              aria-label="Close Preview"
              data-testid="csm-close-modal-btn"
            >
              <FaTimes aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Container */}
        <div className="csm-content">
          {/* Printable A4 Marksheet Sheet Container */}
          <div
            className="consolidated-statement-paper"
            ref={sheetRef}
            id="consolidated-statement-sheet"
          >
            <div className="csm-paper-inner-frame">
              {/* 1. INSTITUTIONAL HEADER */}
              <header className="csm-header">
                <div className="csm-logo-wrapper">
                  {college.logo ? (
                    <img
                      src={college.logo}
                      alt={college.name || "College Logo"}
                      className="csm-college-logo"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="csm-logo-fallback" aria-hidden="true">
                      <FaUniversity />
                    </div>
                  )}
                </div>

                <h1 className="csm-college-name">
                  {college.name || "COLLEGE / INSTITUTION NAME"}
                </h1>

                {college.address && (
                  <p className="csm-college-address">{college.address}</p>
                )}

                <div className="csm-banner-wrapper">
                  <span className="csm-statement-banner">
                    FINAL CONSOLIDATED STATEMENT OF MARKS
                  </span>
                </div>

                <div className="csm-course-banner">
                  <span>{course.name || "ACADEMIC PROGRAM"}</span>
                  {course.code && <span> ({course.code})</span>}
                </div>
              </header>

              {/* 2. STUDENT DETAILS STRIP */}
              <section className="csm-student-strip" aria-label="Student Information">
                <div className="csm-student-grid">
                  <div className="csm-detail-row">
                    <span className="csm-detail-label">Student Name:</span>
                    <span className="csm-detail-value">{student.name}</span>
                  </div>

                  <div className="csm-detail-row">
                    <span className="csm-detail-label">Enrollment No:</span>
                    <span className="csm-detail-value">{student.enrollmentNumber}</span>
                  </div>

                  <div className="csm-detail-row">
                    <span className="csm-detail-label">Course / Branch:</span>
                    <span className="csm-detail-value">
                      {course.name}
                      {course.code ? ` (${course.code})` : ""}
                    </span>
                  </div>

                  <div className="csm-detail-row">
                    <span className="csm-detail-label">Total Duration:</span>
                    <span className="csm-detail-value">
                      {course.durationYears ? `${course.durationYears} Years / ` : ""}
                      {course.durationSemesters ? `${course.durationSemesters} Semesters` : `${semesters.length} Semesters`}
                    </span>
                  </div>

                  {student.motherName && student.motherName !== "—" && (
                    <div className="csm-detail-row">
                      <span className="csm-detail-label">Mother's Name:</span>
                      <span className="csm-detail-value">{student.motherName}</span>
                    </div>
                  )}

                  {student.fatherName && student.fatherName !== "—" && (
                    <div className="csm-detail-row">
                      <span className="csm-detail-label">Father's Name:</span>
                      <span className="csm-detail-value">{student.fatherName}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. SEMESTER-WISE MARKS RECORD TABLES */}
              <section className="csm-semesters-container" aria-label="Semester-Wise Academic Records">
                {semesters.map((sem) => {
                  const semNum = sem.semesterNumber || sem.semester;
                  const subjects = sem.subjects || [];

                  return (
                    <div
                      key={semNum}
                      className="csm-semester-block"
                      aria-label={`Semester ${semNum} Results`}
                    >
                      <div className="csm-sem-header">
                        <span className="csm-sem-title">
                          Semester {semNum} Examination
                        </span>
                        <span className="csm-sem-meta">
                          {sem.academicYear && `AY: ${sem.academicYear}`}
                          {sem.examName && ` • ${sem.examName}`}
                        </span>
                      </div>

                      <table className="csm-table">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: "12%" }}>Sub Code</th>
                            <th scope="col" style={{ width: "34%" }}>Subject Name</th>
                            <th scope="col" style={{ width: "12%" }}>Type</th>
                            <th scope="col" className="align-right" style={{ width: "11%" }}>
                              Internal
                            </th>
                            <th scope="col" className="align-right" style={{ width: "11%" }}>
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
                          {subjects.map((sub, sIdx) => {
                            const isPractical = String(sub.subjectType).toUpperCase() === "PRACTICAL";
                            const subStatus = sub.status || (sub.passed ? "PASS" : "FAIL");
                            const statusLower = String(subStatus).toLowerCase();
                            const tagClass =
                              statusLower === "pass"
                                ? "pass"
                                : statusLower === "fail"
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
                              <tr key={sub.subjectCode || sIdx}>
                                <td>
                                  <span className="csm-sub-code">{sub.subjectCode}</span>
                                </td>
                                <td>
                                  <span className="csm-sub-name">{sub.subjectName}</span>
                                </td>
                                <td>
                                  <span className="csm-sub-type">{sub.subjectType}</span>
                                </td>
                                <td className="align-right">{internalDisplay}</td>
                                <td className="align-right">{externalDisplay}</td>
                                <td className="align-right">
                                  <strong>{totalDisplay}</strong>
                                </td>
                                <td className="align-center">
                                  <span className={`csm-status-tag ${tagClass}`}>
                                    {subStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="csm-subtotal-row">
                            <td colSpan="3" className="csm-subtotal-label">
                              Semester {semNum} Summary:
                            </td>
                            <td colSpan="3" className="align-right csm-subtotal-val">
                              Total: <strong>{formatMarksRatio(sem.totalMarks, sem.totalMaxMarks)}</strong>
                              {sem.percentage != null && (
                                <span className="csm-subtotal-pct">
                                  {" "}({sem.percentage.toFixed(2)}%)
                                </span>
                              )}
                            </td>
                            <td className="align-center">
                              <span className="csm-status-tag pass">
                                {sem.overallResult || "PASS"}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })}
              </section>

              {/* 4. SUPPLEMENTARY / BACKLOG CLEARANCE TABLE (IF ANY CLEARED BACKLOGS EXIST) */}
              {Array.isArray(clearedBacklogs) && clearedBacklogs.length > 0 && (
                <section
                  className="csm-backlog-clearance-section"
                  aria-label="Supplementary Examination Clearance History"
                >
                  <div className="csm-clearance-header">
                    Supplementary / Backlog Examination Clearance History
                  </div>
                  <table className="csm-table csm-clearance-table">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "12%" }}>Sub Code</th>
                        <th scope="col" style={{ width: "32%" }}>Subject Name</th>
                        <th scope="col" style={{ width: "12%" }}>Type</th>
                        <th scope="col" className="align-center" style={{ width: "14%" }}>
                          Original Sem
                        </th>
                        <th scope="col" className="align-center" style={{ width: "10%" }}>
                          Attempt
                        </th>
                        <th scope="col" className="align-right" style={{ width: "12%" }}>
                          Marks
                        </th>
                        <th scope="col" className="align-center" style={{ width: "8%" }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clearedBacklogs.map((backlog, bIdx) => (
                        <tr key={backlog.attemptId || backlog.subjectCode || bIdx}>
                          <td>
                            <span className="csm-sub-code">{backlog.subjectCode}</span>
                          </td>
                          <td>
                            <span className="csm-sub-name">{backlog.subjectName}</span>
                          </td>
                          <td>
                            <span className="csm-sub-type">{backlog.subjectType || "THEORY"}</span>
                          </td>
                          <td className="align-center">
                            Semester {backlog.originalSemester ?? "—"}
                          </td>
                          <td className="align-center">
                            Attempt {backlog.attemptNumber ?? 1}
                          </td>
                          <td className="align-right">
                            <strong>{formatMark(backlog.totalMarks)}</strong>
                          </td>
                          <td className="align-center">
                            <span className="csm-status-tag pass">
                              CLEARED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="csm-clearance-note">
                    * Supplementary/backlog clearance marks are recorded separately and are not added to regular course grand totals or aggregate percentage.
                  </p>
                </section>
              )}

              {/* 5. GRAND COURSE SUMMARY PANEL */}
              <section className="csm-grand-summary-block" aria-label="Consolidated Course Grand Summary">
                <div className="csm-grand-summary-title">
                  Grand Academic Performance Summary
                </div>
                <div className="csm-grand-summary-grid">
                  <div className="csm-grand-item">
                    <span className="csm-grand-label">Grand Total Marks Obtained:</span>
                    <span className="csm-grand-val highlight">
                      {formatMarksRatio(grandTotalMarks, grandTotalMaxMarks)}
                    </span>
                  </div>

                  <div className="csm-grand-item">
                    <span className="csm-grand-label">Aggregate Percentage:</span>
                    <span className="csm-grand-val percentage">
                      {percentageDisplay}
                    </span>
                  </div>

                  <div className="csm-grand-item">
                    <span className="csm-grand-label">Final Course Result:</span>
                    <span className="csm-grand-val result-pass">
                      {getResultStatusLabel(overallResultDisplay)}
                    </span>
                  </div>

                  <div className="csm-grand-item">
                    <span className="csm-grand-label">Semesters Completed:</span>
                    <span className="csm-grand-val">
                      All {semesters.length} Semesters Passed
                    </span>
                  </div>
                </div>
              </section>

              {/* 6. INSTITUTIONAL SIGNATURES & VERIFICATION FOOTER */}
              <footer className="csm-footer">
                <div className="csm-sign-grid">
                  <div className="csm-sign-box">
                    <div className="csm-sign-line"></div>
                    <span className="csm-sign-role">Prepared & Verified By</span>
                    <span className="csm-sign-sub">Examination Committee</span>
                  </div>

                  <div className="csm-sign-box">
                    <div className="csm-sign-line"></div>
                    <span className="csm-sign-role">Controller of Examinations</span>
                    <span className="csm-sign-sub">NOVAA Academic Cell</span>
                  </div>

                  <div className="csm-sign-box">
                    <div className="csm-sign-line"></div>
                    <span className="csm-sign-role">Principal / Registrar</span>
                    <span className="csm-sign-sub">{college.name || "Institution"}</span>
                  </div>
                </div>

                <div className="csm-legal-note">
                  This document serves as an authentic consolidated statement of examination marks across all academic semesters of the prescribed course.
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ConsolidatedStatementModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  statementData: PropTypes.shape({
    student: PropTypes.shape({
      name: PropTypes.string,
      enrollmentNumber: PropTypes.string,
      motherName: PropTypes.string,
      fatherName: PropTypes.string,
    }),
    college: PropTypes.shape({
      name: PropTypes.string,
      code: PropTypes.string,
      logo: PropTypes.string,
      address: PropTypes.string,
    }),
    course: PropTypes.shape({
      name: PropTypes.string,
      code: PropTypes.string,
      durationYears: PropTypes.number,
      durationSemesters: PropTypes.number,
    }),
    semesters: PropTypes.arrayOf(
      PropTypes.shape({
        semesterNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        academicYear: PropTypes.string,
        examName: PropTypes.string,
        totalMarks: PropTypes.number,
        totalMaxMarks: PropTypes.number,
        percentage: PropTypes.number,
        overallResult: PropTypes.string,
        subjects: PropTypes.array,
      })
    ),
    clearedBacklogs: PropTypes.array,
    grandTotalMarks: PropTypes.number,
    grandTotalMaxMarks: PropTypes.number,
    aggregatePercentage: PropTypes.number,
    summary: PropTypes.object,
  }),
  autoDownload: PropTypes.bool,
};
