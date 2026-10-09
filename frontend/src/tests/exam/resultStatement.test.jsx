import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  getAcademicYearNumber,
  getAcademicYearLabel,
  groupSemestersByYear,
  mapResultToStatement,
  generateResultStatementFilename,
} from "../../utils/resultStatementDataMapper";
import YearSemesterResultCards from "../../pages/dashboard/Student/components/results/YearSemesterResultCards";
import ResultStatementModal from "../../pages/dashboard/Student/components/results/ResultStatementModal";

describe("Step 10 — Result Statement Data Mapper & Preview/PDF Components", () => {
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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DATA MAPPER TESTS
  // ──────────────────────────────────────────────────────────────────────────
  describe("resultStatementDataMapper.js", () => {
    const mockSemesterResult = {
      _id: "res101",
      semester: 1,
      academicYear: "2024-2025",
      examName: "Winter 2024 Regular Examination",
      overallResult: "PASS",
      totalMarks: 428,
      totalMaxMarks: 500,
      percentage: 85.6,
      passedSubjects: 5,
      failedSubjects: 0,
      incompleteSubjects: 0,
      totalSubjects: 5,
      publishedAt: "2025-01-20T10:00:00.000Z",
      exam_id: { name: "Winter 2024 Regular Examination", academicYear: "2024-2025" },
      course_id: { name: "Computer Engineering", code: "COMP" },
      college_id: { name: "Apex Institute of Technology", code: "APEX" },
      subjects: [
        {
          subject: "s1",
          subjectCode: "CS101",
          subjectName: "Programming in C",
          subjectType: "COMPOSITE",
          internalMarks: 24,
          internalMaxMarks: 25,
          externalMarks: 65,
          externalMaxMarks: 75,
          totalMarks: 89,
          maxMarks: 100,
          status: "PASS",
          passed: true,
          marksRecorded: true,
        },
        {
          subject: "s2",
          subjectCode: "CS102",
          subjectName: "Digital Electronics Lab",
          subjectType: "PRACTICAL",
          internalMarks: 45,
          internalMaxMarks: 50,
          externalMarks: null,
          externalMaxMarks: null,
          totalMarks: 45,
          maxMarks: 50,
          status: "PASS",
          passed: true,
          marksRecorded: true,
        },
      ],
    };

    const mockProfile = {
      student: {
        fullName: "Rahul Dev Sharma",
        enrollmentNumber: "EN202409876",
        motherName: "Savitri Sharma",
        fatherName: "Devendra Sharma",
      },
      college: {
        name: "Apex Institute of Technology",
        code: "APEX-101",
        logo: "https://example.com/logo.png",
        address: "Pune, Maharashtra, India",
      },
      course: {
        name: "Computer Engineering",
        code: "COMP",
      },
    };

    it("correctly derives academic year number and human label", () => {
      expect(getAcademicYearNumber(1)).toBe(1);
      expect(getAcademicYearNumber(2)).toBe(1);
      expect(getAcademicYearNumber(3)).toBe(2);
      expect(getAcademicYearNumber(4)).toBe(2);
      expect(getAcademicYearNumber(5)).toBe(3);
      expect(getAcademicYearNumber(6)).toBe(3);
      expect(getAcademicYearNumber(7)).toBe(4);
      expect(getAcademicYearNumber(8)).toBe(4);

      expect(getAcademicYearLabel(1)).toBe("First Year");
      expect(getAcademicYearLabel(2)).toBe("Second Year");
      expect(getAcademicYearLabel(3)).toBe("Third Year");
      expect(getAcademicYearLabel(4)).toBe("Final Year");
    });

    it("groups multi-semester results into academic years", () => {
      const results = [
        { semester: 4, examName: "Sem 4" },
        { semester: 1, examName: "Sem 1" },
        { semester: 3, examName: "Sem 3" },
        { semester: 2, examName: "Sem 2" },
      ];

      const grouped = groupSemestersByYear(results);
      expect(grouped.length).toBe(2);

      expect(grouped[0].yearLabel).toBe("First Year");
      expect(grouped[0].semesters.map((s) => s.semester)).toEqual([1, 2]);

      expect(grouped[1].yearLabel).toBe("Second Year");
      expect(grouped[1].semesters.map((s) => s.semester)).toEqual([3, 4]);
    });

    it("transforms raw result and profile into complete marksheet view model", () => {
      const statement = mapResultToStatement(mockSemesterResult, mockProfile);

      expect(statement).not.toBeNull();
      // Student details
      expect(statement.student.name).toBe("Rahul Dev Sharma");
      expect(statement.student.enrollmentNumber).toBe("EN202409876");
      expect(statement.student.motherName).toBe("Savitri Sharma");
      expect(statement.student.fatherName).toBe("Devendra Sharma");

      // College details
      expect(statement.college.name).toBe("Apex Institute of Technology");
      expect(statement.college.code).toBe("APEX-101");
      expect(statement.college.logo).toBe("https://example.com/logo.png");

      // Examination metadata
      expect(statement.examination.semester).toBe(1);
      expect(statement.examination.name).toBe("Winter 2024 Regular Examination");
      expect(statement.examination.academicYear).toBe("2024-2025");
      expect(statement.examination.resultDate).toBe("2025-01-20T10:00:00.000Z");

      // Subjects snapshot
      expect(statement.subjects.length).toBe(2);
      expect(statement.subjects[0].subjectCode).toBe("CS101");
      expect(statement.subjects[0].subjectName).toBe("Programming in C");
      expect(statement.subjects[0].internalMarks).toBe(24);
      expect(statement.subjects[0].internalMaxMarks).toBe(25);
      expect(statement.subjects[0].externalMarks).toBe(65);
      expect(statement.subjects[0].externalMaxMarks).toBe(75);
      expect(statement.subjects[0].totalMarks).toBe(89);
      expect(statement.subjects[0].maxMarks).toBe(100);
      expect(statement.subjects[0].status).toBe("PASS");

      // Practical subject external mark handling
      expect(statement.subjects[1].isPractical).toBe(true);
      expect(statement.subjects[1].externalMarks).toBeNull();
      expect(statement.subjects[1].totalMarks).toBe(45);
      expect(statement.subjects[1].maxMarks).toBe(50);

      // Summary aggregates
      expect(statement.summary.totalMarks).toBe(428);
      expect(statement.summary.totalMaxMarks).toBe(500);
      expect(statement.summary.percentage).toBe(85.6);
      expect(statement.summary.overallResult).toBe("PASS");
      expect(statement.summary.passedSubjects).toBe(5);
      expect(statement.summary.failedSubjects).toBe(0);
    });

    it("generates correct standard filename for PDF download", () => {
      const statement = mapResultToStatement(mockSemesterResult, mockProfile);
      const filename = generateResultStatementFilename(statement);
      expect(filename).toBe("Result_Statement_Sem1_EN202409876.pdf");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. YEAR -> SEMESTER COMPACT CARDS UI TESTS
  // ──────────────────────────────────────────────────────────────────────────
  describe("YearSemesterResultCards", () => {
    const mockGroupedYears = [
      {
        yearNumber: 1,
        yearLabel: "First Year",
        semesters: [
          {
            _id: "s1",
            semester: 1,
            examName: "Winter 2024 Exams",
            academicYear: "2024-2025",
            totalMarks: 400,
            totalMaxMarks: 500,
            percentage: 80.0,
            overallResult: "PASS",
            passedSubjects: 5,
            failedSubjects: 0,
            backlogCount: 0,
          },
          {
            _id: "s2",
            semester: 2,
            examName: "Summer 2025 Exams",
            academicYear: "2024-2025",
            totalMarks: 380,
            totalMaxMarks: 500,
            percentage: 76.0,
            overallResult: "PASS",
            passedSubjects: 4,
            failedSubjects: 1,
            backlogCount: 1,
          },
        ],
      },
    ];

    it("renders year heading and compact cards without subject tables", () => {
      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockGroupedYears}
            onPreview={() => {}}
            onDownload={() => {}}
            selectedSemester="ALL"
          />
        );
      });

      // Year Header
      expect(container.textContent).toContain("First Year");
      expect(container.textContent).toContain("Academic Year 1");

      // Semester Cards
      expect(container.textContent).toContain("Semester 1");
      expect(container.textContent).toContain("Winter 2024 Exams");
      expect(container.textContent).toContain("400 / 500");
      expect(container.textContent).toContain("80.00%");

      expect(container.textContent).toContain("Semester 2");
      expect(container.textContent).toContain("Summer 2025 Exams");
      expect(container.textContent).toContain("380 / 500");
      expect(container.textContent).toContain("76.00%");

      // Action buttons
      const previewBtns = container.querySelectorAll(".preview-btn");
      const downloadBtns = container.querySelectorAll(".download-btn");
      expect(previewBtns.length).toBe(2);
      expect(downloadBtns.length).toBe(2);

      // CRITICAL: Subject tables must NOT exist on the main page
      expect(container.querySelector(".sr-table")).toBeNull();
    });

    it("triggers onPreview and onDownload callbacks on button click", () => {
      let previewedSem = null;
      let downloadedSem = null;

      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockGroupedYears}
            onPreview={(res) => {
              previewedSem = res.semester;
            }}
            onDownload={(res) => {
              downloadedSem = res.semester;
            }}
            selectedSemester="ALL"
          />
        );
      });

      const previewBtns = container.querySelectorAll(".preview-btn");
      const downloadBtns = container.querySelectorAll(".download-btn");

      act(() => {
        previewBtns[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(previewedSem).toBe(1);

      act(() => {
        downloadBtns[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(downloadedSem).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. RESULT STATEMENT MODAL & MARKSHEET PREVIEW TESTS
  // ──────────────────────────────────────────────────────────────────────────
  describe("ResultStatementModal", () => {
    const mockStatementData = {
      student: {
        name: "Pooja Kulkarni",
        enrollmentNumber: "EN202311445",
        motherName: "Sunita Kulkarni",
        fatherName: "Anand Kulkarni",
      },
      college: {
        name: "PVP Institute of Technology",
        code: "PVPIT-44",
        logo: null,
        address: "Shivaji Nagar, Pune",
      },
      course: {
        name: "Electronics & Telecommunication",
        code: "ENTC",
      },
      examination: {
        name: "Semester 3 Regular Exams",
        academicYear: "2025-2026",
        semester: 3,
        resultDate: "2026-01-15T09:00:00.000Z",
      },
      subjects: [
        {
          subjectCode: "ET301",
          subjectName: "Signal Processing",
          subjectType: "THEORY",
          formattedType: "Theory",
          internalMarks: 23,
          internalMaxMarks: 25,
          externalMarks: 62,
          externalMaxMarks: 75,
          totalMarks: 85,
          maxMarks: 100,
          status: "PASS",
          isPractical: false,
        },
        {
          subjectCode: "ET302",
          subjectName: "Hardware Simulation Lab",
          subjectType: "PRACTICAL",
          formattedType: "Practical",
          internalMarks: 48,
          internalMaxMarks: 50,
          externalMarks: null,
          externalMaxMarks: null,
          totalMarks: 48,
          maxMarks: 50,
          status: "PASS",
          isPractical: true,
        },
      ],
      summary: {
        totalMarks: 333,
        totalMaxMarks: 400,
        percentage: 83.25,
        overallResult: "PASS",
        totalSubjects: 2,
        passedSubjects: 2,
        failedSubjects: 0,
        incompleteSubjects: 0,
      },
    };

    it("renders complete authentic marksheet preview when open", () => {
      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={mockStatementData}
          />
        );
      });

      // Header
      expect(container.textContent).toContain("PVP Institute of Technology");
      expect(container.textContent).toContain("STATEMENT OF MARKS & GRADES");
      expect(container.textContent).toContain("Semester 3 Regular Exams");

      // Student details
      expect(container.textContent).toContain("Pooja Kulkarni");
      expect(container.textContent).toContain("EN202311445");
      expect(container.textContent).toContain("Sunita Kulkarni");
      expect(container.textContent).toContain("Anand Kulkarni");
      expect(container.textContent).toContain("Electronics & Telecommunication");
      expect(container.textContent).toContain("Semester 3");

      // Table columns & rows
      expect(container.textContent).toContain("Signal Processing");
      expect(container.textContent).toContain("ET301");
      expect(container.textContent).toContain("23 / 25");
      expect(container.textContent).toContain("62 / 75");
      expect(container.textContent).toContain("85 / 100");

      // Practical row with external as '—'
      expect(container.textContent).toContain("Hardware Simulation Lab");
      expect(container.textContent).toContain("ET302");
      expect(container.textContent).toContain("48 / 50");
      expect(container.textContent).toContain("—");

      // Summary
      expect(container.textContent).toContain("333 / 400");
      expect(container.textContent).toContain("83.25%");
      expect(container.textContent).toContain("Passed");

      // Toolbar actions
      expect(container.querySelector(".rsm-toolbar")).not.toBeNull();
      expect(container.textContent).toContain("Print");
      expect(container.textContent).toContain("Download PDF");
    });

    it("calls onClose when close button is clicked", () => {
      let closed = false;
      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {
              closed = true;
            }}
            statementData={mockStatementData}
          />
        );
      });

      const closeBtn = container.querySelector(".close-btn");
      expect(closeBtn).not.toBeNull();

      act(() => {
        closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(closed).toBe(true);
    });

    it("triggers window.print when print button is clicked", () => {
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={mockStatementData}
          />
        );
      });

      const printBtn = container.querySelector(".rsm-action-btn"); // First button is Print
      act(() => {
        printBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it("returns null when isOpen is false", () => {
      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={false}
            onClose={() => {}}
            statementData={mockStatementData}
          />
        );
      });

      expect(container.children.length).toBe(0);
    });
  });
});
