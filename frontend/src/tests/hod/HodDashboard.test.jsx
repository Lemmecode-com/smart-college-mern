import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HodDashboard from "../../pages/dashboard/HOD/HodDashboard";
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
    div: ({ children, className, style, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      return (
        <div className={className} style={style} {...cleanProps}>
          {children}
        </div>
      );
    },
    button: ({ children, className, style, onClick, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
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

describe("HodDashboard Quick Actions Panel", () => {
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

  const renderComponent = async (user = { name: "Dr. Turing" }) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user }}>
          <HodDashboard />
        </AuthContext.Provider>
      );
    });
  };

  it("renders Quick Actions panel on HodDashboard and navigates to correct routes", async () => {
    const mockDashboardData = {
      stats: {
        teachers: 12,
        timetables: 6,
      },
      department: {
        id: "dept-1",
        name: "Computer Science and Engineering",
        code: "CSE",
      },
      hod: {
        name: "Dr. Turing",
      },
      recentTimetables: [
        {
          _id: "tt-1",
          name: "CS Third Year A",
          semester: 5,
          academicYear: "2026-27",
          status: "PUBLISHED",
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({ data: mockDashboardData });

    await renderComponent();

    // 1. Confirm Quick Actions header is present
    expect(container.textContent).toContain("Quick Actions");

    // 2. View Department
    const deptBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("View Department")
    );
    expect(deptBtn).toBeTruthy();
    act(() => {
      deptBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/department");

    // 3. Manage Teachers
    const teachersBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Manage Teachers")
    );
    expect(teachersBtn).toBeTruthy();
    act(() => {
      teachersBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/teachers");

    // 4. Manage Timetable
    const timetableBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Manage Timetable")
    );
    expect(timetableBtn).toBeTruthy();
    act(() => {
      timetableBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/timetable/list");

    // 5. Exception Approvals
    const exceptionsBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Exception Approvals")
    );
    expect(exceptionsBtn).toBeTruthy();
    act(() => {
      exceptionsBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/exception-approvals");
  });
});
