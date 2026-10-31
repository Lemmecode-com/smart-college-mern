import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  getAcademicYearNumber,
  getAcademicYearLabel,
  groupSemestersByYear,
  mapResultToStatement,
  generateResultStatementFilename,
  deriveAcademicYearsForCourse,
  deriveConsolidatedEligibility,
  mapConsolidatedStatement,
  generateConsolidatedStatementFilename,
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

    it("maps cleared backlog attempts into clearedBacklogs without altering regular totals", () => {
      const sem2ResultWithBacklog = {
        ...mockSemesterResult,
        semester: 2,
        totalMarks: 450,
        totalMaxMarks: 500,
        percentage: 90.0,
        backlogResults: [
          {
            backlogId: "b1",
            attemptId: "att1",
            subjectId: "sub_c1",
            subjectCode: "CS101",
            subjectName: "Programming in C",
            subjectType: "THEORY",
            semester: 1, // original semester
            academicYear: "2023-2024",
            attemptNumber: 1,
            internalMarks: 22,
            externalMarks: 58,
            totalMarks: 80,
            resultStatus: "PASS",
            passed: true,
            cleared: true,
            examName: "Semester 2 Regular & Backlog Exam",
          },
          {
            backlogId: "b2",
            attemptId: "att2",
            subjectId: "sub_math",
            subjectCode: "MATH101",
            subjectName: "Engineering Mathematics",
            subjectType: "THEORY",
            semester: 1,
            attemptNumber: 1,
            internalMarks: 10,
            externalMarks: 15,
            totalMarks: 25,
            resultStatus: "FAIL",
            passed: false,
            cleared: false,
          },
        ],
      };

      const statement = mapResultToStatement(sem2ResultWithBacklog, mockProfile);

      // Cleared backlogs mapped
      expect(statement.clearedBacklogs).toBeDefined();
      expect(statement.clearedBacklogs.length).toBe(1);

      const cleared = statement.clearedBacklogs[0];
      expect(cleared.subjectCode).toBe("CS101");
      expect(cleared.subjectName).toBe("Programming in C");
      expect(cleared.originalSemester).toBe(1);
      expect(cleared.clearanceSemester).toBe(2);
      expect(cleared.attemptNumber).toBe(1);
      expect(cleared.internalMarks).toBe(22);
      expect(cleared.externalMarks).toBe(58);
      expect(cleared.totalMarks).toBe(80);
      expect(cleared.status).toBe("CLEARED");
      expect(cleared.resultStatus).toBe("PASS");
      expect(cleared.cleared).toBe(true);

      // Failed attempt is NOT included in clearedBacklogs
      expect(statement.clearedBacklogs.some((b) => b.subjectCode === "MATH101")).toBe(false);

      // Regular subjects remain unchanged
      expect(statement.subjects.length).toBe(2);

      // Regular totals and percentage are NOT contaminated by backlog marks
      expect(statement.summary.totalMarks).toBe(450);
      expect(statement.summary.totalMaxMarks).toBe(500);
      expect(statement.summary.percentage).toBe(90.0);
    });

    it("defaults clearedBacklogs to empty array when no backlogResults are present", () => {
      const statement = mapResultToStatement(mockSemesterResult, mockProfile);
      expect(statement.clearedBacklogs).toEqual([]);
    });

    describe("deriveAcademicYearsForCourse — Dynamic Course Durations", () => {
      it("generates exactly 2 academic years for a 2-year PG course via durationYears", () => {
        const course = { name: "M.Sc. Information Technology", durationYears: 2, durationSemesters: 4 };
        const years = deriveAcademicYearsForCourse(course);
        expect(years).toEqual([
          { yearNumber: 1, label: "First Year" },
          { yearNumber: 2, label: "Second Year" },
        ]);
      });

      it("generates exactly 2 academic years for a 2-year course via durationSemesters when durationYears is omitted", () => {
        const course = { name: "MBA", durationSemesters: 4 };
        const years = deriveAcademicYearsForCourse(course);
        expect(years).toHaveLength(2);
        expect(years[0].label).toBe("First Year");
        expect(years[1].label).toBe("Second Year");
      });

      it("generates exactly 3 academic years for a 3-year UG course", () => {
        const course = { name: "Bachelor of Science", durationYears: 3, durationSemesters: 6 };
        const years = deriveAcademicYearsForCourse(course);
        expect(years).toEqual([
          { yearNumber: 1, label: "First Year" },
          { yearNumber: 2, label: "Second Year" },
          { yearNumber: 3, label: "Third Year" },
        ]);
      });

      it("generates exactly 4 academic years for a 4-year Engineering course", () => {
        const course = { name: "B.Tech Computer Science", durationYears: 4, durationSemesters: 8 };
        const years = deriveAcademicYearsForCourse(course);
        expect(years).toEqual([
          { yearNumber: 1, label: "First Year" },
          { yearNumber: 2, label: "Second Year" },
          { yearNumber: 3, label: "Third Year" },
          { yearNumber: 4, label: "Fourth Year" },
        ]);
      });

      it("respects custom yearLabels configured on the course", () => {
        const course = {
          name: "Diploma in Architecture",
          durationYears: 2,
          durationSemesters: 4,
          yearLabels: ["Part I", "Part II"],
        };
        const years = deriveAcademicYearsForCourse(course);
        expect(years).toEqual([
          { yearNumber: 1, label: "Part I" },
          { yearNumber: 2, label: "Part II" },
        ]);
      });

      it("preserves authoritative duration when student has fewer published semester results", () => {
        const course = { name: "B.Tech", durationYears: 4, durationSemesters: 8 };
        // Student only has Sem 1 published so far
        const publishedResults = [{ semester: 1, examName: "Sem 1" }];
        const years = deriveAcademicYearsForCourse(course, publishedResults);
        // Should generate all 4 configured years so student can see upcoming years or empty states
        expect(years).toHaveLength(4);
      });

      it("safely falls back to observed semester results when course duration metadata is missing", () => {
        const courseWithoutDuration = { name: "Legacy Course" };
        const publishedResults = [
          { semester: 1, examName: "Sem 1" },
          { semester: 2, examName: "Sem 2" },
          { semester: 3, examName: "Sem 3" },
        ];
        // Sem 3 -> Math.ceil(3 / 2) = 2 years
        const years = deriveAcademicYearsForCourse(courseWithoutDuration, publishedResults);
        expect(years).toEqual([
          { yearNumber: 1, label: "First Year" },
          { yearNumber: 2, label: "Second Year" },
        ]);
      });

      it("safely defaults to a minimum of 1 year floor when both duration and results are absent", () => {
        const years = deriveAcademicYearsForCourse(null, []);
        expect(years).toEqual([{ yearNumber: 1, label: "First Year" }]);
      });
    });

    describe("deriveConsolidatedEligibility & mapConsolidatedStatement — Phase 3", () => {
      const mockCourse2Year = { name: "M.Sc. IT", durationYears: 2, durationSemesters: 4 };
      const mockCourse3Year = { name: "BCA", durationYears: 3, durationSemesters: 6 };
      const mockCourse4Year = { name: "B.Tech", durationYears: 4, durationSemesters: 8 };

      const createPassingSemester = (semNum, totalMarks = 400, totalMaxMarks = 500) => ({
        semester: semNum,
        academicYear: `202${Math.floor((semNum - 1) / 2)}-2${Math.floor((semNum - 1) / 2) + 1}`,
        examName: `Sem ${semNum} Regular Exam`,
        status: "PUBLISHED",
        overallResult: "PASS",
        totalMarks,
        totalMaxMarks,
        percentage: Number(((totalMarks / totalMaxMarks) * 100).toFixed(2)),
        subjects: [
          {
            subjectCode: `CS${semNum}01`,
            subjectName: `Subject ${semNum}.1`,
            subjectType: "THEORY",
            internalMarks: 20,
            internalMaxMarks: 25,
            externalMarks: 60,
            externalMaxMarks: 75,
            totalMarks: 80,
            maxMarks: 100,
            passed: true,
            status: "PASS",
          },
        ],
      });

      it("evaluates student as ELIGIBLE when all required semesters are published and PASS with no backlogs", () => {
        const results = [1, 2, 3, 4].map((s) => createPassingSemester(s));
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(true);
        expect(eligibility.status).toBe("ELIGIBLE");
        expect(eligibility.requiredSemesters).toEqual([1, 2, 3, 4]);
        expect(eligibility.completedSemesters).toEqual([1, 2, 3, 4]);
        expect(eligibility.missingSemesters).toEqual([]);
        expect(eligibility.activeBacklogsCount).toBe(0);
      });

      it("detects missing required semesters and returns INELIGIBLE", () => {
        // Missing Sem 4 in a 4-semester course
        const results = [1, 2, 3].map((s) => createPassingSemester(s));
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("MISSING_SEMESTERS");
        expect(eligibility.missingSemesters).toEqual([4]);
        expect(eligibility.reasons).toContain("Semester 4 has no published result.");
      });

      it("returns UNKNOWN_ADMISSION_PATH when published results start after Semester 1", () => {
        // Results start at Sem 3; Sem 1 and 2 are absent, and admission path cannot be verified
        const results = [3, 4, 5, 6].map((s) => createPassingSemester(s));
        const eligibility = deriveConsolidatedEligibility(results, mockCourse3Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("UNKNOWN_ADMISSION_PATH");
        expect(eligibility.admissionPathStatus).toBe("UNKNOWN_ADMISSION_PATH");
        expect(eligibility.missingSemesters).toContain(1);
        expect(eligibility.missingSemesters).toContain(2);
      });

      it("flags AMBIGUOUS_RESULT when multiple published candidates exist for the same semester", () => {
        const results = [
          createPassingSemester(1),
          createPassingSemester(2),
          // Two candidate results for Semester 2
          { ...createPassingSemester(2), examName: "Sem 2 Retake Exam" },
          createPassingSemester(3),
          createPassingSemester(4),
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("AMBIGUOUS_RESULT");
        expect(eligibility.ambiguousSemesters).toEqual([2]);
        expect(eligibility.reasons.some((r) => r.includes("multiple published result candidates"))).toBe(true);
      });

      it("flags FAILED_SEMESTERS when any required semester has FAIL outcome", () => {
        const results = [
          createPassingSemester(1),
          { ...createPassingSemester(2), overallResult: "FAIL" },
          createPassingSemester(3),
          createPassingSemester(4),
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("FAILED_SEMESTERS");
        expect(eligibility.failedSemesters).toEqual([2]);
      });

      it("flags INCOMPLETE_SEMESTERS when any semester result is incomplete", () => {
        const results = [
          createPassingSemester(1),
          { ...createPassingSemester(2), overallResult: "INCOMPLETE" },
          createPassingSemester(3),
          createPassingSemester(4),
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("INCOMPLETE_SEMESTERS");
        expect(eligibility.incompleteSemesters).toEqual([2]);
      });

      it("flags UNPUBLISHED_SEMESTERS when a candidate semester result is still DRAFT or LOCKED", () => {
        const results = [
          createPassingSemester(1),
          createPassingSemester(2),
          createPassingSemester(3),
          { ...createPassingSemester(4), status: "LOCKED" },
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, []);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("UNPUBLISHED_SEMESTERS");
        expect(eligibility.unpublishedSemesters).toEqual([4]);
      });

      it("flags ACTIVE_BACKLOGS when an active backlog exists in OPEN status", () => {
        const results = [1, 2, 3, 4].map((s) => createPassingSemester(s));
        const rawBacklogs = [
          {
            backlogId: "b1",
            subjectCode: "CS201",
            status: "OPEN",
            cleared: false,
          },
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, rawBacklogs);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("ACTIVE_BACKLOGS");
        expect(eligibility.activeBacklogsCount).toBe(1);
      });

      it("flags ACTIVE_BACKLOGS when a backlog is in ATTEMPTED status", () => {
        const results = [1, 2, 3, 4].map((s) => createPassingSemester(s));
        const rawBacklogs = [
          {
            backlogId: "b2",
            subjectCode: "CS202",
            status: "ATTEMPTED",
            cleared: false,
            resultStatus: "INCOMPLETE",
          },
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, rawBacklogs);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("ACTIVE_BACKLOGS");
        expect(eligibility.activeBacklogsCount).toBe(1);
      });

      it("allows eligibility when a backlog has been authoritatively CLEARED and no active backlogs remain", () => {
        const results = [1, 2, 3, 4].map((s) => createPassingSemester(s));
        const rawBacklogs = [
          {
            backlogId: "b3",
            subjectCode: "CS101",
            status: "CLEARED",
            cleared: true,
            resultStatus: "PASS",
          },
        ];
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, rawBacklogs);

        expect(eligibility.isEligible).toBe(true);
        expect(eligibility.status).toBe("ELIGIBLE");
        expect(eligibility.activeBacklogsCount).toBe(0);
      });

      it("verifies 2-year (4 sems), 3-year (6 sems), and 4-year (8 sems) required semester counts", () => {
        const el2 = deriveConsolidatedEligibility([], mockCourse2Year);
        expect(el2.requiredSemesters).toEqual([1, 2, 3, 4]);

        const el3 = deriveConsolidatedEligibility([], mockCourse3Year);
        expect(el3.requiredSemesters).toEqual([1, 2, 3, 4, 5, 6]);

        const el4 = deriveConsolidatedEligibility([], mockCourse4Year);
        expect(el4.requiredSemesters).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      });

      it("does not bypass missing or failed semester results when student has ALUMNI status", () => {
        const results = [1, 2, 3].map((s) => createPassingSemester(s)); // Missing sem 4
        const studentProfile = {
          student: { fullName: "Graduated Student", status: "ALUMNI" },
        };
        const eligibility = deriveConsolidatedEligibility(results, mockCourse2Year, [], studentProfile);

        expect(eligibility.isEligible).toBe(false);
        expect(eligibility.status).toBe("MISSING_SEMESTERS");
      });

      it("maps consolidated statement with correct grand totals, aggregate percentage, and immutable source results", () => {
        const results = [
          createPassingSemester(1, 400, 500),
          createPassingSemester(2, 450, 500),
          createPassingSemester(3, 420, 500),
          createPassingSemester(4, 430, 500),
        ];
        const profile = {
          student: {
            fullName: "Aarav Sharma",
            enrollmentNumber: "EN202401892",
            motherName: "Sunita Sharma",
            fatherName: "Rajesh Sharma",
          },
          college: {
            name: "Apex Engineering College",
            code: "AEC",
            address: "Mumbai, Maharashtra",
          },
          course: mockCourse2Year,
        };
        const rawBacklogs = [
          {
            backlogId: "b1",
            subjectCode: "CS101",
            subjectName: "Programming",
            semester: 1,
            attemptNumber: 2,
            cleared: true,
            resultStatus: "PASS",
            totalMarks: 75,
          },
        ];

        // Deep clone snapshot before mapping to test immutability
        const resultsBefore = JSON.parse(JSON.stringify(results));

        const statement = mapConsolidatedStatement(results, profile, mockCourse2Year, rawBacklogs);

        // Immutability check
        expect(results).toEqual(resultsBefore);

        // Verification of student and college details
        expect(statement.student.name).toBe("Aarav Sharma");
        expect(statement.student.enrollmentNumber).toBe("EN202401892");
        expect(statement.college.name).toBe("Apex Engineering College");

        // Verification of grand totals (sum: 400 + 450 + 420 + 430 = 1700 out of 2000)
        expect(statement.summary.grandTotalMarks).toBe(1700);
        expect(statement.summary.grandTotalMaxMarks).toBe(2000);
        expect(statement.summary.aggregatePercentage).toBe(85.0); // (1700 / 2000) * 100 = 85.00%
        expect(statement.summary.overallResult).toBe("PASS");

        // Verification that cleared backlog marks were NOT added to regular totals
        expect(statement.clearedBacklogs).toHaveLength(1);
        expect(statement.clearedBacklogs[0].subjectCode).toBe("CS101");
        expect(statement.summary.grandTotalMarks).toBe(1700); // Backlog 75 marks must not be added

        // Verification of filename generator
        const filename = generateConsolidatedStatementFilename(statement);
        expect(filename).toBe("Consolidated_Marksheet_EN202401892.pdf");
      });

      it("safely handles zero maximum marks and missing numeric values without emitting NaN or Infinity", () => {
        const results = [
          { ...createPassingSemester(1), totalMarks: null, totalMaxMarks: 0 },
          { ...createPassingSemester(2), totalMarks: undefined, totalMaxMarks: null },
        ];
        const statement = mapConsolidatedStatement(results, null, { durationYears: 1, durationSemesters: 2 });

        expect(statement.summary.aggregatePercentage).toBeNull();
        expect(Number.isNaN(statement.summary.aggregatePercentage)).toBe(false);
      });
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

      // Semester Cards (Minimal ERP: Semester, Exam Name, Academic Year, buttons)
      expect(container.textContent).toContain("Semester 1");
      expect(container.textContent).toContain("Winter 2024 Exams");
      expect(container.textContent).toContain("AY 2024-2025");

      expect(container.textContent).toContain("Semester 2");
      expect(container.textContent).toContain("Summer 2025 Exams");

      // Verify removed elements are not present on the card
      expect(container.textContent).not.toContain("400 / 500");
      expect(container.textContent).not.toContain("80.00%");
      expect(container.textContent).not.toContain("Passed");
      expect(container.textContent).not.toContain("Failed");

      // Action buttons
      const previewBtns = container.querySelectorAll(".preview-btn");
      const downloadBtns = container.querySelectorAll(".download-btn");
      expect(previewBtns.length).toBe(2);
      expect(downloadBtns.length).toBe(2);

      // CRITICAL: Subject tables must NOT exist on the main page
      expect(container.querySelector(".sr-table")).toBeNull();
    });

    it("renders ONLY the 6 allowed details on the semester card and excludes summary statistics", () => {
      const mockResultWithCourse = [
        {
          yearNumber: 1,
          yearLabel: "First Year",
          semesters: [
            {
              _id: "sem-card-test",
              semester: 1,
              examName: "First Sem Exam",
              academicYear: "2026-27",
              course_id: { name: "MSC IT" },
              totalMarks: 450,
              totalMaxMarks: 500,
              percentage: 90.0,
              overallResult: "PASS",
              passedSubjects: 5,
              failedSubjects: 0,
              backlogCount: 0,
            },
          ],
        },
      ];

      act(() => {
        root.render(
          <YearSemesterResultCards
            groupedYears={mockResultWithCourse}
            onPreview={() => {}}
            onDownload={() => {}}
            selectedSemester="ALL"
          />
        );
      });

      const card = container.querySelector(".sr-compact-sem-card");
      expect(card).not.toBeNull();

      // 1. Semester
      expect(card.querySelector(".sr-sem-tag").textContent).toBe("Semester 1");
      // 2. Exam Name
      expect(card.querySelector(".sr-compact-exam-name").textContent).toBe("First Sem Exam");
      // 3. Academic Year
      expect(card.textContent).toContain("AY 2026-27");
      // 4. Course
      expect(card.textContent).toContain("MSC IT");
      // 5. Preview Result button
      const previewBtn = card.querySelector(".preview-btn");
      expect(previewBtn).not.toBeNull();
      expect(previewBtn.textContent).toContain("Preview Result");
      // 6. Download PDF button
      const downloadBtn = card.querySelector(".download-btn");
      expect(downloadBtn).not.toBeNull();
      expect(downloadBtn.textContent).toContain("Download PDF");

      // STRICTLY EXCLUDED:
      expect(card.textContent).not.toContain("450 / 500");
      expect(card.textContent).not.toContain("90.00%");
      expect(card.textContent).not.toContain("Total Marks");
      expect(card.textContent).not.toContain("Overall Percentage");
      expect(card.querySelector(".sr-status-pill")).toBeNull();
      expect(card.textContent).not.toContain("Passed");
      expect(card.textContent).not.toContain("Failed");
      expect(card.textContent).not.toContain("Backlogs");
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
      expect(container.textContent).not.toContain("Print");
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

    it("renders Download PDF button and does not render Print button", () => {
      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={mockStatementData}
          />
        );
      });

      const buttons = Array.from(container.querySelectorAll("button"));
      const printBtn = buttons.find((btn) => btn.textContent.trim() === "Print");
      const downloadBtn = buttons.find((btn) => btn.textContent.includes("Download PDF"));

      expect(printBtn).toBeUndefined();
      expect(downloadBtn).not.toBeNull();
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

    it("renders separate clearance table inside printable paper when clearedBacklogs are present", () => {
      const statementWithCleared = {
        ...mockStatementData,
        clearedBacklogs: [
          {
            backlogId: "b1",
            attemptId: "att1",
            subjectCode: "CS101",
            subjectName: "Programming in C",
            subjectType: "THEORY",
            formattedType: "Theory",
            originalSemester: 1,
            clearanceSemester: 3,
            attemptNumber: 1,
            totalMarks: 78,
            resultStatus: "PASS",
            status: "CLEARED",
            cleared: true,
          },
        ],
      };

      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={statementWithCleared}
          />
        );
      });

      // Clearance container exists inside printable paper
      const printableSheet = container.querySelector(".result-statement-paper");
      expect(printableSheet).not.toBeNull();

      const clearanceSection = printableSheet.querySelector(".rsm-backlog-clearance-container");
      expect(clearanceSection).not.toBeNull();

      // Clearance content
      expect(clearanceSection.textContent).toContain("Supplementary / Backlog Examination Clearance");
      expect(clearanceSection.textContent).toContain("CS101");
      expect(clearanceSection.textContent).toContain("Programming in C");
      expect(clearanceSection.textContent).toContain("Semester 1");
      expect(clearanceSection.textContent).toContain("Attempt 1");
      expect(clearanceSection.textContent).toContain("78");
      expect(clearanceSection.textContent).toContain("CLEARED");
      expect(clearanceSection.textContent).toContain(
        "Supplementary/backlog marks are recorded separately and are not included in regular semester totals or percentage"
      );

      // Regular subjects still present and intact
      expect(printableSheet.textContent).toContain("Signal Processing");
      expect(printableSheet.textContent).toContain("Hardware Simulation Lab");

      // Regular totals and percentage unchanged
      expect(printableSheet.textContent).toContain("333 / 400");
      expect(printableSheet.textContent).toContain("83.25%");
    });

    it("does not render clearance table when clearedBacklogs is empty or missing", () => {
      act(() => {
        root.render(
          <ResultStatementModal
            isOpen={true}
            onClose={() => {}}
            statementData={{ ...mockStatementData, clearedBacklogs: [] }}
          />
        );
      });

      const clearanceSection = container.querySelector(".rsm-backlog-clearance-container");
      expect(clearanceSection).toBeNull();
      expect(container.textContent).not.toContain("Supplementary / Backlog Examination Clearance");
    });
  });
});
