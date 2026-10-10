import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import HodTeachers from "../../pages/dashboard/HOD/HodTeachers";

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

describe("HodTeachers UI/UX Redesign", () => {
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
      root.render(<HodTeachers />);
    });
  };

  const sampleTeachers = [
    {
      _id: "t1",
      name: "Dr. Ada Lovelace",
      employeeId: "CS-001",
      email: "ada@college.edu",
      phone: "+91 9876543210",
      specialization: "Algorithms",
      status: "ACTIVE",
    },
    {
      _id: "t2",
      name: "Prof. Alan Turing",
      employeeId: "CS-002",
      email: "alan@college.edu",
      phone: "+91 9876543211",
      specialization: "Cryptography",
      status: "ACTIVE",
    },
    {
      _id: "t3",
      name: "Dr. Claude Shannon",
      employeeId: "EE-003",
      email: "shannon@college.edu",
      status: "INACTIVE",
    },
  ];

  it("renders teacher cards with valid API data", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: sampleTeachers } },
    });

    await renderComponent();

    // Page title and count badge
    expect(container.textContent).toContain("Department Teachers");
    expect(container.textContent).toContain("3 teachers");

    // Teacher card content
    expect(container.textContent).toContain("Dr. Ada Lovelace");
    expect(container.textContent).toContain("CS-001");
    expect(container.textContent).toContain("ada@college.edu");
    expect(container.textContent).toContain("+91 9876543210");
    expect(container.textContent).toContain("Algorithms");
    expect(container.textContent).toContain("Active");

    expect(container.textContent).toContain("Prof. Alan Turing");
    expect(container.textContent).toContain("CS-002");
    expect(container.textContent).toContain("alan@college.edu");

    expect(container.textContent).toContain("Dr. Claude Shannon");
    expect(container.textContent).toContain("EE-003");
    expect(container.textContent).toContain("shannon@college.edu");
    expect(container.textContent).toContain("Inactive");
  });

  function setInputValue(input, val) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeSetter.call(input, val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("searches case-insensitively by name, email, and employee ID", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: sampleTeachers } },
    });

    await renderComponent();

    const searchInput = container.querySelector("input[type='text']");
    expect(searchInput).toBeTruthy();

    // 1. Search by name (lowercase)
    await act(async () => {
      setInputValue(searchInput, "ada");
    });

    expect(container.textContent).toContain("Dr. Ada Lovelace");
    expect(container.textContent).not.toContain("Prof. Alan Turing");
    expect(container.textContent).not.toContain("Dr. Claude Shannon");
    expect(container.textContent).toContain("Showing 1 of 3 teachers");

    // 2. Search by employee ID
    await act(async () => {
      setInputValue(searchInput, "CS-002");
    });

    expect(container.textContent).toContain("Prof. Alan Turing");
    expect(container.textContent).not.toContain("Dr. Ada Lovelace");

    // 3. Search by email
    await act(async () => {
      setInputValue(searchInput, "shannon@");
    });

    expect(container.textContent).toContain("Dr. Claude Shannon");
    expect(container.textContent).not.toContain("Prof. Alan Turing");
  });

  it("clears search query and restores full list via clear button", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: sampleTeachers } },
    });

    await renderComponent();

    const searchInput = container.querySelector("input[type='text']");

    await act(async () => {
      setInputValue(searchInput, "ada");
    });

    expect(container.textContent).toContain("Showing 1 of 3 teachers");

    // Clear button with aria-label="Clear search"
    const clearBtn = container.querySelector("button[aria-label='Clear search']");
    expect(clearBtn).toBeTruthy();

    await act(async () => {
      clearBtn.click();
    });

    expect(container.textContent).toContain("Total: 3 teachers");
    expect(container.textContent).toContain("Dr. Ada Lovelace");
    expect(container.textContent).toContain("Prof. Alan Turing");
    expect(container.textContent).toContain("Dr. Claude Shannon");
  });

  it("displays empty state when department has 0 teachers", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: [] } },
    });

    await renderComponent();

    expect(container.textContent).toContain("0 teachers");
    expect(container.textContent).toContain("No teachers assigned");
    expect(container.textContent).toContain("There are currently no teachers assigned to this department.");
  });

  it("displays no search results state when search does not match", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: sampleTeachers } },
    });

    await renderComponent();

    const searchInput = container.querySelector("input[type='text']");

    await act(async () => {
      setInputValue(searchInput, "NonExistentName123");
    });

    expect(container.textContent).toContain("No teachers match your search");
    expect(container.textContent).toContain("No results found for \"NonExistentName123\"");

    const clearResultsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Clear Search")
    );
    expect(clearResultsBtn).toBeTruthy();

    await act(async () => {
      clearResultsBtn.click();
    });

    expect(container.textContent).toContain("Total: 3 teachers");
    expect(container.textContent).toContain("Dr. Ada Lovelace");
  });

  it("omits missing optional fields gracefully without 'Not available' placeholders", async () => {
    const minimalTeacher = [
      {
        _id: "t4",
        name: "Minimal Teacher",
        employeeId: "MIN-001",
        email: "min@college.edu",
        // phone, specialization, qualification omitted
      },
    ];

    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: minimalTeacher } },
    });

    await renderComponent();

    expect(container.textContent).toContain("Minimal Teacher");
    expect(container.textContent).toContain("MIN-001");
    expect(container.textContent).toContain("min@college.edu");
    expect(container.textContent).not.toContain("Not available");
    expect(container.textContent).not.toContain("Not specified");
    expect(container.textContent).not.toContain("No phone");
  });

  it("navigates back to dashboard when Back to Dashboard button is clicked", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { teachers: sampleTeachers } },
    });

    await renderComponent();

    const backBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Back to Dashboard")
    );
    expect(backBtn).toBeTruthy();

    act(() => {
      backBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/hod/dashboard");
  });

  it("renders API error state when fetch fails", async () => {
    mockApi.get.mockRejectedValueOnce({
      response: { status: 500, data: { message: "Server error occurred" } },
    });

    await renderComponent();

    expect(container.querySelector("[data-testid='api-error']")).toBeTruthy();
    expect(container.textContent).toContain("Server error occurred");
  });
});
