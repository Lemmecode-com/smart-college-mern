import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const changeInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Navigate: ({ to }) => <div data-testid="navigate-mock">{to}</div>,
}));

vi.mock("../../../src/api/exam", () => ({
  getExams: vi.fn(),
}));

vi.mock("../../../src/api/marks", () => ({
  getStudentRoster: vi.fn(),
  saveMarks: vi.fn(),
}));

vi.mock("../../../src/components/Loading", () => ({
  default: () => <div data-testid="loading">Loading…</div>,
}));

vi.mock("../../../src/components/Breadcrumb", () => ({
  default: ({ items = [] }) => (
    <nav data-testid="breadcrumb">
      {items.map((it, i) => (
        <span key={i} data-path={it.path}>
          {it.label}
        </span>
      ))}
    </nav>
  ),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import MarksEntry from "../../pages/dashboard/Teacher/MarksEntry";
import { AuthContext } from "../../auth/AuthContext";
import { getExams } from "../../api/exam";
import { getStudentRoster, saveMarks } from "../../api/marks";

describe("MarksEntry — Duplicate Submission Prevention & Button States", () => {
  let container;
  let root;

  const mockExams = [
    {
      _id: "exam-001",
      name: "Midterm Exam 2026",
      status: "PUBLISHED",
      academicYear: "2025-2026",
      semester: 1,
      course_id: { _id: "c1", name: "Computer Engineering" },
      subjects: [
        {
          subject: { _id: "sub-001", name: "Data Structures" },
          subjectType: "THEORY",
          internalMaxMarks: 20,
          externalMaxMarks: 80,
        },
      ],
    },
  ];

  const mockRoster = {
    examId: "exam-001",
    subjectId: "sub-001",
    subjectType: "THEORY",
    internalMaxMarks: 20,
    externalMaxMarks: 80,
    totalStudents: 2,
    markedCount: 0,
    roster: [
      {
        studentId: "stud-01",
        fullName: "Alice Smith",
        enrollmentNumber: "EN001",
        marks: { internalMarks: 15, externalMarks: 65 },
        calculation: { totalMarks: 80, status: "PASS" },
      },
      {
        studentId: "stud-02",
        fullName: "Bob Jones",
        enrollmentNumber: "EN002",
        marks: { internalMarks: null, externalMarks: null },
        calculation: { totalMarks: null, status: null },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    getExams.mockResolvedValue(mockExams);
    getStudentRoster.mockResolvedValue({ data: mockRoster });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  const renderComponent = async (userRole = "TEACHER") => {
    const user = {
      id: "u-123",
      name: "Test User",
      role: userRole,
    };

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user }}>
          <MarksEntry />
        </AuthContext.Provider>,
      );
    });

    // Wait for initial exam fetch
    await act(async () => {
      await Promise.resolve();
    });

    // Select exam
    const examSelect = container.querySelectorAll("select")[0];
    await act(async () => {
      examSelect.value = "exam-001";
      examSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Select subject
    const subjectSelect = container.querySelectorAll("select")[1];
    await act(async () => {
      subjectSelect.value = "sub-001";
      subjectSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Wait for roster load
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("immediately disables button and shows loading state during save", async () => {
    let resolveSave;
    saveMarks.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    await renderComponent("TEACHER");

    const saveButton = container.querySelector(".btn-me-primary");
    expect(saveButton).toBeTruthy();
    expect(saveButton.textContent).toContain("Save Marks");
    expect(saveButton.disabled).toBe(false);

    // Trigger save
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Button should now be disabled and show Saving...
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toContain("Saving...");

    // Resolve the promise
    await act(async () => {
      resolveSave({ success: true });
      await Promise.resolve();
    });

    // After resolution, button shows success state and remains disabled
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toContain("Marks Saved");
  });

  it("prevents duplicate submissions when clicked multiple times rapidly", async () => {
    let resolveSave;
    saveMarks.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    await renderComponent("TEACHER");

    const saveButton = container.querySelector(".btn-me-primary");

    // Click 3 times rapidly
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // saveMarks should only have been called ONCE
    expect(saveMarks).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave({ success: true });
      await Promise.resolve();
    });
  });

  it("re-enables the button when a mark input is modified after successful save", async () => {
    saveMarks.mockResolvedValue({ success: true });

    await renderComponent("TEACHER");

    const saveButton = container.querySelector(".btn-me-primary");

    // Initial save
    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Check success state
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toContain("Marks Saved");

    // Edit an input
    const inputs = container.querySelectorAll("input.form-input");
    expect(inputs.length).toBeGreaterThan(0);

    await act(async () => {
      changeInputValue(inputs[0], "18");
    });

    // Button should become available again
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toContain("Save Marks");
  });

  it("re-enables the button on API save error so user can retry", async () => {
    saveMarks.mockRejectedValue({
      response: { data: { message: "Network error saving marks" } },
    });

    await renderComponent("TEACHER");

    const saveButton = container.querySelector(".btn-me-primary");

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // On error, button is re-enabled for retry
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.textContent).toContain("Save Marks");

    // Error alert is visible
    const alertDanger = container.querySelector(".alert-me-danger");
    expect(alertDanger).toBeTruthy();
    expect(alertDanger.textContent).toContain("Network error saving marks");
  });

  it("renders HOD Dashboard breadcrumb and back navigation for HOD role", async () => {
    await renderComponent("HOD");

    const breadcrumb = container.querySelector("[data-testid='breadcrumb']");
    expect(breadcrumb.textContent).toContain("HOD Dashboard");

    const backButton = container.querySelector(".btn-me-outline");
    await act(async () => {
      backButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("/hod/dashboard");
  });
});
