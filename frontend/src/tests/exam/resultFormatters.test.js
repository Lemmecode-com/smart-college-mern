import { describe, it, expect } from "vitest";
import {
  getResultStatusLabel,
  getResultStatusTone,
  formatMark,
  formatSubjectType,
  getAvailableSemesters,
  getCurrentSemesterNumber,
  filterResultsBySemester,
  calculateObtainedMarks,
  groupBacklogsBySubject,
  calculateBacklogSummary,
  formatPercentage,
  formatMarksRatio,
  calculateCumulativeSummary,
} from "../../utils/resultFormatters.util";

describe("resultFormatters.util — Status Mapping & Calculations", () => {
  describe("getResultStatusLabel", () => {
    it("maps PASS -> Passed", () => {
      expect(getResultStatusLabel("PASS")).toBe("Passed");
      expect(getResultStatusLabel("pass")).toBe("Passed");
    });

    it("maps FAIL -> Failed", () => {
      expect(getResultStatusLabel("FAIL")).toBe("Failed");
      expect(getResultStatusLabel("fail")).toBe("Failed");
    });

    it("maps INCOMPLETE -> Result Pending", () => {
      expect(getResultStatusLabel("INCOMPLETE")).toBe("Result Pending");
    });

    it("maps OPEN -> Re-appear Required", () => {
      expect(getResultStatusLabel("OPEN")).toBe("Re-appear Required");
    });

    it("maps ATTEMPTED -> Evaluation Pending", () => {
      expect(getResultStatusLabel("ATTEMPTED")).toBe("Evaluation Pending");
    });

    it("maps CLEARED -> Backlog Cleared", () => {
      expect(getResultStatusLabel("CLEARED")).toBe("Backlog Cleared");
    });

    it("handles null / undefined safely", () => {
      expect(getResultStatusLabel(null)).toBe("Pending");
      expect(getResultStatusLabel(undefined)).toBe("Pending");
    });
  });

  describe("getResultStatusTone", () => {
    it("returns success tone for PASS and CLEARED", () => {
      expect(getResultStatusTone("PASS").tone).toBe("success");
      expect(getResultStatusTone("CLEARED").tone).toBe("success");
    });

    it("returns danger tone for FAIL and OPEN", () => {
      expect(getResultStatusTone("FAIL").tone).toBe("danger");
      expect(getResultStatusTone("OPEN").tone).toBe("danger");
    });

    it("returns warning tone for INCOMPLETE", () => {
      expect(getResultStatusTone("INCOMPLETE").tone).toBe("warning");
    });

    it("returns info tone for ATTEMPTED", () => {
      expect(getResultStatusTone("ATTEMPTED").tone).toBe("info");
    });
  });

  describe("formatMark", () => {
    it("preserves 0 as a valid numeric mark", () => {
      expect(formatMark(0)).toBe(0);
    });

    it("preserves positive marks", () => {
      expect(formatMark(45)).toBe(45);
    });

    it("converts null and undefined to an em-dash", () => {
      expect(formatMark(null)).toBe("—");
      expect(formatMark(undefined)).toBe("—");
    });
  });

  describe("formatSubjectType", () => {
    it("formats THEORY, PRACTICAL, COMPOSITE", () => {
      expect(formatSubjectType("THEORY")).toBe("Theory");
      expect(formatSubjectType("PRACTICAL")).toBe("Practical");
      expect(formatSubjectType("COMPOSITE")).toBe("Theory & Practical");
      expect(formatSubjectType(null)).toBe("Theory");
    });
  });

  describe("Semester Filtering & Selection", () => {
    const mockResults = [
      { _id: "r1", semester: 1, overallResult: "PASS" },
      { _id: "r2", semester: 3, overallResult: "PASS" },
      { _id: "r3", semester: 2, overallResult: "FAIL" },
    ];

    it("extracts and sorts semesters descending", () => {
      expect(getAvailableSemesters(mockResults)).toEqual([3, 2, 1]);
    });

    it("identifies highest semester as current semester", () => {
      expect(getCurrentSemesterNumber(mockResults)).toBe(3);
    });

    it("filters results by semester without mutating original array", () => {
      const originalCopy = JSON.parse(JSON.stringify(mockResults));
      const filtered = filterResultsBySemester(mockResults, 3);
      expect(filtered.length).toBe(1);
      expect(filtered[0].semester).toBe(3);
      expect(mockResults).toEqual(originalCopy);
    });

    it("returns all results when selectedSemester is ALL", () => {
      expect(filterResultsBySemester(mockResults, "ALL").length).toBe(3);
    });
  });

  describe("calculateObtainedMarks", () => {
    it("sums totalMarks safely without computing percentage or maximum", () => {
      const subjects = [
        { totalMarks: 45 },
        { totalMarks: 50 },
        { totalMarks: null },
      ];
      const res = calculateObtainedMarks(subjects);
      expect(res.obtainedMarks).toBe(95);
      expect(res.enteredCount).toBe(2);
      expect(res.totalCount).toBe(3);
    });

    it("handles 0 marks correctly", () => {
      const subjects = [{ totalMarks: 0 }, { totalMarks: 25 }];
      const res = calculateObtainedMarks(subjects);
      expect(res.obtainedMarks).toBe(25);
    });
  });

  describe("Backlog Grouping & De-duplication", () => {
    it("groups multiple attempts for the same backlog subject", () => {
      const rawAttempts = [
        {
          backlogId: "b1",
          subjectCode: "CS101",
          subjectName: "Programming I",
          attemptNumber: 1,
          resultStatus: "FAIL",
          passed: false,
          cleared: false,
        },
        {
          backlogId: "b1",
          subjectCode: "CS101",
          subjectName: "Programming I",
          attemptNumber: 2,
          resultStatus: "PASS",
          passed: true,
          cleared: true,
        },
      ];

      const grouped = groupBacklogsBySubject(rawAttempts);
      expect(grouped.length).toBe(1);

      const item = grouped[0];
      expect(item.subjectCode).toBe("CS101");
      expect(item.attemptCount).toBe(2);
      expect(item.isCleared).toBe(true);
      expect(item.finalStatus).toBe("CLEARED");
      expect(item.finalStatusLabel).toBe("Backlog Cleared");

      // Verify attempts are ordered chronologically
      expect(item.attempts[0].attemptNumber).toBe(1);
      expect(item.attempts[0].resultStatus).toBe("FAIL");
      expect(item.attempts[1].attemptNumber).toBe(2);
      expect(item.attempts[1].resultStatus).toBe("PASS");
    });

    it("calculates backlog summary metrics on UNIQUE subjects, not attempts", () => {
      const rawAttempts = [
        // Subject 1: Attempt 1 FAIL, Attempt 2 PASS -> CLEARED
        {
          backlogId: "b1",
          subjectCode: "CS101",
          attemptNumber: 1,
          resultStatus: "FAIL",
          cleared: false,
        },
        {
          backlogId: "b1",
          subjectCode: "CS101",
          attemptNumber: 2,
          resultStatus: "PASS",
          cleared: true,
        },
        // Subject 2: Attempt 1 FAIL -> OPEN (Re-appear required)
        {
          backlogId: "b2",
          subjectCode: "CS102",
          attemptNumber: 1,
          resultStatus: "FAIL",
          cleared: false,
        },
        // Subject 3: Attempt 1 INCOMPLETE -> ATTEMPTED (Pending)
        {
          backlogId: "b3",
          subjectCode: "CS103",
          attemptNumber: 1,
          resultStatus: "INCOMPLETE",
          cleared: false,
        },
      ];

      const grouped = groupBacklogsBySubject(rawAttempts);
      expect(grouped.length).toBe(3); // 3 unique subjects, despite 4 attempts

      const summary = calculateBacklogSummary(grouped);
      expect(summary.total).toBe(3);
      expect(summary.cleared).toBe(1); // b1
      expect(summary.reappear).toBe(1); // b2
      expect(summary.pending).toBe(1); // b3
    });
  });

  describe("formatPercentage", () => {
    it("formats percentage with 2 decimal places and % suffix", () => {
      expect(formatPercentage(96.6666)).toBe("96.67%");
      expect(formatPercentage(80)).toBe("80.00%");
      expect(formatPercentage(72.5)).toBe("72.50%");
      expect(formatPercentage(0)).toBe("0.00%");
    });

    it("returns 'Pending' for null, undefined, or invalid percentage", () => {
      expect(formatPercentage(null)).toBe("Pending");
      expect(formatPercentage(undefined)).toBe("Pending");
      expect(formatPercentage(NaN)).toBe("Pending");
      expect(formatPercentage("invalid")).toBe("Pending");
    });
  });

  describe("formatMarksRatio", () => {
    it("formats obtained marks out of maximum marks", () => {
      expect(formatMarksRatio(145, 150)).toBe("145 / 150");
      expect(formatMarksRatio(0, 100)).toBe("0 / 100");
    });

    it("returns obtained marks alone when maximum marks are missing or zero", () => {
      expect(formatMarksRatio(145, null)).toBe("145");
      expect(formatMarksRatio(145, undefined)).toBe("145");
      expect(formatMarksRatio(145, 0)).toBe("145");
    });

    it("handles null or undefined obtained marks with an em-dash", () => {
      expect(formatMarksRatio(null, 150)).toBe("— / 150");
      expect(formatMarksRatio(null, null)).toBe("—");
    });
  });

  describe("calculateCumulativeSummary", () => {
    it("calculates cumulative summary with weighted percentage (SUM(obtained) / SUM(max) * 100)", () => {
      const semResults = [
        {
          _id: "sem1",
          semester: 1,
          examName: "Sem 1 Exam",
          totalMarks: 92,
          totalMaxMarks: 150,
          percentage: 61.33,
          passedSubjects: 1,
          failedSubjects: 1,
          incompleteSubjects: 0,
          totalSubjects: 2,
          overallResult: "ATKT",
        },
        {
          _id: "sem2",
          semester: 2,
          examName: "Sem 2 Exam",
          totalMarks: 120,
          totalMaxMarks: 150,
          percentage: 80.0,
          passedSubjects: 3,
          failedSubjects: 0,
          incompleteSubjects: 0,
          totalSubjects: 3,
          overallResult: "PASS",
        },
        {
          _id: "sem3",
          semester: 3,
          examName: "Sem 3 Exam",
          totalMarks: 145,
          totalMaxMarks: 150,
          percentage: 96.67,
          passedSubjects: 2,
          failedSubjects: 0,
          incompleteSubjects: 0,
          totalSubjects: 2,
          overallResult: "PASS",
        },
      ];

      const res = calculateCumulativeSummary(semResults);
      // Total obtained = 92 + 120 + 145 = 357
      // Total max = 150 + 150 + 150 = 450
      // Cumulative percentage = (357 / 450) * 100 = 79.33% (NOT average (61.33 + 80 + 96.67) / 3 = 79.333...)
      expect(res.totalObtained).toBe(357);
      expect(res.totalMax).toBe(450);
      expect(res.cumulativePercentage).toBe(79.33);
      expect(res.totalPassed).toBe(6);
      expect(res.totalFailed).toBe(1);
      expect(res.totalSubjects).toBe(7);
      expect(res.semesters.length).toBe(3);
    });

    it("returns null cumulativePercentage if any semester lacks max marks or is incomplete", () => {
      const semResults = [
        {
          _id: "sem1",
          semester: 1,
          totalMarks: 92,
          totalMaxMarks: 150,
          percentage: 61.33,
          overallResult: "PASS",
        },
        {
          _id: "sem2",
          semester: 2,
          totalMarks: 120,
          totalMaxMarks: null, // missing max marks
          percentage: null,
          overallResult: "INCOMPLETE",
        },
      ];

      const res = calculateCumulativeSummary(semResults);
      expect(res.cumulativePercentage).toBeNull();
    });
  });
});
