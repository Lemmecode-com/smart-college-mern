import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SuperAdminDashboard from "../../pages/dashboard/Super-Admin/SuperAdminDashboard";
import { toast } from "react-toastify";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <div data-testid="breadcrumb" />,
}));

vi.mock("../../components/Loading", () => ({
  default: ({ message }) => <div data-testid="loading">{message}</div>,
}));

vi.mock("../../components/ApiError", () => ({
  default: ({ message, onRetry }) => (
    <div data-testid="api-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe("SuperAdminDashboard (#580) - Toast import and error handling", () => {
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
      if (root) {
        root.unmount();
      }
    });
    if (container) {
      container.remove();
    }
  });

  it("calls toast.error without ReferenceError when fetch encounters a 500 server error", async () => {
    const errorResponse = {
      response: {
        status: 500,
        data: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        },
      },
    };
    api.get.mockRejectedValueOnce(errorResponse);

    await act(async () => {
      root.render(<SuperAdminDashboard />);
    });

    // Check toast.error was invoked with the backend message
    expect(toast.error).toHaveBeenCalledWith("Database connection failed");

    // Check component stayed mounted and rendered ApiError
    const apiError = container.querySelector('[data-testid="api-error"]');
    expect(apiError).not.toBeNull();
    expect(apiError.textContent).toContain("Database connection failed");
  });

  it("does not call toast.error for 401 auth errors", async () => {
    const authError = {
      response: {
        status: 401,
        data: {
          code: "TOKEN_EXPIRED",
          message: "Session expired",
        },
      },
    };
    api.get.mockRejectedValueOnce(authError);

    await act(async () => {
      root.render(<SuperAdminDashboard />);
    });

    // For auth errors, toast.error should NOT be triggered
    expect(toast.error).not.toHaveBeenCalled();
    const apiError = container.querySelector('[data-testid="api-error"]');
    expect(apiError).not.toBeNull();
  });

  it("renders dashboard successfully when API returns valid data", async () => {
    const mockData = {
      stats: {
        totalColleges: 10,
        activeColleges: 8,
        totalUsers: 1500,
        activeUsers: 1200,
      },
      colleges: [],
    };
    api.get.mockResolvedValueOnce({ data: mockData });

    await act(async () => {
      root.render(<SuperAdminDashboard />);
    });

    expect(toast.error).not.toHaveBeenCalled();
    const loading = container.querySelector('[data-testid="loading"]');
    expect(loading).toBeNull();
  });

  it("renders enquiries stat card and recent enquiries widget (#584)", async () => {
    const mockData = {
      stats: {
        totalColleges: 5,
        totalStudents: 100,
        totalTeachers: 20,
        totalInquiries: 12,
        newInquiries: 3,
      },
      colleges: [],
      recentInquiries: [
        {
          _id: "inq1",
          inquiryNumber: "ENQ-202611-0001",
          institutionName: "MIT Pune",
          firstName: "John",
          lastName: "Doe",
          email: "john@mit.edu",
          role: "principal",
          status: "NEW",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    api.get.mockResolvedValueOnce({ data: mockData });

    await act(async () => {
      root.render(<SuperAdminDashboard />);
    });

    expect(container.textContent).toContain("College Enquiries");
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("3 New");
    expect(container.textContent).toContain("Recent Enquiries (1)");
    expect(container.textContent).toContain("ENQ-202611-0001");
    expect(container.textContent).toContain("MIT Pune");
  });
});
