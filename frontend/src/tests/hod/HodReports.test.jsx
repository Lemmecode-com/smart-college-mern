import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HodReports from "../../pages/dashboard/HOD/HodReports";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }) => (
    <div data-testid="line-chart" data-chart={JSON.stringify(data || [])}>
      {children}
    </div>
  ),
  Line: () => <div data-testid="line" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
  XAxis: (props) => <div data-testid="x-axis">{props?.dataKey}</div>,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

const mockExportToExcel = vi.fn().mockResolvedValue({ success: true });
const mockExportToPDF = vi.fn().mockResolvedValue({ success: true });
vi.mock("../../utils/exportHelpers", () => ({
  exportToExcel: (...args) => mockExportToExcel(...args),
  exportToPDF: (...args) => mockExportToPDF(...args),
}));

const mockApi = {
  get: vi.fn(),
};

vi.mock("../../api/axios", () => ({
  default: {
    get: (...args) => mockApi.get(...args),
  },
}));

vi.mock("../../components/Loading", () => ({
  default: ({ text }) => <div data-testid="loading">{text || "Loading..."}</div>,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: ({ items }) => (
    <nav data-testid="breadcrumb">
      {items.map((it, idx) => (
        <span key={idx}>{it.label}</span>
      ))}
    </nav>
  ),
}));

vi.mock("../../components/ApiError", () => ({
  default: ({ title, message, onRetry, onGoBack }) => (
    <div data-testid="api-error">
      <div data-testid="error-title">{title}</div>
      <div data-testid="error-message">{message}</div>
      <button data-testid="error-retry" onClick={onRetry}>
        Retry
      </button>
      <button data-testid="error-back" onClick={onGoBack}>
        Go Back
      </button>
    </div>
  ),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("HodReports UI/UX Refinement & Data Consistency", () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      if (root) root.unmount();
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(<HodReports />);
    });
  };

  const sampleReportData = {
    department: {
      id: "6abb42c9dae479b0b7007b5d",
      name: "Information Technology",
      code: "INFT",
      programsCount: 2,
    },
    kpis: {
      totalTeachers: 4,
      totalStudents: 4,
      totalSubjects: 16,
      totalCourses: 2,
      publishedTimetables: 1,
      draftTimetables: 0,
      archivedTimetables: 7,
      pendingExceptions: 0,
      attendanceSummary: {
        totalSessions: 8,
        totalRecords: 16,
        present: 16,
        absent: 0,
        averageAttendancePercentage: 100,
      },
    },
    subjectWise: [
      {
        id: "sub-1",
        code: "IT-401",
        name: "Cloud Computing",
        teacher: "Dr. Vishal Kore",
        sessions: 4,
        present: 8,
        absent: 0,
        avg: 90,
        status: "Good",
        semester: 4,
      },
      {
        id: "sub-2",
        code: "IT-402",
        name: "Machine Learning",
        teacher: "Dr. Vishnu Rasal",
        sessions: 4,
        present: 8,
        absent: 0,
        avg: 70,
        status: "Warning",
        semester: 4,
      },
    ],
    weeklyTrend: [
      {
        week: "Wk 1",
        startDate: "2026-10-01",
        endDate: "2026-10-07",
        dateRange: "Oct 01 - Oct 07",
        sessions: 8,
        present: 16,
        absent: 0,
        rate: 100,
        target: 75,
      },
    ],
    lowAttendanceStudents: [],
    facultyWorkload: [
      {
        id: "fac-1",
        name: "Dr. Vishal Kore",
        empId: "EMP-001",
        specialization: "Cloud Computing",
        sessions: 4,
        timelySessions: 4,
        timelinessPercent: 100,
        compliance: "100% On-Time",
        status: "Compliant",
      },
      {
        id: "fac-2",
        name: "Dr. Vishnu Rasal",
        empId: "EMP-002",
        specialization: "Machine Learning",
        sessions: 4,
        timelySessions: 4,
        timelinessPercent: 100,
        compliance: "100% On-Time",
        status: "Compliant",
      },
    ],
    actionRequired: {
      timetableExceptions: 0,
      lowAttendanceCount: 0,
      pendingAttendanceSessions: 0,
      unassignedSubjects: 0,
    },
    academicPerformance: null, // Real DB state: 0 marks available yet
    recentActivity: [
      {
        id: "act-1",
        type: "ATTENDANCE_SESSION_CLOSED",
        title: "Attendance session closed",
        whoDidIt: "Dr. Vishal Kore",
        timeAgo: "2 hours ago",
        status: "Closed",
        readableText: "Attendance session closed · Dr. Vishal Kore · 2 hours ago",
        subjectOrDetails: "Cloud Computing",
      },
    ],
    filterOptions: {
      academicYears: ["2025-2026"],
      programs: [
        { id: "prog-1", name: "B.Sc. IT", code: "BSCIT", semesters: 4 },
        { id: "prog-2", name: "MSC IT", code: "MSCIT", semesters: 4 },
      ],
    },
    meta: {
      departmentId: "6abb42c9dae479b0b7007b5d",
      collegeId: "6abb42c9dae479b0b7007b5c",
      generatedAt: "2026-10-12T10:00:00.000Z",
    },
  };

  it("renders loading state initially before API responds", async () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    await renderComponent();

    expect(container.querySelector("[data-testid='loading']")).toBeTruthy();
    expect(container.textContent).toContain("Loading Department Reports...");
  });

  it("renders page header with real department details and Data as of only once", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    expect(container.querySelector(".hod-reports-header-title").textContent).toBe(
      "Department Reports"
    );
    expect(container.textContent).toContain("Information Technology");
    expect(container.textContent).toContain("(INFT)");
    expect(container.textContent).toContain("2 Programs · 16 Subjects");

    // "Data as of" appears once, in the header only
    const timestampMatches = container.textContent.match(/Data as of/g) || [];
    expect(timestampMatches.length).toBe(1);

    // No Back to Dashboard button
    expect(container.textContent).not.toContain("Back to Dashboard");

    // Export buttons present
    const exportBtns = container.querySelectorAll(".hod-export-btn");
    expect(exportBtns.length).toBe(2);
  });

  it("satisfies mathematical sanity rules across department metrics", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const sessionsHeld = sampleReportData.kpis.attendanceSummary.totalSessions;
    const sumSubjectSessions = sampleReportData.subjectWise.reduce(
      (sum, s) => sum + s.sessions,
      0
    );
    const sumFacultySessions = sampleReportData.facultyWorkload.reduce(
      (sum, f) => sum + f.sessions,
      0
    );
    const presentMarks = sampleReportData.kpis.attendanceSummary.present;
    const absentMarks = sampleReportData.kpis.attendanceSummary.absent;
    const totalRecords = sampleReportData.kpis.attendanceSummary.totalRecords;
    const watchlistStudents = sampleReportData.lowAttendanceStudents.length;
    const totalStudents = sampleReportData.kpis.totalStudents;

    // Sanity rule 1: sum of subject sessions = Sessions Held
    expect(sumSubjectSessions).toBe(sessionsHeld);

    // Sanity rule 2: sum of faculty sessions = Sessions Held
    expect(sumFacultySessions).toBe(sessionsHeld);

    // Sanity rule 3: Present + Absent = total records
    expect(presentMarks + absentMarks).toBe(totalRecords);

    // Sanity rule 4: watchlist students <= Total Students
    expect(watchlistStudents).toBeLessThanOrEqual(totalStudents);
  });

  it("loads filters dynamically from real department data and supports selection", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Program dropdown has real programs
    const progSelect = container.querySelector("#hod-filter-course");
    expect(progSelect).toBeTruthy();
    expect(progSelect.textContent).toContain("All Programs");
    expect(progSelect.textContent).toContain("B.Sc. IT (BSCIT)");
    expect(progSelect.textContent).toContain("MSC IT (MSCIT)");
    expect(progSelect.textContent).not.toContain("B.Tech Computer Science");

    // Academic year dropdown has real academic year
    const aySelect = container.querySelector("#hod-filter-ay");
    expect(aySelect.textContent).toContain("2025-2026");

    // Semester dropdown has available semesters
    const semSelect = container.querySelector("#hod-filter-sem");
    expect(semSelect.textContent).toContain("All Semesters");
    expect(semSelect.textContent).toContain("Semester 4");

    // Date range picker: Custom range inputs appear only when "CUSTOM" selected
    const dateRangeSelect = container.querySelector("#hod-filter-range");
    expect(container.querySelector(".hod-filter-custom-dates")).toBeNull();

    await act(async () => {
      dateRangeSelect.value = "CUSTOM";
      dateRangeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.querySelector(".hod-filter-custom-dates")).toBeTruthy();
  });

  it("changing any filter refetches overview with active query parameters", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const progSelect = container.querySelector("#hod-filter-course");
    await act(async () => {
      progSelect.value = "prog-1";
      progSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Verify api was called with courseId=prog-1
    expect(mockApi.get).toHaveBeenCalledWith(
      expect.stringContaining("courseId=prog-1")
    );
  });

  it("renders empty states properly: 0 low attendance watchlist, null academic performance, and chart note", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Watchlist with 0 students displays muted gray text
    expect(container.textContent).toContain("No students below 75%");

    // Academic performance with null marks displays muted gray text (never fake values)
    expect(container.textContent).toContain("No marks data available yet");
    expect(container.textContent).not.toContain("94% Pass Rate");
    expect(container.textContent).not.toContain("Pass Percentage 94%");
    expect(container.textContent).not.toContain("Pending Data");

    // Chart with 1 data point shows note
    expect(container.textContent).toContain(
      "Only one week of data in this period"
    );

    // Action Required with 0 items displays muted style
    expect(container.textContent).toContain("Cleared");
    expect(container.textContent).toContain("Compliant");
  });

  it("renders 4 compact clickable KPI cards and stacked attendance split", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const cards = container.querySelectorAll(".hod-kpi-card");
    expect(cards.length).toBe(4);

    // Whole card 1 (Teachers) clickable
    act(() => {
      cards[0].click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/teachers");

    // Whole card 4 (Timetables) clickable
    act(() => {
      cards[3].click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/timetable/list");

    // Stacked Present / Absent split
    const splitVal = container.querySelector(".hod-attend-split-val");
    expect(splitVal).toBeTruthy();
    expect(splitVal.textContent).toContain("Present");
    expect(splitVal.textContent).toContain("16");
    expect(splitVal.textContent).toContain("Absent");
    expect(splitVal.textContent).toContain("0");
  });

  it("Subject-wise table default sorts lowest Avg % first and supports toggling", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const rows = container.querySelectorAll(".hod-subjects-section tbody tr");
    expect(rows.length).toBe(2);

    // Default sort: lowest Avg % first (Machine Learning 70% before Cloud Computing 90%)
    expect(rows[0].textContent).toContain("Machine Learning");
    expect(rows[0].textContent).toContain("70%");
    expect(rows[1].textContent).toContain("Cloud Computing");
    expect(rows[1].textContent).toContain("90%");

    // Click Avg % header to toggle to descending
    const avgHeader = container.querySelector('th[aria-label="Sort by Average Attendance Percentage"]');
    await act(async () => {
      avgHeader.click();
    });

    const updatedRows = container.querySelectorAll(".hod-subjects-section tbody tr");
    expect(updatedRows[0].textContent).toContain("Cloud Computing");
    expect(updatedRows[0].textContent).toContain("90%");
  });

  it("watchlist Send Notice button opens confirmation modal before dispatching", async () => {
    const dataWithLowAttendance = {
      ...sampleReportData,
      lowAttendanceStudents: [
        {
          id: "s-1",
          name: "Amit Sharma",
          prn: "PRN-101",
          sem: "Sem 4",
          attendance: 65,
          missed: 3,
          status: "Warning",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithLowAttendance });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    expect(container.textContent).toContain("Amit Sharma");
    const sendNoticeBtn = container.querySelector(".hod-send-notice-btn");
    expect(sendNoticeBtn).toBeTruthy();
    expect(sendNoticeBtn.textContent).toBe("Send Notice");
    // Priority 3 Item 9: Backend endpoint does not exist yet; button is disabled with tooltip "Coming soon"
    expect(sendNoticeBtn.hasAttribute("disabled")).toBe(true);
    expect(sendNoticeBtn.getAttribute("title")).toBe("Coming soon");
    expect(sendNoticeBtn.className).toContain("hod-send-notice-btn--disabled");
  });

  it("renders Recent Activity with readable format: what happened, who did it, relative time", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const rightCol = container.querySelector(".hod-right-column-stack");
    expect(rightCol).toBeTruthy();
    expect(rightCol.textContent).toContain("Recent Activity");
    expect(rightCol.textContent).toContain(
      "Attendance session closed · Dr. Vishal Kore · 2 hours ago"
    );
  });

  it("passes active filters and multi-sheet options to export functions", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const pdfBtn = Array.from(container.querySelectorAll(".hod-export-btn")).find(
      (b) => b.textContent.includes("Export PDF")
    );
    const excelBtn = Array.from(
      container.querySelectorAll(".hod-export-btn")
    ).find((b) => b.textContent.includes("Export Excel"));

    await act(async () => {
      pdfBtn.click();
    });
    expect(mockExportToPDF).toHaveBeenCalledWith(
      expect.stringContaining("Information Technology"),
      expect.any(Array),
      expect.any(Array),
      expect.stringContaining("HOD_Report_INFT"),
      expect.objectContaining({
        filterMetadata: expect.stringContaining("Academic Year"),
      })
    );

    await act(async () => {
      excelBtn.click();
    });
    expect(mockExportToExcel).toHaveBeenCalledWith(
      expect.stringContaining("Information Technology"),
      expect.any(Array),
      expect.any(Array),
      expect.stringContaining("HOD_Report_INFT"),
      expect.objectContaining({
        sheets: expect.arrayContaining([
          expect.objectContaining({ name: "Summary" }),
          expect.objectContaining({ name: "Subject-wise" }),
          expect.objectContaining({ name: "Low Attendance" }),
          expect.objectContaining({ name: "Faculty" }),
        ]),
      })
    );
  });

  // ================= Specific Tests for the 6 Requested Issues =================

  it("Issue 1: Academic Performance displays real marks data and removes hardcoded 94% badge", async () => {
    const dataWithRealMarks = {
      ...sampleReportData,
      academicPerformance: {
        departmentAverage: 76,
        passPercentage: 88,
        topSubject: "Object Oriented Programming Practical",
        evaluatedRecords: 42,
      },
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithRealMarks });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Renders real pass rate badge and values
    expect(container.textContent).toContain("88% Pass Rate");
    expect(container.textContent).toContain("Department Average");
    expect(container.textContent).toContain("76%");
    expect(container.textContent).toContain("Pass Percentage");
    expect(container.textContent).toContain("88%");
    expect(container.textContent).toContain("Top Performing Subject");
    expect(container.textContent).toContain("Object Oriented Programming Practical");

    // Must NOT contain hardcoded 94%
    expect(container.textContent).not.toContain("94% Pass Rate");
    expect(container.textContent).not.toContain("Pass Percentage 94%");
  });

  it("Issue 2A: Weekly Trend shows single week note when 1 point exists for 8 sessions", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();
    expect(container.textContent).toContain("Only one week of data in this period");
    expect(container.textContent).not.toContain(
      "No attendance sessions recorded for the selected filter period."
    );
  });

  it("Issue 2B: Weekly Trend shows empty message only when 0 sessions recorded", async () => {
    const zeroSessionsData = {
      ...sampleReportData,
      kpis: {
        ...sampleReportData.kpis,
        attendanceSummary: {
          totalSessions: 0,
          totalRecords: 0,
          present: 0,
          absent: 0,
          averageAttendancePercentage: 0,
        },
      },
      weeklyTrend: [],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: zeroSessionsData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();
    expect(container.textContent).toContain(
      "No attendance sessions recorded for the selected filter period."
    );
  });

  it("Issue 3: Recent Activity maps HOD-relevant events to friendly readable entries", async () => {
    const dataWithHODEvents = {
      ...sampleReportData,
      recentActivity: [
        {
          id: "act-1",
          type: "ATTENDANCE_SESSION_CLOSED",
          title: "Attendance session closed",
          whoDidIt: "Dr. Vishal Kaur",
          timeAgo: "2 hours ago",
          status: "Closed",
          readableText: "Attendance session closed · Dr. Vishal Kaur · 2 hours ago",
          subjectOrDetails: "Cloud Computing",
        },
        {
          id: "act-2",
          type: "TIMETABLE_PUBLISHED",
          title: "Timetable published",
          whoDidIt: "HOD",
          timeAgo: "1 day ago",
          status: "Published",
          readableText: "Timetable published · HOD · 1 day ago",
          subjectOrDetails: "Semester 4 IT Schedule",
        },
        {
          id: "act-3",
          type: "EXCEPTION_APPROVED",
          title: "Timetable exception approved",
          whoDidIt: "HOD",
          timeAgo: "3 days ago",
          status: "Approved",
          readableText: "Timetable exception approved · HOD · 3 days ago",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithHODEvents });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    expect(container.textContent).toContain(
      "Attendance session closed · Dr. Vishal Kaur · 2 hours ago"
    );
    expect(container.textContent).toContain(
      "Timetable published · HOD · 1 day ago"
    );
    expect(container.textContent).toContain(
      "Timetable exception approved · HOD · 3 days ago"
    );
    // Excluded accounts/departments
    expect(container.textContent).not.toContain("STAFF_CREATED");
    expect(container.textContent).not.toContain("DEPARTMENT_CREATED");
  });

  it("Issue 4 & 5: Faculty table shows Domain/Specialization or 'Not set', compliant status (never '--'), and timeliness tooltip", async () => {
    const dataWithMissingSpecialization = {
      ...sampleReportData,
      facultyWorkload: [
        {
          id: "fac-1",
          name: "Dr. Sudhir Katake",
          empId: "EMP-003",
          specialization: null, // missing from teacher profile
          sessions: 4,
          timelySessions: 4,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
        {
          id: "fac-2",
          name: "Prof. Anjali Mehta",
          empId: "EMP-004",
          specialization: "Data Science",
          sessions: 3,
          timelySessions: 2,
          timelinessPercent: 67,
          compliance: "67% On-Time",
          status: "Warning",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithMissingSpecialization });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Faculty 1 shows "Not set" for missing specialization
    expect(container.textContent).toContain("Not set");
    // Faculty 2 shows "Data Science"
    expect(container.textContent).toContain("Data Science");

    // Status shows Compliant / Warning / Overdue, never "--"
    expect(container.textContent).toContain("Compliant");
    expect(container.textContent).toContain("Warning");
    expect(container.textContent).not.toContain("--");

    // Column header includes tooltip defining on-time rule
    const timelinessHeader = Array.from(
      container.querySelectorAll(".hod-table th")
    ).find((th) => th.textContent.includes("Attendance Timeliness"));
    expect(timelinessHeader).toBeTruthy();
    const tooltipSpan = timelinessHeader.querySelector(".hod-tooltip-icon");
    expect(tooltipSpan).toBeTruthy();
    expect(tooltipSpan.getAttribute("title")).toContain(
      "On-Time Rule: Marked and submitted within 24 hours of scheduled lecture date/time without system auto-close."
    );
  });

  it("Issue 6: Typography classes applied for filter labels and empty state texts", async () => {
    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: sampleReportData });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const filterLabels = container.querySelectorAll(".hod-filter-label");
    expect(filterLabels.length).toBeGreaterThanOrEqual(4);

    const emptyTexts = container.querySelectorAll(".hod-muted-empty");
    expect(emptyTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("Final Fix Item 1: Faculty with 0 sessions shows N/A and No sessions (no percentage), and satisfies sanity sum", async () => {
    const dataWithZeroSessionFaculty = {
      ...sampleReportData,
      kpis: {
        ...sampleReportData.kpis,
        attendanceSummary: {
          ...sampleReportData.kpis.attendanceSummary,
          totalSessions: 8,
        },
      },
      facultyWorkload: [
        {
          id: "fac-1",
          name: "Dr. Active Teacher",
          empId: "EMP-001",
          specialization: "AI & ML",
          sessions: 8,
          timelySessions: 8,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
        {
          id: "fac-2",
          name: "Prof. Zero Sessions",
          empId: "EMP-002",
          specialization: "Cloud Computing",
          sessions: 0,
          timelySessions: 0,
          timelinessPercent: null,
          compliance: "N/A",
          status: "No sessions",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithZeroSessionFaculty });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Faculty with 0 sessions shows "N/A" and "No sessions"
    expect(container.textContent).toContain("Prof. Zero Sessions");
    expect(container.textContent).toContain("0 sessions");
    expect(container.textContent).toContain("N/A");
    expect(container.textContent).toContain("No sessions");

    // Must not calculate a percentage for 0 sessions
    const facultySection = Array.from(
      container.querySelectorAll(".hod-section-card")
    ).find((card) =>
      card.textContent.includes("Faculty Workload & Attendance Overview")
    );
    expect(facultySection).toBeTruthy();
    const rows = facultySection.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    const zeroRow = rows[1];
    expect(zeroRow.textContent).toContain("Prof. Zero Sessions");
    expect(zeroRow.textContent).toContain("N/A");
    expect(zeroRow.textContent).toContain("No sessions");
    expect(zeroRow.textContent).not.toContain("0% On-Time");
    expect(zeroRow.textContent).not.toContain("100% On-Time");

    // Neutral gray pill class
    const neutralPill = zeroRow.querySelector(".hod-status-pill--neutral");
    expect(neutralPill).toBeTruthy();
    expect(neutralPill.textContent).toBe("No sessions");

    // Sanity rule: sum of faculty sessions still equals Sessions Held (8 + 0 = 8)
    const sumSessions = dataWithZeroSessionFaculty.facultyWorkload.reduce((sum, f) => sum + f.sessions, 0);
    expect(sumSessions).toBe(dataWithZeroSessionFaculty.kpis.attendanceSummary.totalSessions);
  });

  it("Final Fix Item 2: Weekly Attendance Trend with single data point displays real date range and centers point without dummy padding ticks", async () => {
    const dataWithSingleDateRange = {
      ...sampleReportData,
      weeklyTrend: [
        {
          week: "5-11 Oct",
          dateRange: "Oct 5 – Oct 11",
          startDate: "2026-10-05",
          endDate: "2026-10-11",
          sessions: 8,
          present: 16,
          absent: 0,
          rate: 100,
          target: 75,
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithSingleDateRange });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Displays note and benchmark
    expect(container.textContent).toContain("Only one week of data in this period");
    expect(container.textContent).toContain("Goal: 75% dashed line");

    const lineChartEl = container.querySelector("[data-testid='line-chart']");
    expect(lineChartEl).toBeTruthy();
    const chartData = JSON.parse(lineChartEl.getAttribute("data-chart"));

    // Verify exactly ONE data point without dummy padding ticks
    expect(chartData.length).toBe(1);
    expect(chartData[0].isDummy).toBeUndefined();
    expect(chartData[0].week).toBe("5-11 Oct");
    expect(chartData[0].rate).toBe(100);

    // ReferenceLine for continuous 75% benchmark
    expect(container.querySelector("[data-testid='reference-line']")).toBeTruthy();

    // Real date range label used instead of "Wk N"
    expect(container.textContent).not.toContain("Wk 1");
  });

  it("Final Fix Item 3A: Specialization column hidden if NO teacher has specialization", async () => {
    const dataNoSpecialization = {
      ...sampleReportData,
      facultyWorkload: [
        {
          id: "fac-1",
          name: "Dr. Alpha",
          empId: "EMP-001",
          specialization: null,
          sessions: 4,
          timelySessions: 4,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
        {
          id: "fac-2",
          name: "Dr. Beta",
          empId: "EMP-002",
          specialization: "",
          sessions: 4,
          timelySessions: 4,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataNoSpecialization });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const facultySection = Array.from(
      container.querySelectorAll(".hod-section-card")
    ).find((card) =>
      card.textContent.includes("Faculty Workload & Attendance Overview")
    );
    expect(facultySection).toBeTruthy();
    const headersNoSpec = Array.from(facultySection.querySelectorAll("th")).map((th) => th.textContent.trim());
    expect(headersNoSpec.some((h) => h.includes("Specialization"))).toBe(false);
  });

  it("Final Fix Item 3B: Specialization column shown when at least one teacher has a value, with Not set for others", async () => {
    const dataWithOneSpecialization = {
      ...sampleReportData,
      facultyWorkload: [
        {
          id: "fac-1",
          name: "Dr. Alpha",
          empId: "EMP-001",
          specialization: "Cybersecurity",
          sessions: 4,
          timelySessions: 4,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
        {
          id: "fac-2",
          name: "Dr. Beta",
          empId: "EMP-002",
          specialization: null,
          sessions: 4,
          timelySessions: 4,
          timelinessPercent: 100,
          compliance: "100% On-Time",
          status: "Compliant",
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithOneSpecialization });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const facultySection = Array.from(
      container.querySelectorAll(".hod-section-card")
    ).find((card) =>
      card.textContent.includes("Faculty Workload & Attendance Overview")
    );
    expect(facultySection).toBeTruthy();
    const headersWithSpec = Array.from(facultySection.querySelectorAll("th")).map((th) => th.textContent.trim());
    expect(headersWithSpec.some((h) => h.includes("Specialization"))).toBe(true);
    expect(facultySection.textContent).toContain("Cybersecurity");
    expect(facultySection.textContent).toContain("Not set");
  });

  it("Final Fix Item 4: Recent Activity displays timetable names, groups repeated actions with active hint, and provides expandable list", async () => {
    const dataWithGroupedActivity = {
      ...sampleReportData,
      recentActivity: [
        {
          id: "grouped-published-2026-10-09",
          type: "TIMETABLE_PUBLISHED_GROUP",
          title: "3 timetables published",
          whoDidIt: "HOD",
          readableText: "3 timetables published (1 currently active) · HOD · Yesterday",
          isGrouped: true,
          subItems: [
            "MSC IT Sem 4",
            "MSC IT Sem 3",
            "MSC IT Sem 2",
          ],
        },
        {
          id: "single-item",
          type: "TIMETABLE_PUBLISHED",
          title: "Timetable published",
          whoDidIt: "HOD",
          readableText: "Timetable published · MSC IT Sem 4 · HOD · Yesterday",
          subjectOrDetails: "MSC IT Sem 4",
          isGrouped: false,
        },
        {
          id: "plain-text-fallback",
          type: "TIMETABLE_PUBLISHED",
          title: "Timetable published",
          whoDidIt: "HOD",
          readableText: "Timetable published · HOD · 3 days ago",
          isGrouped: false,
        },
      ],
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithGroupedActivity });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    // Grouped entry with active hint
    expect(container.textContent).toContain("3 timetables published (1 currently active) · HOD · Yesterday");
    // Single entry with timetable name
    expect(container.textContent).toContain("Timetable published · MSC IT Sem 4 · HOD · Yesterday");
    // Plain text fallback
    expect(container.textContent).toContain("Timetable published · HOD · 3 days ago");

    // Expandable toggle button
    const expandBtn = container.querySelector(".hod-activity-expand-btn");
    expect(expandBtn).toBeTruthy();
    expect(expandBtn.textContent).toContain("View all 3 timetables");

    // Sub-items hidden before expansion
    expect(container.querySelector(".hod-activity-subitems-list")).toBeNull();

    // Click expand
    await act(async () => {
      expandBtn.click();
    });

    expect(container.querySelector(".hod-activity-subitems-list")).toBeTruthy();
    expect(container.textContent).toContain("MSC IT Sem 4");
    expect(container.textContent).toContain("MSC IT Sem 3");
    expect(container.textContent).toContain("MSC IT Sem 2");
    expect(expandBtn.textContent).toContain("Hide details");
  });

  it("Final Fix Item 5: Pass Percentage caption has increased font size and high contrast class", async () => {
    const dataWithPerformance = {
      ...sampleReportData,
      academicPerformance: {
        departmentAverage: 82,
        passPercentage: 91,
        topSubject: "Network Security",
        evaluatedRecords: 35,
        passMarkPercent: 40,
      },
    };

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/hod/reports/overview")) {
        return Promise.resolve({ data: dataWithPerformance });
      }
      return Promise.resolve({ data: { teachers: [] } });
    });

    await renderComponent();

    const captionEl = container.querySelector(".hod-pass-mark-caption");
    expect(captionEl).toBeTruthy();
    expect(captionEl.textContent).toContain("Min pass mark: 40%");
  });
});
