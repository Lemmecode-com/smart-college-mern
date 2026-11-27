import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ViewCollegeDetails from "../../pages/dashboard/Super-Admin/ViewCollegeDetails";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "college_test_123" }),
  useNavigate: () => mockNavigate,
  Navigate: ({ to }) => <div data-testid="navigate-mock">{to}</div>,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
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
  default: ({ message, onRetry, onGoBack }) => (
    <div data-testid="api-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onGoBack}>Go Back</button>
    </div>
  ),
}));

describe("ViewCollegeDetails Page", () => {
  let container;
  let root;

  const mockCollegeData = {
    id: "college_test_123",
    name: "Apex Engineering Institute",
    code: "AEI-2024",
    email: "admin@apex.edu",
    contactNumber: "+91 9876543210",
    address: "42 Knowledge City, Pune, Maharashtra",
    establishedYear: 1985,
    logoUrl: null,
    registrationUrl: "https://example.com/register/college_test_123",
    adminEmail: "principal@apex.edu",
  };

  const mockStatsData = {
    totalDepartments: 6,
    totalCourses: 14,
    totalTeachers: 38,
    totalStudents: 950,
    approvedStudents: 890,
    totalTimetables: 18,
    totalAttendanceSessions: 420,
  };

  const authContextValue = {
    user: {
      id: "super_admin_1",
      role: "SUPER_ADMIN",
      name: "Master Admin",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    act(() => {
      if (root) root.unmount();
    });
    if (container) container.remove();
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={authContextValue}>
          <ViewCollegeDetails />
        </AuthContext.Provider>
      );
    });
  };

  it("fetches and renders college header band with name, code chip, and single Est. year", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    // Verify Breadcrumb rendered
    const breadcrumb = container.querySelector('[data-testid="breadcrumb"]');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb.textContent).toContain("Dashboard");
    expect(breadcrumb.textContent).toContain("Colleges");
    expect(breadcrumb.textContent).toContain("Apex Engineering Institute");

    // Header band verification
    expect(container.textContent).toContain("Apex Engineering Institute");
    expect(container.textContent).toContain("CODE: AEI-2024");
    expect(container.textContent).toContain("Est. 1985");
    expect(container.textContent).toContain("Back to Colleges");

    // Decision #1 check: NO status pill in header
    const headerBand = container.querySelector(".sa-college-header-band");
    expect(headerBand).not.toBeNull();
    expect(headerBand.textContent).not.toMatch(/\b(active|inactive)\b/i);
    expect(container.querySelector(".sa-status-pill, .badge-active, .badge-inactive")).toBeNull();
  });

  it("renders College Information with email, phone, and address, but duplicate Est. tile is removed", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    const infoSection = container.querySelector('section[aria-labelledby="section-college-info"]');
    expect(infoSection).not.toBeNull();
    expect(infoSection.textContent).toContain("admin@apex.edu");
    expect(infoSection.textContent).toContain("+91 9876543210");
    expect(infoSection.textContent).toContain("42 Knowledge City, Pune, Maharashtra");

    // Decision #7 check: Established year appears in header, NOT as a tile in College Information
    expect(infoSection.textContent).not.toContain("Established Year");
    expect(infoSection.textContent).not.toContain("Year of inception");
  });

  it("renders all 6 Statistics cards with correct labels and numbers", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    const statsSection = container.querySelector('section[aria-labelledby="section-college-stats"]');
    expect(statsSection).not.toBeNull();

    expect(statsSection.textContent).toContain("Departments");
    expect(statsSection.textContent).toContain("6");
    expect(statsSection.textContent).toContain("Courses");
    expect(statsSection.textContent).toContain("14");
    expect(statsSection.textContent).toContain("Teachers");
    expect(statsSection.textContent).toContain("38");
    expect(statsSection.textContent).toContain("Total Students");
    expect(statsSection.textContent).toContain("950");
    expect(statsSection.textContent).toContain("Approved Students");
    expect(statsSection.textContent).toContain("890");
    expect(statsSection.textContent).toContain("Active Timetables");
    expect(statsSection.textContent).toContain("18");

    // Decision #4 & #5 check: non-interactive and no attendance sessions
    expect(statsSection.textContent).not.toContain("Attendance Sessions");
  });

  it("renders friendly captions when statistics values are zero", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: {
          totalDepartments: 0,
          totalCourses: 0,
          totalTeachers: 0,
          totalStudents: 0,
          approvedStudents: 0,
          totalTimetables: 0,
        },
      },
    });

    await renderComponent();

    const statsSection = container.querySelector('section[aria-labelledby="section-college-stats"]');
    expect(statsSection.textContent).toContain("No departments added yet");
    expect(statsSection.textContent).toContain("No courses added yet");
    expect(statsSection.textContent).toContain("No teachers added yet");
    expect(statsSection.textContent).toContain("No students registered yet");
    expect(statsSection.textContent).toContain("No approved students yet");
    expect(statsSection.textContent).toContain("No active timetables yet");
  });

  it("renders Registration Portal with copy and open link buttons, and admin email panel", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    const regSection = container.querySelector('section[aria-labelledby="section-reg-portal"]');
    expect(regSection).not.toBeNull();
    expect(regSection.textContent).toContain("College Registration Link");
    expect(regSection.textContent).toContain("Copy Registration Link");
    expect(regSection.textContent).toContain("Open Link");
    expect(regSection.textContent).toContain("College Administrator");
    expect(regSection.textContent).toContain("principal@apex.edu");
    expect(regSection.textContent).toContain("Send Email to College Admin");
  });

  it("handles copy actions correctly for code, email, phone, and registration link", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    // Copy Code
    const codeBtn = container.querySelector(".sa-code-chip");
    expect(codeBtn).not.toBeNull();
    await act(async () => {
      codeBtn.click();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("AEI-2024");

    // Copy Link
    const copyLinkBtn = container.querySelector(".sa-reg-panel .sa-btn-primary");
    expect(copyLinkBtn).not.toBeNull();
    await act(async () => {
      copyLinkBtn.click();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("college_test_123")
    );
  });

  it("navigates back when 'Back to Colleges' is clicked", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    await renderComponent();

    const backBtn = container.querySelector(".sa-btn-header-back");
    expect(backBtn).not.toBeNull();
    await act(async () => {
      backBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("opens Send Email modal, pre-fills subject, and submits to API", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        college: mockCollegeData,
        stats: mockStatsData,
      },
    });

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Email dispatched successfully!",
      },
    });

    await renderComponent();

    // Click "Send Email to College Admin" button
    const openModalBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Send Email to College Admin")
    );
    expect(openModalBtn).toBeDefined();

    await act(async () => {
      openModalBtn.click();
    });

    // Verify modal is open
    expect(container.textContent).toContain("Send Email to College Admin");
    const subjectInput = container.querySelector("#sa-email-subject");
    const messageInput = container.querySelector("#sa-email-message");
    expect(subjectInput).not.toBeNull();
    expect(subjectInput.value).toBe("Regarding Apex Engineering Institute - Smart College Management");

    // Type a message
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      ).set;
      nativeSetter.call(messageInput, "Hello, please review your college setup.");
      messageInput.dispatchEvent(new Event("input", { bubbles: true }));
      messageInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Submit form
    const form = container.querySelector(".sa-modal-card form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(api.post).toHaveBeenCalledWith(
      "/master/college_test_123/send-email",
      expect.objectContaining({
        collegeId: "college_test_123",
        subject: "Regarding Apex Engineering Institute - Smart College Management",
        message: "Hello, please review your college setup.",
      })
    );
  });

  it("renders ApiError when college fetch fails", async () => {
    api.get.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: "Internal server error" },
      },
    });

    await renderComponent();

    const apiError = container.querySelector('[data-testid="api-error"]');
    expect(apiError).not.toBeNull();
    expect(apiError.textContent).toContain("Internal server error");
  });
});
