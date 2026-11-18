import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import PublishedExamTimetable from "../../components/PublishedExamTimetable";
import {
  formatDate,
  formatDateWithWeekday,
  formatTime12Hour,
  calculateDuration,
  formatSession,
  getRelativeExamStatus,
  sortScheduleSubjects,
  filterScheduleSubjects,
  getScheduleSummaryMetrics,
  getExamDateRange,
  getSubjectInfo,
} from "../../utils/examTimetable.util";

describe("Student Exam Timetable — Utilities & Components", () => {
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

  /* =========================================================
     1. Chronological Sorting Tests
     ========================================================= */
  describe("1. Chronological Sorting", () => {
    it("sorts timetable entries chronologically by examDate and startTime ascending", () => {
      const unsorted = [
        {
          _id: "s3",
          examDate: "2026-10-22T00:00:00.000Z",
          startTime: "10:00",
          endTime: "12:00",
        },
        {
          _id: "s1b",
          examDate: "2026-10-20T00:00:00.000Z",
          startTime: "14:00",
          endTime: "16:00",
        },
        {
          _id: "s2",
          examDate: "2026-10-21T00:00:00.000Z",
          startTime: "09:00",
          endTime: "12:00",
        },
        {
          _id: "s1a",
          examDate: "2026-10-20T00:00:00.000Z",
          startTime: "09:30",
          endTime: "11:30",
        },
      ];

      const sorted = sortScheduleSubjects(unsorted);

      // Verify original array was NOT mutated
      expect(unsorted[0]._id).toBe("s3");

      // Verify sorted order: Oct 20 09:30 -> Oct 20 14:00 -> Oct 21 09:00 -> Oct 22 10:00
      expect(sorted.map((s) => s._id)).toEqual(["s1a", "s1b", "s2", "s3"]);
    });

    it("handles invalid or missing dates safely by placing them at the end", () => {
      const mixed = [
        { _id: "valid2", examDate: "2026-10-25T00:00:00.000Z", startTime: "10:00" },
        { _id: "invalid1", examDate: "not-a-date", startTime: "10:00" },
        { _id: "missingDate", examDate: null, startTime: "10:00" },
        { _id: "valid1", examDate: "2026-10-20T00:00:00.000Z", startTime: "10:00" },
      ];

      const sorted = sortScheduleSubjects(mixed);
      expect(sorted[0]._id).toBe("valid1");
      expect(sorted[1]._id).toBe("valid2");
      expect(["invalid1", "missingDate"]).toContain(sorted[2]._id);
      expect(["invalid1", "missingDate"]).toContain(sorted[3]._id);
    });
  });

  /* =========================================================
     2-5. Relative Exam Status Tests
     ========================================================= */
  describe("2-5. Relative Exam Status Calculation", () => {
    const fixedNow = new Date("2026-10-20T10:00:00");

    it("shows 'Today' when exam date is today and end time has not passed", () => {
      const status = getRelativeExamStatus(
        "2026-10-20T00:00:00.000Z",
        "10:00",
        "13:00",
        fixedNow,
      );
      expect(status.key).toBe("TODAY");
      expect(status.label).toBe("Today");
      expect(status.isUpcoming).toBe(true);
      expect(status.isCompleted).toBe(false);
    });

    it("shows 'Tomorrow' when exam date is tomorrow", () => {
      const status = getRelativeExamStatus(
        "2026-10-21T00:00:00.000Z",
        "10:00",
        "12:00",
        fixedNow,
      );
      expect(status.key).toBe("TOMORROW");
      expect(status.label).toBe("Tomorrow");
      expect(status.isUpcoming).toBe(true);
      expect(status.isCompleted).toBe(false);
    });

    it("shows 'In 2 days' when exam date is 2 days away", () => {
      const status = getRelativeExamStatus(
        "2026-10-22T00:00:00.000Z",
        "10:00",
        "12:00",
        fixedNow,
      );
      expect(status.key).toBe("IN_2_DAYS");
      expect(status.label).toBe("In 2 days");
      expect(status.isUpcoming).toBe(true);
      expect(status.isCompleted).toBe(false);
    });

    it("shows 'In X days' when exam date is more than 3 days away", () => {
      const status = getRelativeExamStatus(
        "2026-10-26T00:00:00.000Z",
        "10:00",
        "12:00",
        fixedNow,
      );
      expect(status.key).toBe("IN_X_DAYS");
      expect(status.label).toBe("In 6 days");
      expect(status.isUpcoming).toBe(true);
      expect(status.isCompleted).toBe(false);
    });

    it("shows 'Completed' when exam date has already passed", () => {
      const status = getRelativeExamStatus(
        "2026-10-18T00:00:00.000Z",
        "10:00",
        "12:00",
        fixedNow,
      );
      expect(status.key).toBe("COMPLETED");
      expect(status.label).toBe("Completed");
      expect(status.isUpcoming).toBe(false);
      expect(status.isCompleted).toBe(true);
    });

    it("shows 'Completed' when exam was today but end time has already passed", () => {
      const afternoonNow = new Date("2026-10-20T14:30:00");
      const status = getRelativeExamStatus(
        "2026-10-20T00:00:00.000Z",
        "09:00",
        "12:00",
        afternoonNow,
      );
      expect(status.key).toBe("COMPLETED");
      expect(status.label).toBe("Completed");
      expect(status.isUpcoming).toBe(false);
      expect(status.isCompleted).toBe(true);
    });
  });

  /* =========================================================
     6-7. Regular vs Backlog Distinction
     ========================================================= */
  describe("6-7. Regular vs Backlog Subjects", () => {
    it("identifies REGULAR subjects accurately", () => {
      const entry = {
        subject: { name: "Advanced Data Structures", code: "INF-ADS-S3-0194" },
        category: "REGULAR",
      };
      const info = getSubjectInfo(entry);
      expect(info.name).toBe("Advanced Data Structures");
      expect(info.code).toBe("INF-ADS-S3-0194");
      expect(info.category).toBe("REGULAR");
      expect(info.originalSemester).toBeNull();
    });

    it("identifies BACKLOG subjects and preserves original semester", () => {
      const entry = {
        subject: { name: "Database Management System", code: "INF-DBMS-S1-3704" },
        category: "BACKLOG",
        originalSemester: 1,
      };
      const info = getSubjectInfo(entry);
      expect(info.name).toBe("Database Management System");
      expect(info.code).toBe("INF-DBMS-S1-3704");
      expect(info.category).toBe("BACKLOG");
      expect(info.originalSemester).toBe(1);
    });
  });

  /* =========================================================
     8-9. Venue and Date/Time Formatting
     ========================================================= */
  describe("8-9. Venue, Duration & Formatting", () => {
    it("formats 12-hour time cleanly", () => {
      expect(formatTime12Hour("09:30")).toBe("09:30 AM");
      expect(formatTime12Hour("14:15")).toBe("02:15 PM");
      expect(formatTime12Hour("12:00")).toBe("12:00 PM");
      expect(formatTime12Hour("00:00")).toBe("12:00 AM");
      expect(formatTime12Hour(null)).toBe("N/A");
    });

    it("calculates durations in hours and minutes", () => {
      expect(calculateDuration("10:00", "12:00")).toBe("2h");
      expect(calculateDuration("10:00", "12:30")).toBe("2h 30m");
      expect(calculateDuration("09:15", "10:00")).toBe("45m");
      expect(calculateDuration("12:00", "10:00")).toBeNull();
      expect(calculateDuration(null, "12:00")).toBeNull();
    });

    it("formats date with weekday and ISO string", () => {
      expect(formatDate("2026-10-20T00:00:00.000Z")).toBe("20 Oct 2026");
      expect(formatDate(null)).toBe("N/A");
      expect(formatSession("FORENOON")).toBe("Morning");
      expect(formatSession("AFTERNOON")).toBe("Afternoon");
      expect(formatSession(null)).toBe("N/A");

      const result = formatDateWithWeekday("2026-10-20T00:00:00.000Z");
      expect(result.weekday).toBe("TUE");
      expect(result.dateStr).toContain("2026");
      expect(result.isoDate).toBe("2026-10-20");
    });

    it("computes exam date range across scheduled papers", () => {
      const subjects = [
        { examDate: "2026-10-20T00:00:00.000Z" },
        { examDate: "2026-10-25T00:00:00.000Z" },
        { examDate: "2026-10-22T00:00:00.000Z" },
      ];
      const range = getExamDateRange(subjects);
      expect(range).toContain("20 Oct 2026");
      expect(range).toContain("25 Oct 2026");
      expect(range).toContain("–");
    });
  });

  /* =========================================================
     10-12. Filter Logic Tests
     ========================================================= */
  describe("10-12. Upcoming, Completed & All Filtering", () => {
    const fixedNow = new Date("2026-10-20T10:00:00");
    const testSubjects = [
      {
        _id: "past1",
        examDate: "2026-10-15T00:00:00.000Z",
        startTime: "09:00",
        endTime: "12:00",
      },
      {
        _id: "today1",
        examDate: "2026-10-20T00:00:00.000Z",
        startTime: "10:00",
        endTime: "13:00",
      },
      {
        _id: "future1",
        examDate: "2026-10-22T00:00:00.000Z",
        startTime: "14:00",
        endTime: "17:00",
      },
    ];

    it("filters ALL subjects", () => {
      const all = filterScheduleSubjects(testSubjects, "ALL", fixedNow);
      expect(all.length).toBe(3);
    });

    it("filters UPCOMING subjects only", () => {
      const upcoming = filterScheduleSubjects(testSubjects, "UPCOMING", fixedNow);
      expect(upcoming.map((s) => s._id)).toEqual(["today1", "future1"]);
    });

    it("filters COMPLETED subjects only", () => {
      const completed = filterScheduleSubjects(testSubjects, "COMPLETED", fixedNow);
      expect(completed.map((s) => s._id)).toEqual(["past1"]);
    });

    it("computes summary metrics accurately", () => {
      const metrics = getScheduleSummaryMetrics(
        [
          {
            examDate: "2026-10-15T00:00:00.000Z",
            startTime: "09:00",
            endTime: "12:00",
            category: "REGULAR",
          },
          {
            examDate: "2026-10-20T00:00:00.000Z",
            startTime: "10:00",
            endTime: "13:00",
            category: "BACKLOG",
            originalSemester: 1,
          },
          {
            examDate: "2026-10-22T00:00:00.000Z",
            startTime: "14:00",
            endTime: "17:00",
            category: "REGULAR",
          },
        ],
        fixedNow,
      );

      expect(metrics.totalPapers).toBe(3);
      expect(metrics.regularPapers).toBe(2);
      expect(metrics.backlogPapers).toBe(1);
      expect(metrics.completedPapers).toBe(1);
      expect(metrics.upcomingPapers).toBe(2);
      expect(metrics.nextExamText).toBe("Today");
    });
  });

  /* =========================================================
     13-15. Component Rendering Tests
     ========================================================= */
  describe("13-15. Component Rendering in DOM", () => {
    it("renders empty state when no published exams are provided", () => {
      act(() => {
        root.render(<PublishedExamTimetable exams={[]} />);
      });

      expect(container.textContent).toContain("No published exam timetable available");
      expect(container.textContent).toContain(
        "Published exam timetables will appear here once the Exam Coordinator publishes them.",
      );
    });

    it("renders detailed schedule with badges, room no., timing, and filter tabs", () => {
      const mockScheduleExam = {
        _id: "exam-123",
        name: "Semester 4 Final Examination",
        course_id: { name: "B.Tech Computer Science", code: "CSE" },
        semester: 4,
        academicYear: "2025-26",
        status: "PUBLISHED",
        subjects: [
          {
            _id: "entry-1",
            subject: { name: "Advanced Data Structures", code: "CS-401" },
            category: "REGULAR",
            examDate: "2026-10-20T00:00:00.000Z",
            startTime: "10:00",
            endTime: "12:00",
            session: "FORENOON",
            room: "Room 101",
          },
          {
            _id: "entry-2",
            subject: { name: "Database Management System", code: "CS-201" },
            category: "BACKLOG",
            originalSemester: 2,
            examDate: "2026-10-22T00:00:00.000Z",
            startTime: "14:00",
            endTime: "17:00",
            session: "AFTERNOON",
            room: null, // Test room not assigned
          },
        ],
      };

      act(() => {
        root.render(<PublishedExamTimetable exams={[mockScheduleExam]} />);
      });

      const text = container.textContent;

      // 1. Exam Header Details
      expect(text).toContain("Semester 4 Final Examination");
      expect(text).toContain("B.Tech Computer Science (CSE)");
      expect(text).toContain("Semester 4");
      expect(text).toContain("2025-26");
      expect(text).toContain("Exam Dates:");

      // 2. Quick Summary Strip
      expect(text).toContain("Total Papers");
      expect(text).toContain("Regular");
      expect(text).toContain("Backlog");

      // 3. Regular and Backlog Badges
      expect(text).toContain("REGULAR");
      expect(text).toContain("BACKLOG · Sem 2");

      // 4. Timing & Session
      expect(text).toContain("10:00 AM – 12:00 PM");
      expect(text).toContain("2h");
      expect(text).toContain("Morning");
      expect(text).toContain("Afternoon");

      // 5. Room No. Presentation
      expect(text).toContain("Room No.");
      expect(text).toContain("Room 101");
      expect(text).toContain("Room not assigned");
      expect(text).not.toContain("Venue");

      // 6. Filter Tabs
      expect(text).toContain("All");
      expect(text).toContain("Upcoming");
      expect(text).toContain("Completed");

      // 7. Mobile Card List exists in DOM
      const mobileList = container.querySelector(".published-exam-mobile-list");
      expect(mobileList).not.toBeNull();
      expect(mobileList.textContent).toContain("Advanced Data Structures");
      expect(mobileList.textContent).toContain("BACKLOG · Sem 2");
    });

    it("switches filter tabs and displays filter empty states correctly", () => {
      const mockPastOnlyExam = {
        _id: "exam-past",
        name: "Completed Exams Only",
        subjects: [
          {
            _id: "past-1",
            subject: { name: "History of Computing", code: "HIS-101" },
            category: "REGULAR",
            examDate: "2020-01-01T00:00:00.000Z",
            startTime: "10:00",
            endTime: "12:00",
            session: "FORENOON",
            room: "Hall 3",
          },
        ],
      };

      act(() => {
        root.render(<PublishedExamTimetable exams={[mockPastOnlyExam]} />);
      });

      // Find Upcoming tab button
      const buttons = Array.from(container.querySelectorAll(".published-exam-filter-btn"));
      const upcomingBtn = buttons.find((btn) => btn.textContent.includes("Upcoming"));
      expect(upcomingBtn).toBeDefined();

      // Click Upcoming tab
      act(() => {
        upcomingBtn.click();
      });

      expect(container.textContent).toContain("All exams in this schedule have been completed");
    });
  });
});
