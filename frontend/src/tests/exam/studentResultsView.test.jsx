import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  BacklogSection,
  ResultsEmptyState,
} from "../../pages/dashboard/Student/StudentResults";
import YearSemesterResultCards from "../../pages/dashboard/Student/components/results/YearSemesterResultCards";

import {
  groupBacklogsBySubject,
  calculateBacklogSummary,
} from "../../utils/resultFormatters.util";

describe("Student Results UX — Components & Interactive Views", () => {
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
  });

  describe("YearSemesterResultCards — Active Hierarchy & Interactive Workflows", () => {
    const mockMultiYear = [
      {
        yearNumber: 1,
        yearLabel: "First Year",
        semesters: [
          {
            _id: "s1",
            semester: 1,
            examName: "Semester 1 Examination",
            academicYear: "2024-2025",
            courseName: "B.Tech Computer Science",
            totalMarks: 400,
            totalMaxMarks: 500,
            percentage: 80,
            overallResult: "PASS",
          },
          {
            _id: "s2",
            semester: 2,
            examName: "Semester 2 Examination",
            academicYear: "2024-2025",
            courseName: "B.Tech Computer Science",
            totalMarks: 390,
            totalMaxMarks: 500,
            percentage: 78,
            overallResult: "PASS",
          },
        ],
      },
      {
        yearNumber: 2,
        yearLabel: "Second Year",
        semesters: [
          {
            _id: "s3",
            semester: 3,
            examName: "Semester 3 Examination",
            academicYear: "2025-2026",
            courseName: "B.Tech Computer Science",
            totalMarks: 410,
            totalMaxMarks: 500,
            percentage: 82,
            overallResult: "PASS",
          },
        ],
      },
    ];

    it("renders all academic years and semester cards when selectedYear is ALL or null", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear="ALL"
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      expect(container.textContent).toContain("First Year");
      expect(container.textContent).toContain("Second Year");
      expect(container.textContent).toContain("Semester 1");
      expect(container.textContent).toContain("Semester 2");
      expect(container.textContent).toContain("Semester 3");
      expect(container.querySelectorAll(".sr-compact-sem-card").length).toBe(3);
    });

    it("displays only selected year semester cards and never leaks other years", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear={2}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      expect(container.textContent).toContain("Second Year");
      expect(container.textContent).toContain("Semester 3");
      expect(container.textContent).not.toContain("First Year");
      expect(container.textContent).not.toContain("Semester 1");
      expect(container.textContent).not.toContain("Semester 2");
      expect(container.querySelectorAll(".sr-compact-sem-card").length).toBe(1);
    });

    it("triggers onPreview callback with semester result when Preview Result button is clicked", () => {
      let previewedResult = null;
      const handlePreview = (res) => {
        previewedResult = res;
      };

      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear={1}
            onPreview={handlePreview}
            onDownload={() => {}}
          />
        );
      });

      const previewButtons = container.querySelectorAll(".sr-card-btn.preview-btn");
      expect(previewButtons.length).toBe(2);

      act(() => {
        previewButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(previewedResult).not.toBeNull();
      expect(previewedResult._id).toBe("s1");
      expect(previewedResult.semester).toBe(1);
    });

    it("triggers onDownload callback with semester result when Download PDF button is clicked", () => {
      let downloadedResult = null;
      const handleDownload = (res) => {
        downloadedResult = res;
      };

      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear={1}
            onPreview={() => {}}
            onDownload={handleDownload}
          />
        );
      });

      const downloadButtons = container.querySelectorAll(".sr-card-btn.download-btn");
      expect(downloadButtons.length).toBe(2);

      act(() => {
        downloadButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(downloadedResult).not.toBeNull();
      expect(downloadedResult._id).toBe("s2");
      expect(downloadedResult.semester).toBe(2);
    });

    it("filters by selectedSemester correctly across multiple academic years", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear="ALL"
            selectedSemester={2}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      expect(container.textContent).toContain("Semester 2");
      expect(container.textContent).not.toContain("Semester 1");
      expect(container.textContent).not.toContain("Semester 3");
      expect(container.querySelectorAll(".sr-compact-sem-card").length).toBe(1);
    });

    it("renders academic year badge and course metadata on cards", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockMultiYear}
            selectedYear={2}
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      expect(container.textContent).toContain("AY 2025-2026");
      expect(container.textContent).toContain("B.Tech Computer Science");
      expect(container.textContent).toContain("Semester 3 Examination");
    });

    it("returns null gracefully when groupedYears is empty or no semesters match", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={[]}
            selectedYear="ALL"
            onPreview={() => {}}
            onDownload={() => {}}
          />
        );
      });

      expect(container.innerHTML).toBe("");
    });
  });

  describe("BacklogSection — Grouping & Attempt Deduplication", () => {
    it("renders 1 unique subject card for multiple attempts and displays Backlog Cleared", () => {
      const rawAttempts = [
        {
          backlogId: "b101",
          subjectCode: "MATH101",
          subjectName: "Calculus I",
          subjectType: "THEORY",
          semester: 1,
          academicYear: "2024-2025",
          examName: "Winter 2024",
          attemptNumber: 1,
          resultStatus: "FAIL",
          cleared: false,
          internalMarks: 15,
          externalMarks: 25,
          totalMarks: 40,
        },
        {
          backlogId: "b101",
          subjectCode: "MATH101",
          subjectName: "Calculus I",
          subjectType: "THEORY",
          semester: 1,
          academicYear: "2024-2025",
          examName: "Summer 2025",
          attemptNumber: 2,
          resultStatus: "PASS",
          cleared: true,
          internalMarks: 22,
          externalMarks: 50,
          totalMarks: 72,
        },
      ];

      const grouped = groupBacklogsBySubject(rawAttempts);
      expect(grouped.length).toBe(1);

      const summary = calculateBacklogSummary(grouped);
      expect(summary.total).toBe(1);
      expect(summary.cleared).toBe(1);
      expect(summary.reappear).toBe(0);

      act(() => {
        root.render(<BacklogSection groupedBacklogs={grouped} />);
      });

      // Assert subject header shows Backlog Cleared
      expect(container.textContent).toContain("Calculus I");
      expect(container.textContent).toContain("Backlog Cleared");
      expect(container.textContent).toContain("2 Attempts");

      // Initially drawer is collapsed
      expect(container.querySelector(".sr-attempts-table")).toBeNull();

      // Click to expand attempt history
      const toggleBtn = container.querySelector(".sr-toggle-history-btn");
      act(() => {
        toggleBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      // Drawer is now open
      expect(container.querySelector(".sr-attempts-table")).not.toBeNull();
      expect(container.textContent).toContain("Attempt #1");
      expect(container.textContent).toContain("Attempt #2");
      expect(container.textContent).toContain("Winter 2024");
      expect(container.textContent).toContain("Summer 2025");
    });

    it("renders celebration empty state when student has no backlogs", () => {
      act(() => {
        root.render(<BacklogSection groupedBacklogs={[]} />);
      });

      expect(container.textContent).toContain("No Active Backlogs");
      expect(container.textContent).toContain("Great! You currently don't have any backlog subjects");
    });
  });

  describe("ResultsEmptyState", () => {
    it("renders no-published-results empty state", () => {
      act(() => {
        root.render(<ResultsEmptyState type="no-published-results" onGoBack={() => {}} />);
      });

      expect(container.textContent).toContain("No Results Published Yet");
      expect(container.textContent).toContain("Back to Dashboard");
    });

    it("renders no-semester-results empty state", () => {
      act(() => {
        root.render(
          <ResultsEmptyState
            type="no-semester-results"
            semesterNumber={4}
            onResetFilter={() => {}}
          />
        );
      });

      expect(container.textContent).toContain("No Published Result for Semester 4");
      expect(container.textContent).toContain("View All Semesters");
    });

    it("renders no-year-results empty state with friendly message", () => {
      act(() => {
        root.render(
          <ResultsEmptyState
            type="no-year-results"
            yearLabel="Second Year"
          />
        );
      });

      expect(container.textContent).toContain("No published results for Second Year yet.");
    });
  });
});
