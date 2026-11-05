import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { ConsolidatedResultBanner } from "../../pages/dashboard/Student/StudentResults";
import ConsolidatedStatementModal from "../../pages/dashboard/Student/components/results/ConsolidatedStatementModal";
import * as resultsApi from "../../api/results";

describe("Phase 3 — Clean Final Consolidated Result UI & Marksheet Modal", () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    vi.restoreAllMocks();
  });

  const mockEligibleData = {
    isEligible: true,
    status: "ELIGIBLE",
    reasons: [],
    requiredSemesters: [1, 2, 3, 4],
    completedSemesters: [1, 2, 3, 4],
    missingSemesters: [],
    unpublishedSemesters: [],
    failedSemesters: [],
    incompleteSemesters: [],
    ambiguousSemesters: [],
    activeBacklogsCount: 0,
    student: {
      fullName: "Pooja Kulkarni",
      enrollmentNumber: "EN202311445",
      status: "APPROVED",
    },
    course: {
      name: "Computer Science",
      code: "CS01",
      durationYears: 2,
      durationSemesters: 4,
    },
    grandTotalMarks: 1600,
    grandTotalMaxMarks: 2000,
    aggregatePercentage: 80.0,
    summary: {
      totalSemesters: 4,
      completedSemesters: 4,
      grandTotalMarks: 1600,
      grandTotalMaxMarks: 2000,
      aggregatePercentage: 80.0,
      overallResult: "PASS",
    },
    semesters: [
      {
        semesterNumber: 1,
        academicYear: "2024-2025",
        examName: "Semester 1 Examination",
        totalMarks: 400,
        totalMaxMarks: 500,
        percentage: 80.0,
        overallResult: "PASS",
        subjects: [
          {
            subjectCode: "CS101",
            subjectName: "Programming in C",
            subjectType: "THEORY",
            internalMarks: 25,
            internalMaxMarks: 25,
            externalMarks: 75,
            externalMaxMarks: 75,
            totalMarks: 100,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      },
      {
        semesterNumber: 2,
        academicYear: "2024-2025",
        examName: "Semester 2 Examination",
        totalMarks: 400,
        totalMaxMarks: 500,
        percentage: 80.0,
        overallResult: "PASS",
        subjects: [
          {
            subjectCode: "CS201",
            subjectName: "Data Structures",
            subjectType: "THEORY",
            internalMarks: 25,
            internalMaxMarks: 25,
            externalMarks: 75,
            externalMaxMarks: 75,
            totalMarks: 100,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      },
      {
        semesterNumber: 3,
        academicYear: "2025-2026",
        examName: "Semester 3 Examination",
        totalMarks: 400,
        totalMaxMarks: 500,
        percentage: 80.0,
        overallResult: "PASS",
        subjects: [
          {
            subjectCode: "CS301",
            subjectName: "Algorithms",
            subjectType: "THEORY",
            internalMarks: 25,
            internalMaxMarks: 25,
            externalMarks: 75,
            externalMaxMarks: 75,
            totalMarks: 100,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      },
      {
        semesterNumber: 4,
        academicYear: "2025-2026",
        examName: "Semester 4 Examination",
        totalMarks: 400,
        totalMaxMarks: 500,
        percentage: 80.0,
        overallResult: "PASS",
        subjects: [
          {
            subjectCode: "CS401",
            subjectName: "Operating Systems",
            subjectType: "THEORY",
            internalMarks: 25,
            internalMaxMarks: 25,
            externalMarks: 75,
            externalMaxMarks: 75,
            totalMarks: 100,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      },
    ],
    clearedBacklogs: [
      {
        subjectCode: "CS101",
        subjectName: "Programming in C",
        originalSemester: 1,
        attemptNumber: 1,
        totalMarks: 85,
        status: "CLEARED",
      },
    ],
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. API CLIENT METHOD TEST
  // ──────────────────────────────────────────────────────────────────────────
  describe("API Client — getMyConsolidatedResult()", () => {
    it("is exported and available as a function", () => {
      expect(typeof resultsApi.getMyConsolidatedResult).toBe("function");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CLEAN DASHBOARD ACTION BAR REQUIREMENTS
  // ──────────────────────────────────────────────────────────────────────────
  describe("Clean Dashboard Action Bar (ConsolidatedResultBanner)", () => {
    it("1. The dashboard does not display unnecessary consolidated progress cards or large stat boxes", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={mockEligibleData}
            error={null}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      // Assert NO bulky progress cards or large dashboard stat grids
      expect(container.querySelector(".crb-metrics-grid")).toBeNull();
      expect(container.querySelector(".crb-guidance-box")).toBeNull();
      expect(container.querySelector(".crb-reasons-block")).toBeNull();
      expect(container.textContent).not.toContain("Total Marks to Date");
      expect(container.textContent).not.toContain("Current Aggregate");

      // Assert clean action bar layout exists
      const section = container.querySelector('[data-testid="final-consolidated-result-section"]');
      expect(section).not.toBeNull();
      expect(section.textContent).toContain("Final Consolidated Result");
    });

    it("2. Both final-result actions remain disabled while loading", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={true}
            data={null}
            error={null}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(true);
      expect(downloadBtn.disabled).toBe(true);
      expect(container.textContent).toContain("Verifying academic completion");
    });

    it("3. Both actions remain disabled when eligibility is false", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={{ isEligible: false, status: "INELIGIBLE" }}
            error={null}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(true);
      expect(downloadBtn.disabled).toBe(true);
    });

    it("4. Both actions remain disabled for missing, unpublished, failed, incomplete, or ambiguous results", () => {
      const testCases = [
        { status: "MISSING_SEMESTERS", label: "Course in progress" },
        { status: "UNPUBLISHED_SEMESTERS", label: "Results awaiting publication" },
        { status: "FAILED_SEMESTERS", label: "Failed semester" },
        { status: "INCOMPLETE_SEMESTERS", label: "Evaluation incomplete" },
        { status: "AMBIGUOUS_RESULT", label: "Conflicting result records detected" },
      ];

      for (const tc of testCases) {
        act(() => {
          root.render(
            <ConsolidatedResultBanner
              loading={false}
              data={{ isEligible: false, status: tc.status }}
              error={null}
              onPreview={() => {}}
              onDownload={() => {}}
            />
          );
        });

        const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
        const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

        expect(previewBtn.disabled).toBe(true);
        expect(downloadBtn.disabled).toBe(true);
        expect(container.textContent).toContain(tc.label);
      }
    });

    it("5. Both actions remain disabled when active backlogs exist", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={{ isEligible: false, status: "ACTIVE_BACKLOGS", activeBacklogsCount: 2 }}
            error={null}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(true);
      expect(downloadBtn.disabled).toBe(true);
      expect(container.textContent).toContain("2 active backlog(s) pending clearance");
    });

    it("6. Both actions remain disabled for UNKNOWN_ADMISSION_PATH", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={{ isEligible: false, status: "UNKNOWN_ADMISSION_PATH" }}
            error={null}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(true);
      expect(downloadBtn.disabled).toBe(true);
      expect(container.textContent).toContain("Admission verification required");
    });

    it("7. API errors never cause the actions to become enabled", () => {
      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={null}
            error={{ message: "Internal server error", statusCode: 500 }}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(true);
      expect(downloadBtn.disabled).toBe(true);
      expect(container.textContent).toContain("Status unavailable");
    });

    it("8. Both actions become available and clickable only for an authoritative eligible response", () => {
      let previewClicked = false;
      let downloadClicked = false;

      act(() => {
        root.render(
          <ConsolidatedResultBanner
            loading={false}
            data={mockEligibleData}
            error={null}
            onPreview={() => {
              previewClicked = true;
            }}
            onDownload={() => {
              downloadClicked = true;
            }}
          />
        );
      });

      const previewBtn = container.querySelector('[data-testid="preview-final-result-btn"]');
      const downloadBtn = container.querySelector('[data-testid="download-final-pdf-btn"]');

      expect(previewBtn.disabled).toBe(false);
      expect(downloadBtn.disabled).toBe(false);
      expect(container.textContent).toContain("Course Completed — Verified");

      act(() => {
        previewBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(previewClicked).toBe(true);

      act(() => {
        downloadBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(downloadClicked).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CONSOLIDATED STATEMENT MODAL & MULTI-PAGE MARKSHEET
  // ──────────────────────────────────────────────────────────────────────────
  describe("ConsolidatedStatementModal", () => {
    const mockModalStatement = {
      student: {
        name: "Pooja Kulkarni",
        enrollmentNumber: "EN202311445",
        motherName: "Sunita Kulkarni",
        fatherName: "Anand Kulkarni",
      },
      college: {
        name: "PVP Institute of Technology",
        code: "PVPIT-44",
        address: "Shivaji Nagar, Pune",
      },
      course: {
        name: "Computer Science & Engineering",
        code: "CSE",
        durationYears: 2,
        durationSemesters: 4,
      },
      semesters: mockEligibleData.semesters,
      clearedBacklogs: mockEligibleData.clearedBacklogs,
      grandTotalMarks: 1600,
      grandTotalMaxMarks: 2000,
      aggregatePercentage: 80.0,
      summary: mockEligibleData.summary,
    };

    it("9. Preview displays all required semesters in one consolidated marksheet", () => {
      act(() => {
        root.render(
          <ConsolidatedStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={mockModalStatement}
          />
        );
      });

      // Header & Branding
      expect(container.textContent).toContain("PVP Institute of Technology");
      expect(container.textContent).toContain("FINAL CONSOLIDATED STATEMENT OF MARKS");
      expect(container.textContent).toContain("Computer Science & Engineering");

      // Student info
      expect(container.textContent).toContain("Pooja Kulkarni");
      expect(container.textContent).toContain("EN202311445");
      expect(container.textContent).toContain("Sunita Kulkarni");
      expect(container.textContent).toContain("Anand Kulkarni");

      // Assert all 4 semesters appear in the marksheet
      expect(container.textContent).toContain("Semester 1 Examination");
      expect(container.textContent).toContain("Programming in C");
      expect(container.textContent).toContain("Semester 2 Examination");
      expect(container.textContent).toContain("Data Structures");
      expect(container.textContent).toContain("Semester 3 Examination");
      expect(container.textContent).toContain("Algorithms");
      expect(container.textContent).toContain("Semester 4 Examination");
      expect(container.textContent).toContain("Operating Systems");

      // Grand Summary
      expect(container.textContent).toContain("1600 / 2000");
      expect(container.textContent).toContain("80.00%");
      expect(container.textContent).toContain("All 4 Semesters Passed");

      // Institutional Signatures
      expect(container.textContent).toContain("Prepared & Verified By");
      expect(container.textContent).toContain("Controller of Examinations");
      expect(container.textContent).toContain("Principal / Registrar");
    });

    it("10. Modal includes Download PDF button and calls onClose on exit", () => {
      let closed = false;

      act(() => {
        root.render(
          <ConsolidatedStatementModal
            isOpen={true}
            onClose={() => {
              closed = true;
            }}
            statementData={mockModalStatement}
          />
        );
      });

      const downloadBtn = container.querySelector('[data-testid="csm-download-pdf-btn"]');
      expect(downloadBtn).not.toBeNull();
      expect(downloadBtn.textContent).toContain("Download PDF");

      const closeBtn = container.querySelector('[data-testid="csm-close-modal-btn"]');
      act(() => {
        closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(closed).toBe(true);
    });

    it("11. Cleared backlog marks remain excluded from regular totals and are listed separately", () => {
      act(() => {
        root.render(
          <ConsolidatedStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={mockModalStatement}
          />
        );
      });

      // Clearance history section
      expect(container.textContent).toContain("Supplementary / Backlog Examination Clearance History");
      expect(container.textContent).toContain("CS101");
      expect(container.textContent).toContain("CLEARED");
      expect(container.textContent).toContain(
        "Supplementary/backlog clearance marks are recorded separately and are not added to regular course grand totals"
      );

      // Grand totals reflect regular totals strictly (1600 / 2000), not adding the 85 backlog marks
      expect(container.textContent).toContain("1600 / 2000");
      expect(container.textContent).not.toContain("1685");
    });

    it("returns null when isOpen is false", () => {
      act(() => {
        root.render(
          <ConsolidatedStatementModal
            isOpen={false}
            onClose={() => {}}
            statementData={mockModalStatement}
          />
        );
      });

      expect(container.children.length).toBe(0);
    });
  });
});
