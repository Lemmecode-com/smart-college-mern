import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HodDashboard, { getGreetingIST } from "../../pages/dashboard/HOD/HodDashboard";
import { AuthContext } from "../../auth/AuthContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, style, onClick, onKeyDown, role, tabIndex, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      delete cleanProps.initial;
      delete cleanProps.animate;
      delete cleanProps.exit;
      delete cleanProps.transition;
      delete cleanProps.variants;
      delete cleanProps.custom;
      return (
        <div
          className={className}
          style={style}
          onClick={onClick}
          onKeyDown={onKeyDown}
          role={role}
          tabIndex={tabIndex}
          {...cleanProps}
        >
          {children}
        </div>
      );
    },
    button: ({ children, className, style, onClick, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      delete cleanProps.initial;
      delete cleanProps.animate;
      return (
        <button className={className} style={style} onClick={onClick} {...cleanProps}>
          {children}
        </button>
      );
    },
    span: ({ children, className, ...props }) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
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

vi.mock("../../components/ApiError", () => ({
  default: ({ title, message, onRetry, onGoBack }) => (
    <div data-testid="api-error">
      <div>{title}</div>
      <div>{message}</div>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onGoBack}>Go Back</button>
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

describe("HodDashboard Component Tests", () => {
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
      root.unmount();
    });
    container.remove();
    container = null;
  });

  const renderComponent = async (user = { name: "vishal" }) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user }}>
          <HodDashboard />
        </AuthContext.Provider>
      );
    });
  };

  const sampleDashboardData = {
    department: {
      id: "dept-it-1",
      name: "Information Technology",
      code: "INFT",
    },
    hod: {
      id: "hod-1",
      name: "Dr. Vishal Kore",
      employeeId: "EMP-561196-001",
    },
    academicYear: "2026-2027",
    stats: {
      teachers: 4,
      students: 4,
      subjects: 16,
      programs: 2,
      timetables: 8,
      timetablesBreakdown: {
        total: 8,
        published: 1,
        draft: 0,
        archived: 7,
      },
      publishedTimetables: 1,
      draftTimetables: 0,
      archivedTimetables: 7,
      attendanceToday: 85,
      todayClosedSessionsCount: 2,
    },
    actionRequired: {
      pendingExceptions: 2,
      draftTimetables: 1,
      lowAttendanceStudents: 3,
      unmarkedSessions: 1,
      total: 7,
    },
    todaySchedule: [
      {
        id: "slot-1",
        time: "09:00 - 10:00",
        subjectName: "Advanced Database Systems",
        subjectCode: "INFT-401",
        teacherName: "Dr. Vishal Kore",
        room: "Lab 3",
        isMarked: true,
        attendanceStatus: "Marked",
      },
      {
        id: "slot-2",
        time: "10:00 - 11:00",
        subjectName: "Cloud Computing Architecture",
        subjectCode: "INFT-402",
        teacherName: "Mr. Suresh Rasal",
        room: "Room 204",
        isMarked: false,
        attendanceStatus: "Not Marked",
      },
    ],
    recentTimetables: [
      {
        _id: "tt-1",
        name: "MSC IT - Sem 4 (2027-2028) - Div A",
        semester: 4,
        academicYear: "2027-2028",
        status: "PUBLISHED",
        updatedAt: "2026-10-09T10:13:22.000Z",
      },
      {
        _id: "tt-2",
        name: "MSC IT - Sem 3 (2027-2028) - Div A",
        semester: 3,
        academicYear: "2027-2028",
        status: "DRAFT",
        updatedAt: "2026-10-08T10:00:00.000Z",
      },
      {
        _id: "tt-3",
        name: "MSC IT - Sem 2 (2026-2027) - Div A",
        semester: 2,
        academicYear: "2026-2027",
        status: "ARCHIVED",
        updatedAt: "2026-10-05T10:00:00.000Z",
      },
    ],
    recentActivity: [
      {
        id: "act-1",
        readableText: "Timetable published · MSC IT Sem 4 · HOD · Yesterday",
        timeAgo: "Yesterday",
      },
      {
        id: "act-2",
        readableText: "Attendance session closed · Dr. Vishal Kore · 2 hours ago",
        timeAgo: "2 hours ago",
      },
    ],
  };

  it("renders reusable Loading component while fetching dashboard data", async () => {
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApi.get.mockReturnValueOnce(pendingPromise);

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: { name: "vishal" } }}>
          <HodDashboard />
        </AuthContext.Provider>
      );
    });

    const loadingElement = container.querySelector('[data-testid="loading"]');
    expect(loadingElement).toBeTruthy();
    expect(loadingElement.textContent).toBe("Loading HOD Dashboard...");

    await act(async () => {
      resolvePromise({ data: sampleDashboardData });
    });
  });

  it("header greeting displays full name with title, not lowercase vishal", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent({ name: "vishal" });

    // The greeting header must show "Dr. Vishal Kore"
    expect(container.textContent).toContain("Dr. Vishal Kore");
    expect(container.textContent).toMatch(/Good (morning|afternoon|evening), Dr\. Vishal Kore/);
    expect(container.textContent).toContain("Information Technology");
    expect(container.textContent).toContain("INFT");
    expect(container.textContent).toContain("EMP-561196-001");
  });

  it("renders real values in Recent Timetables without placeholder labels", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    // Verify real values are displayed
    expect(container.textContent).toContain("Semester 4");
    expect(container.textContent).toContain("2027-2028");
    expect(container.textContent).toContain("MSC IT - Sem 4 (2027-2028) - Div A");

    // Make sure broken placeholder patterns are NOT rendered
    expect(container.textContent).not.toContain("Semester / Semester");
    expect(container.textContent).not.toContain("Sem •");
  });

  it("Header displays CURRENT academic year (AY 2026-2027) while Recent Timetables displays individual timetable's own academic year (2027-2028)", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    // Header has current academic year (2026-2027)
    expect(container.textContent).toContain("AY 2026-2027");

    // Timetable table retains the timetable's own academic year (2027-2028)
    const timetableRows = container.querySelectorAll(".hod-slim-table tbody tr");
    expect(timetableRows.length).toBeGreaterThan(0);
    expect(timetableRows[0].textContent).toContain("2027-2028");
    expect(timetableRows[0].textContent).toContain("Semester 4");
  });

  it("KPI numbers match the API and agree with Reports page", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    // Teachers KPI
    expect(container.textContent).toContain("Total Teachers");
    expect(container.textContent).toContain("4");

    // Students KPI
    expect(container.textContent).toContain("Total Students");
    expect(container.textContent).toContain("16 subjects · 2 programs");

    // Timetables KPI (Merged Published · Draft · Archived)
    expect(container.textContent).toContain("Timetables");
    expect(container.textContent).toContain("1 Published · 0 Draft · 7 Archived");

    // Attendance Today KPI
    expect(container.textContent).toContain("Attendance Today");
    expect(container.textContent).toContain("85%");
  });

  it("KPI cards are entirely clickable and navigate to correct routes", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    // 1. Teachers card -> /hod/teachers
    const teacherCard = container.querySelector('[aria-label*="Total Teachers"]');
    expect(teacherCard).toBeTruthy();
    act(() => {
      teacherCard.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/teachers");

    // 2. Students card -> /hod/reports
    const studentCard = container.querySelector('[aria-label*="Total Students"]');
    expect(studentCard).toBeTruthy();
    act(() => {
      studentCard.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/reports");

    // 3. Timetables card -> /timetable/list
    const timetablesCard = container.querySelector('[aria-label*="Timetables"]');
    expect(timetablesCard).toBeTruthy();
    act(() => {
      timetablesCard.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/timetable/list");

    // 4. Attendance Today card -> /hod/reports
    const attendanceCard = container.querySelector('[aria-label*="Attendance Today"]');
    expect(attendanceCard).toBeTruthy();
    act(() => {
      attendanceCard.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/reports");
  });

  it("Action Required section shows counts and navigates on review click", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    expect(container.textContent).toContain("Action Required");
    expect(container.textContent).toContain("Pending timetable exceptions");
    expect(container.textContent).toContain("Draft timetables awaiting review");
    expect(container.textContent).toContain("Students below 75% attendance");
    expect(container.textContent).toContain("Sessions with attendance not yet marked");

    // Click Review on pending exceptions -> /hod/exception-approvals
    const reviewButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent.includes("Review")
    );
    expect(reviewButtons.length).toBeGreaterThanOrEqual(1);
    act(() => {
      reviewButtons[0].click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/exception-approvals");
  });

  it("renders muted All Clear and empty states when no items pending", async () => {
    const emptyDashboardData = {
      ...sampleDashboardData,
      stats: {
        ...sampleDashboardData.stats,
        attendanceToday: null,
        todayClosedSessionsCount: 0,
      },
      actionRequired: {
        pendingExceptions: 0,
        draftTimetables: 0,
        lowAttendanceStudents: 0,
        unmarkedSessions: 0,
        total: 0,
      },
      todaySchedule: [],
      recentTimetables: [],
      recentActivity: [],
    };

    mockApi.get.mockResolvedValueOnce({ data: emptyDashboardData });
    await renderComponent();

    // All clear state in Action Required
    expect(container.textContent).toContain("All clear");

    // Today's schedule empty state
    expect(container.textContent).toContain("No lectures scheduled today");

    // Recent activity empty state
    expect(container.textContent).toContain("No recent activity");

    // Recent timetables empty state
    expect(container.textContent).toContain("No timetables yet");

    // Attendance today with no sessions displays N/A
    expect(container.textContent).toContain("N/A");
  });

  it("Quick Actions panel contains all 6 required departmental links", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    const expectedActions = [
      { name: "Manage Teachers", route: "/hod/teachers" },
      { name: "Manage Timetable", route: "/timetable/list" },
      { name: "Exception Approvals", route: "/hod/exception-approvals" },
      { name: "Department Reports", route: "/hod/reports" },
      { name: "Send Notification", route: "/hod/notifications/create" },
      { name: "Enter Marks", route: "/teacher/marks-entry" },
    ];

    for (const action of expectedActions) {
      const btn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent.includes(action.name)
      );
      expect(btn).toBeTruthy();
      act(() => {
        btn.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith(action.route);
    }
  });

  it("Today Schedule displays lecture items and Marked/Not Marked badges", async () => {
    mockApi.get.mockResolvedValueOnce({ data: sampleDashboardData });
    await renderComponent();

    expect(container.textContent).toContain("Today's Schedule");
    expect(container.textContent).toContain("Advanced Database Systems");
    expect(container.textContent).toContain("Marked");
    expect(container.textContent).toContain("Cloud Computing Architecture");
    expect(container.textContent).toContain("Not Marked");
  });

  // ============================================================
  // ITEM 1: Recent Activity distinguishable and grouped entries
  // ============================================================
  it("Recent Activity shows distinguishable entries with subject & teacher, and groups same-day actions with expandable sublist", async () => {
    const activityDashboardData = {
      ...sampleDashboardData,
      recentActivity: [
        {
          id: "single-1",
          type: "ATTENDANCE_SESSION_CLOSED",
          title: "Attendance closed",
          subjectName: "Cloud Computing",
          whoDidIt: "Dr. Sudhir Katake",
          readableText: "Attendance closed · Cloud Computing · Dr. Sudhir Katake · 3 days ago",
          timeAgo: "3 days ago",
          isGrouped: false,
        },
        {
          id: "group-1",
          type: "ATTENDANCE_SESSION_CLOSED",
          title: "3 sessions closed",
          readableText: "3 sessions closed · 6 days ago",
          timeAgo: "6 days ago",
          isGrouped: true,
          detailsList: [
            {
              id: "sub-1",
              subjectName: "ADMS Practical",
              courseName: "MSC IT",
              whoDidIt: "Dr. Sudhir Katake",
            },
            {
              id: "sub-2",
              subjectName: "Database Management Systems",
              courseName: "MSC IT",
              whoDidIt: "Dr. Sudhir Katake",
            },
            {
              id: "sub-3",
              subjectName: "Computer Networks",
              courseName: "MSC IT",
              whoDidIt: "Prof. Anil Sharma",
            },
          ],
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({ data: activityDashboardData });
    await renderComponent();

    // 1. Distinguishable entry has subject and teacher
    expect(container.textContent).toContain(
      "Attendance closed · Cloud Computing · Dr. Sudhir Katake · 3 days ago"
    );

    // 2. Grouped entry is initially collapsed
    expect(container.textContent).toContain("3 sessions closed · 6 days ago");
    expect(container.textContent).not.toContain("ADMS Practical");

    // 3. Click grouped entry to expand
    const groupedRow = container.querySelector(".hod-activity-item--grouped");
    expect(groupedRow).toBeTruthy();

    await act(async () => {
      groupedRow.click();
    });

    // Subitems should now be visible with subjects and teachers
    expect(container.textContent).toContain("ADMS Practical (MSC IT)");
    expect(container.textContent).toContain("Database Management Systems (MSC IT)");
    expect(container.textContent).toContain("Computer Networks (MSC IT)");
    expect(container.textContent).toContain("Prof. Anil Sharma");

    // 4. Click again to collapse
    await act(async () => {
      groupedRow.click();
    });
    expect(container.textContent).not.toContain("ADMS Practical");
  });

  // ============================================================
  // ITEM 2: Recent Activity schema and event types matching Reports page
  // ============================================================
  it("Recent Activity feed supports HOD-relevant events (timetables, exceptions, attendance, notices) and limits to max 6", async () => {
    const multiEventDashboardData = {
      ...sampleDashboardData,
      recentActivity: [
        {
          id: "tt-pub-1",
          type: "TIMETABLE_PUBLISHED",
          title: "Timetable published",
          readableText: "Timetable published · MSC IT Sem 4 · HOD · 2 days ago",
          timeAgo: "2 days ago",
        },
        {
          id: "ex-app-1",
          type: "EXCEPTION_APPROVED",
          title: "Exception approved",
          readableText: "Exception approved · MSC IT Sem 4 · Room 204 · 3 days ago",
          timeAgo: "3 days ago",
        },
        {
          id: "att-cls-1",
          type: "ATTENDANCE_SESSION_CLOSED",
          title: "Attendance closed",
          readableText: "Attendance closed · Cloud Computing · Dr. Sudhir Katake · 3 days ago",
          timeAgo: "3 days ago",
        },
        {
          id: "notice-1",
          type: "NOTICE_SENT",
          title: "Notice sent",
          readableText: "Notice sent · Midterm Exam Schedule · HOD · 4 days ago",
          timeAgo: "4 days ago",
        },
        {
          id: "tt-arc-1",
          type: "TIMETABLE_ARCHIVED",
          title: "Timetable archived",
          readableText: "Timetable archived · MSC IT Sem 2 · HOD · 5 days ago",
          timeAgo: "5 days ago",
        },
        {
          id: "ex-rej-1",
          type: "EXCEPTION_REJECTED",
          title: "Exception rejected",
          readableText: "Exception rejected · MSC IT Sem 4 · 6 days ago",
          timeAgo: "6 days ago",
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({ data: multiEventDashboardData });
    await renderComponent();

    expect(container.querySelectorAll(".hod-activity-item").length).toBe(6);
    expect(container.textContent).toContain("Timetable published · MSC IT Sem 4");
    expect(container.textContent).toContain("Exception approved · MSC IT Sem 4");
    expect(container.textContent).toContain("Notice sent · Midterm Exam Schedule");
    expect(container.textContent).toContain("Timetable archived · MSC IT Sem 2");
  });

  // ============================================================
  // ITEM 4: Attendance Today card N/A with last session subtext
  // ============================================================
  it("Attendance Today card shows N/A with last session info when 0 sessions today", async () => {
    const zeroTodayData = {
      ...sampleDashboardData,
      stats: {
        ...sampleDashboardData.stats,
        attendanceToday: null,
        todayClosedSessionsCount: 0,
        lastSession: {
          rate: 88,
          timeAgo: "3 days ago",
          subject: "Cloud Computing",
          teacher: "Dr. Sudhir Katake",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: zeroTodayData });
    await renderComponent();

    const attendanceCard = container.querySelector('[aria-label*="Attendance Today"]');
    expect(attendanceCard.textContent).toContain("N/A");
    expect(attendanceCard.textContent).toContain("Last session: 88% · 3 days ago");
  });

  it("Attendance Today card shows rate and count when sessions exist today", async () => {
    const sessionsTodayData = {
      ...sampleDashboardData,
      stats: {
        ...sampleDashboardData.stats,
        attendanceToday: 92,
        todayClosedSessionsCount: 3,
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: sessionsTodayData });
    await renderComponent();

    const activeCard = container.querySelector('[aria-label*="Attendance Today"]');
    expect(activeCard.textContent).toContain("92%");
    expect(activeCard.textContent).toContain("3 sessions today");
  });

  // ============================================================
  // ITEM 5: Compact Today's Schedule empty state with next lecture
  // ============================================================
  it("Today's Schedule renders compact empty state with next lecture including concrete date", async () => {
    const emptyScheduleWithNext = {
      ...sampleDashboardData,
      todaySchedule: [],
      nextLecture: {
        date: "Mon 19 Oct",
        time: "09:00",
        formattedDateTime: "Mon 19 Oct, 09:00",
        day: "Mon 19 Oct",
        subject: "Advanced Database Systems",
        teacher: "Dr. Vishal Kore",
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: emptyScheduleWithNext });
    await renderComponent();

    expect(container.textContent).toContain("No lectures scheduled today");
    expect(container.textContent).toContain(
      "Next lecture: Mon 19 Oct, 09:00 · Advanced Database Systems"
    );

    const weeklyLink = container.querySelector(".hod-schedule-compact-link");
    expect(weeklyLink).toBeTruthy();
    expect(weeklyLink.textContent).toContain("View weekly schedule");

    await act(async () => {
      weeklyLink.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/timetable/weekly-timetable");
  });

  // ============================================================
  // ITEM 6: Header refresh button re-fetches dashboard and shows spinner
  // ============================================================
  it("Header refresh button re-fetches /hod/dashboard and updates timestamp", async () => {
    mockApi.get.mockResolvedValue({ data: sampleDashboardData });
    await renderComponent();

    const refreshBtn = container.querySelector(".hod-header-refresh-btn");
    expect(refreshBtn).toBeTruthy();
    expect(refreshBtn.textContent).toContain("Refresh");

    const initialCallCount = mockApi.get.mock.calls.length;

    await act(async () => {
      refreshBtn.click();
    });

    // Should re-fetch /hod/dashboard
    expect(mockApi.get.mock.calls.length).toBe(initialCallCount + 1);
    expect(mockApi.get).toHaveBeenLastCalledWith("/hod/dashboard");
  });

  // ============================================================
  // ITEM 9: Timezone-aware greeting using Asia/Kolkata
  // ============================================================
  it("getGreetingIST evaluates greeting according to Asia/Kolkata timezone", () => {
    // 08:00 AM IST (02:30 UTC) -> Morning
    const morningDate = new Date("2026-10-12T02:30:00.000Z");
    expect(getGreetingIST(morningDate)).toBe("Good morning");

    // 01:30 PM IST (08:00 UTC) -> Afternoon
    const afternoonDate = new Date("2026-10-12T08:00:00.000Z");
    expect(getGreetingIST(afternoonDate)).toBe("Good afternoon");

    // 06:30 PM IST (13:00 UTC) -> Evening
    const eveningDate = new Date("2026-10-12T13:00:00.000Z");
    expect(getGreetingIST(eveningDate)).toBe("Good evening");
  });
});
