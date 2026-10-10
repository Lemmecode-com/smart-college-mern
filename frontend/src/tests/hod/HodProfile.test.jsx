import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HodProfile from "../../pages/dashboard/HOD/HodProfile";

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

describe("HodProfile UI/UX Redesign", () => {
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

  const renderComponent = async () => {
    await act(async () => {
      root.render(<HodProfile />);
    });
  };

  it("renders profile header and details with valid API data", async () => {
    const mockProfileData = {
      teacher: {
        id: "teach-101",
        name: "Dr. Alan Turing",
        employeeId: "CSE-HOD-01",
        email: "alan.turing@smartcollege.edu",
        phone: "+91 9876543210",
        status: "ACTIVE",
        dateOfJoining: "2020-07-15T00:00:00.000Z",
        qualification: "Ph.D. in Computer Science",
        specialization: "Theoretical Computing & Cryptography",
        address: "42 Turing Way",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        department: {
          id: "dept-1",
          name: "Computer Science and Engineering",
          code: "CSE",
          type: "ACADEMIC",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: { data: mockProfileData } });

    await renderComponent();

    // 1. Profile Header
    expect(container.textContent).toContain("Dr. Alan Turing");
    expect(container.textContent).toContain("Head of Department");
    expect(container.textContent).toContain("Computer Science and Engineering");
    expect(container.textContent).toContain("CSE");
    expect(container.textContent).toContain("CSE-HOD-01");
    expect(container.textContent).toContain("alan.turing@smartcollege.edu");
    expect(container.textContent).toContain("Active");

    // 2. Department Information section
    expect(container.textContent).toContain("Department Information");
    expect(container.textContent).toContain("Academic Department");

    // 3. Professional Information section
    expect(container.textContent).toContain("Professional Information");
    expect(container.textContent).toContain("Ph.D. in Computer Science");
    expect(container.textContent).toContain("+91 9876543210");
    expect(container.textContent).toContain("Theoretical Computing & Cryptography");
    expect(container.textContent).toContain("42 Turing Way, Pune, Maharashtra, 411001");
  });

  it("gracefully handles missing or null optional fields without wall of 'Not available'", async () => {
    // Backend profile where optional fields are omitted or null
    const mockProfileData = {
      teacher: {
        id: "teach-102",
        name: "Prof. Grace Hopper",
        employeeId: "IT-HOD-02",
        email: "grace.hopper@smartcollege.edu",
        status: "ACTIVE",
        phone: null,
        dateOfJoining: null,
        qualification: null,
        specialization: null,
        address: null,
        department: {
          id: "dept-2",
          name: "Information Technology",
          code: "IT",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: mockProfileData });

    await renderComponent();

    expect(container.textContent).toContain("Prof. Grace Hopper");
    expect(container.textContent).toContain("IT-HOD-02");
    expect(container.textContent).toContain("Information Technology");

    // Should display graceful empty state for professional info
    expect(container.textContent).toContain("No additional professional details on record.");

    // Should NOT have repeated prominent "Not available" texts
    expect(container.textContent).not.toContain("Not available");
    expect(container.textContent).not.toContain("Not specified");
    expect(container.textContent).not.toContain("No phone");
  });

  it("gracefully handles missing or unpopulated department data", async () => {
    const mockProfileData = {
      teacher: {
        id: "teach-103",
        name: "Dr. Claude Shannon",
        employeeId: "ECE-HOD-03",
        email: "claude.shannon@smartcollege.edu",
        status: "ACTIVE",
        department: null, // missing department
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: { teacher: mockProfileData.teacher } });

    await renderComponent();

    expect(container.textContent).toContain("Dr. Claude Shannon");
    expect(container.textContent).toContain("Department");
    // Fallback em dash in department info
    expect(container.textContent).toContain("—");
  });

  it("displays Inactive status pill correctly", async () => {
    const mockProfileData = {
      teacher: {
        id: "teach-104",
        name: "Prof. Ada Lovelace",
        employeeId: "MATH-HOD-04",
        email: "ada.lovelace@smartcollege.edu",
        status: "INACTIVE",
        department: {
          name: "Mathematics",
          code: "MATH",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: { teacher: mockProfileData.teacher } });

    await renderComponent();

    expect(container.textContent).toContain("Inactive");
  });

  it("navigates back to dashboard and confirms Quick Actions panel is removed from profile", async () => {
    const mockProfileData = {
      teacher: {
        id: "teach-105",
        name: "Dr. Katherine Johnson",
        employeeId: "AERO-HOD-05",
        email: "katherine.j@smartcollege.edu",
        status: "ACTIVE",
        department: {
          name: "Aerospace Engineering",
          code: "AERO",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: { teacher: mockProfileData.teacher } });

    await renderComponent();

    // 1. Back to Dashboard button
    const backBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Back to Dashboard")
    );
    expect(backBtn).toBeTruthy();
    act(() => {
      backBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/hod/dashboard");

    // 2. Quick Actions panel should NOT be on HodProfile
    expect(container.textContent).not.toContain("Quick Actions");
    expect(container.textContent).not.toContain("Exception Approvals");
  });

  it("does not render duplicate overview cards or redundant bottom navigation card", async () => {
    const mockProfileData = {
      teacher: {
        id: "teach-106",
        name: "Dr. John von Neumann",
        employeeId: "CS-HOD-06",
        email: "john.neumann@smartcollege.edu",
        status: "ACTIVE",
        department: {
          name: "Computer Science",
          code: "CS",
        },
      },
    };

    mockApi.get.mockResolvedValueOnce({ data: { teacher: mockProfileData.teacher } });

    await renderComponent();

    // Redundant overview card subheaders should not exist
    expect(container.textContent).not.toContain("Official ID");
    expect(container.textContent).not.toContain("Academic focus");

    // Standalone "Need to go back?" card should be completely removed
    expect(container.textContent).not.toContain("Need to go back?");
  });
});
