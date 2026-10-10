import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  SemesterSelector,
  ResultSummaryHero,
  SubjectResultsSection,
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

  describe("SemesterSelector", () => {
    it("renders horizontal semester tabs and highlights active tab", () => {
      let selected = "ALL";
      const handleSelect = (sem) => {
        selected = sem;
      };

      act(() => {
        root.render(
          <SemesterSelector
            semesters={[3, 2, 1]}
            selectedSemester={3}
            onSelectSemester={handleSelect}
            currentSemester={3}
          />
        );
      });

      const buttons = container.querySelectorAll(".sr-semester-pill");
      expect(buttons.length).toBe(4); // All + Sem 3 + Sem 2 + Sem 1

      // First button is All Semesters
      expect(buttons[0].textContent).toContain("All Semesters");

      // Second button is Semester 3 with Latest tag
      expect(buttons[1].textContent).toContain("Semester 3");
      expect(buttons[1].textContent).toContain("Latest");
      expect(buttons[1].classList.contains("active")).toBe(true);

      // Third button is Semester 2
      expect(buttons[2].textContent).toContain("Semester 2");

      // Clicking calls callback
      act(() => {
        buttons[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(selected).toBe(2);
    });
  });

  describe("ResultSummaryHero", () => {
    const mockResult = {
      semester: 3,
      academicYear: "2025-2026",
      overallResult: "PASS",
      totalMarks: 330,
      totalMaxMarks: 350,
      percentage: 94.29,
      passedSubjects: 4,
      failedSubjects: 0,
      incompleteSubjects: 0,
      totalSubjects: 4,
      backlogCount: 0,
      publishedAt: "2026-01-15T10:00:00.000Z",
      exam_id: { name: "Semester 3 Regular Exams" },
      subjects: [
        { totalMarks: 80, maxMarks: 100 },
        { totalMarks: 85, maxMarks: 100 },
        { totalMarks: 75, maxMarks: 75 },
        { totalMarks: 90, maxMarks: 75 },
      ],
    };

    it("renders semester result hero card with overall percentage, total marks ratio, and counts", () => {
      act(() => {
        root.render(<ResultSummaryHero result={mockResult} isAllView={false} />);
      });

      expect(container.textContent).toContain("Semester 3 Result");
      expect(container.textContent).toContain("PASSED");
      // Priority 1: Overall Percentage
      expect(container.textContent).toContain("94.29%");
      expect(container.textContent).toContain("Overall Percentage");
      // Priority 2: Total Marks
      expect(container.textContent).toContain("330 / 350");
      expect(container.textContent).toContain("Total Marks");
      // Priority 4: Passed / Failed / Backlogs
      expect(container.textContent).toContain("4");
      expect(container.textContent).toContain("Passed");
      expect(container.textContent).toContain("0");
      expect(container.textContent).toContain("Failed");
    });

    it("handles incomplete semester without displaying 0% or misleading percentage", () => {
      const mockIncomplete = {
        ...mockResult,
        overallResult: "INCOMPLETE",
        totalMarks: 80,
        totalMaxMarks: null,
        percentage: null,
      };

      act(() => {
        root.render(<ResultSummaryHero result={mockIncomplete} isAllView={false} />);
      });

      expect(container.textContent).toContain("RESULT PENDING");
      expect(container.textContent).toContain("Percentage Pending");
      expect(container.textContent).not.toContain("0%");
    });

    it("renders Academic Performance Overview and semester breakdown cards when isAllView is true", () => {
      const onSelectSemester = vi.fn ? vi.fn() : () => {};
      const allResults = [
        mockResult,
        {
          semester: 2,
          examName: "Semester 2 Exams",
          overallResult: "PASS",
          totalMarks: 300,
          totalMaxMarks: 350,
          percentage: 85.71,
          passedSubjects: 3,
          failedSubjects: 1,
          backlogCount: 1,
          totalSubjects: 4,
          subjects: [{ totalMarks: 70, maxMarks: 100 }],
        },
      ];

      act(() => {
        root.render(
          <ResultSummaryHero
            isAllView={true}
            allResults={allResults}
            onSelectSemester={onSelectSemester}
          />
        );
      });

      // Priority 1: Latest Examination Result Hero
      expect(container.textContent).toContain("Latest Examination Result");
      expect(container.textContent).toContain("Academic Performance");
      expect(container.textContent).toContain("Passed Subjects");
      expect(container.textContent).toContain("7"); // 4 + 3
      expect(container.textContent).toContain("Failed Subjects");
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("Semester Performance Breakdown");

      // Verify semester breakdown cards and View Details actions
      expect(container.textContent).toContain("Semester 3");
      expect(container.textContent).toContain("94.29%");
      expect(container.textContent).toContain("330 / 350");
      expect(container.textContent).toContain("Semester 2");
      expect(container.textContent).toContain("85.71%");
      expect(container.textContent).toContain("300 / 350");
      expect(container.textContent).toContain("View Details");
    });

    it("does NOT render subject tables in overview mode and triggers onSelectSemester on View Details click", () => {
      let selectedSem = null;
      const handleSelect = (sem) => {
        selectedSem = sem;
      };

      const allResults = [
        mockResult,
        {
          semester: 2,
          examName: "Semester 2 Exams",
          overallResult: "PASS",
          totalMarks: 300,
          totalMaxMarks: 350,
          percentage: 85.71,
          passedSubjects: 3,
          failedSubjects: 1,
          backlogCount: 1,
          totalSubjects: 4,
          subjects: [{ totalMarks: 70, maxMarks: 100 }],
        },
      ];

      act(() => {
        root.render(
          <ResultSummaryHero
            isAllView={true}
            allResults={allResults}
            onSelectSemester={handleSelect}
          />
        );
      });

      // Overview mode contains zero subject tables
      expect(container.querySelector(".sr-table")).toBeNull();

      // Find View Details action buttons
      const viewDetailsButtons = container.querySelectorAll(".sr-view-details-action-btn");
      expect(viewDetailsButtons.length).toBe(2);

      // Clicking View Details for Semester 2 sets selectedSem to 2
      act(() => {
        viewDetailsButtons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(selectedSem).toBe(2);
    });
  });

  describe("SubjectResultsSection", () => {
    const mockSubjects = [
      {
        subject: "s1",
        subjectName: "Database Systems",
        subjectCode: "CS301",
        subjectType: "THEORY",
        internalMarks: 25,
        externalMarks: 60,
        totalMarks: 85,
        maxMarks: 100,
        status: "PASS",
        marksRecorded: true,
      },
      {
        subject: "s2",
        subjectName: "Operating Systems Lab",
        subjectCode: "CS302",
        subjectType: "PRACTICAL",
        internalMarks: 45,
        externalMarks: null,
        totalMarks: 45,
        maxMarks: 50,
        status: "PASS",
        marksRecorded: true,
      },
    ];

    it("renders desktop table and mobile cards with total marks ratio and NO subject percentage", () => {
      act(() => {
        root.render(<SubjectResultsSection subjects={mockSubjects} examName="Sem 3 Exams" />);
      });

      expect(container.textContent).toContain("Database Systems");
      expect(container.textContent).toContain("CS301");
      expect(container.textContent).toContain("Operating Systems Lab");
      expect(container.textContent).toContain("Practical");

      // Verify marks displayed as obtained / max
      expect(container.textContent).toContain("85 / 100");
      expect(container.textContent).toContain("45 / 50");

      // VERY IMPORTANT: Subject percentage must NOT be displayed anywhere in the subject section
      expect(container.textContent).not.toContain("%");

      // Verify desktop table and mobile card both exist
      expect(container.querySelector(".sr-table")).not.toBeNull();
      expect(container.querySelectorAll(".sr-mobile-subject-card").length).toBe(2);
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

  describe("YearSemesterResultCards — Year Filtering", () => {
    const mockMultiYear = [
      {
        yearNumber: 1,
        yearLabel: "First Year",
        semesters: [
          {
            _id: "s1",
            semester: 1,
            examName: "Sem 1",
            totalMarks: 400,
            totalMaxMarks: 500,
            percentage: 80,
            overallResult: "PASS",
          },
          {
            _id: "s2",
            semester: 2,
            examName: "Sem 2",
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
            examName: "Sem 3",
            totalMarks: 410,
            totalMaxMarks: 500,
            percentage: 82,
            overallResult: "PASS",
          },
        ],
      },
    ];

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
      expect(container.textContent).toContain("Sem 3");
      expect(container.textContent).not.toContain("410 / 500");
      expect(container.textContent).not.toContain("Semester 1");
      expect(container.textContent).not.toContain("Semester 2");
      expect(container.textContent).not.toContain("First Year");
    });
  });
});
