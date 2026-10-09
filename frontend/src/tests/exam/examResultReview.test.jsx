import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ examId: "exam-101" }),
}));

vi.mock("../../../src/api/results", () => ({
  getResultsByExam: vi.fn(),
  lockResultsForExam: vi.fn(),
  publishResultsForExam: vi.fn(),
  unlockResult: vi.fn(),
}));

vi.mock("../../components/Loading", () => ({
  default: () => <div data-testid="loading">Loading…</div>,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: ({ items = [] }) => (
    <nav data-testid="breadcrumb">
      {items.map((it, i) => (
        <span key={i}>{it.label}</span>
      ))}
    </nav>
  ),
}));

vi.mock("../../components/Pagination", () => ({
  default: ({ page, totalPages, setPage }) => (
    <div data-testid="pagination">
      <span>
        Page {page} of {totalPages}
      </span>
      <button onClick={() => setPage(page + 1)}>Next</button>
    </div>
  ),
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: ({ isOpen, title, message, onConfirm, onClose }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import ExamResultReview from "../../pages/dashboard/ExamCoordinator/ExamResultReview";
import { getResultsByExam, lockResultsForExam } from "../../api/results";

describe("ExamResultReview Component UI/UX", () => {
  let container;
  let root;

  const mockData = {
    exam: {
      _id: "exam-101",
      name: "Fall 2026 Semester Examination",
      semester: 4,
      academicYear: "2026-27",
      subjectCount: 5,
      course_id: {
        _id: "c1",
        name: "Master of Science in Information Technology",
        code: "MSCIT",
      },
    },
    summary: {
      totalStudents: 30,
      passed: 25,
      failed: 3,
      incomplete: 2,
      byStatus: {
        DRAFT: 12,
        LOCKED: 10,
        PUBLISHED: 8,
      },
    },
    results: [
      {
        _id: "r1",
        student_id: {
          _id: "st1",
          fullName: "Rohan Deshmukh",
          enrollmentNumber: "EN202601",
          rollNumber: "IT-01",
        },
        totalSubjects: 5,
        passedSubjects: 5,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "DRAFT",
      },
      {
        _id: "r2",
        student_id: {
          _id: "st2",
          fullName: "Pooja Kulkarni",
          enrollmentNumber: "EN202602",
          rollNumber: "IT-02",
        },
        totalSubjects: 5,
        passedSubjects: 3,
        failedSubjects: 2,
        incompleteSubjects: 0,
        overallResult: "FAIL",
        status: "LOCKED",
      },
    ],
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    vi.clearAllMocks();
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

  it("renders page header with exam title, metadata, and All Exams action", async () => {
    getResultsByExam.mockResolvedValueOnce(mockData);

    await act(async () => {
      root.render(<ExamResultReview />);
    });

    // 1. Page Title & Subtitle Metadata
    expect(container.textContent).toContain("Fall 2026 Semester Examination");
    expect(container.textContent).toContain("Master of Science in Information Technology");
    expect(container.textContent).toContain("MSCIT");
    expect(container.textContent).toContain("Semester 4");
    expect(container.textContent).toContain("2026-27");
    expect(container.textContent).toContain("30 Students");

    // 2. Navigation Actions: Breadcrumb and All Exams
    expect(container.textContent).toContain("Results Dashboard");
    expect(container.textContent).toContain("All Exams");

    // Verify button clicks navigate to appropriate routes
    const buttons = Array.from(container.querySelectorAll(".btn-edx-outline"));
    const examsBtn = buttons.find((b) => b.textContent.includes("All Exams"));
    expect(examsBtn).not.toBeUndefined();

    act(() => {
      examsBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/exam");
  });

  it("renders the 3 overview summary metrics cards with correct labels and authoritative values", async () => {
    getResultsByExam.mockResolvedValueOnce(mockData);

    await act(async () => {
      root.render(<ExamResultReview />);
    });

    const infoGrid = container.querySelector(".info-grid");
    expect(infoGrid).not.toBeNull();

    // 1. Passed
    expect(infoGrid.textContent).toContain("Passed");
    expect(infoGrid.textContent).toContain("25");
    expect(infoGrid.textContent).toContain("83% pass rate");

    // 2. Failed
    expect(infoGrid.textContent).toContain("Failed");
    expect(infoGrid.textContent).toContain("3");
    expect(infoGrid.textContent).toContain("Requires backlog attempt");

    // 3. Incomplete
    expect(infoGrid.textContent).toContain("Incomplete");
    expect(infoGrid.textContent).toContain("2");
    expect(infoGrid.textContent).toContain("Pending / unentered marks");
  });

  it("renders the lifecycle status panel with compact status indicators and Lock Draft button", async () => {
    getResultsByExam.mockResolvedValueOnce(mockData);

    await act(async () => {
      root.render(<ExamResultReview />);
    });

    const lifecycleBar = container.querySelector(".lifecycle-bar");
    expect(lifecycleBar).not.toBeNull();

    // Status counts
    expect(lifecycleBar.textContent).toContain("Result Status");
    expect(lifecycleBar.textContent).toContain("Draft:12");
    expect(lifecycleBar.textContent).toContain("Locked:10");
    expect(lifecycleBar.textContent).toContain("Published:8");
    expect(lifecycleBar.textContent).toContain("Total:30");

    // Lock Draft Action button is rendered when Draft records exist
    const lockBtn = lifecycleBar.querySelector(".btn-edx-primary");
    expect(lockBtn).not.toBeNull();
    expect(lockBtn.textContent).toContain("Lock Draft (12)");

    // Clicking Lock Draft opens confirmation modal
    act(() => {
      lockBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("Lock All Draft Results");
  });

  it("renders search, filters toolbar, and filters student table rows correctly", async () => {
    getResultsByExam.mockResolvedValueOnce(mockData);

    await act(async () => {
      root.render(<ExamResultReview />);
    });

    const filterRow = container.querySelector(".filter-row");
    expect(filterRow).not.toBeNull();

    const searchInput = filterRow.querySelector(".search-box input");
    expect(searchInput).not.toBeNull();

    // Filter by student name using native value setter for React 18
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      nativeSetter.call(searchInput, "Rohan");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.textContent).toContain("Rohan Deshmukh");
    expect(container.textContent).not.toContain("Pooja Kulkarni");
  });

  it("renders student results table with all required columns, chips, and View Sheet action", async () => {
    getResultsByExam.mockResolvedValueOnce(mockData);

    await act(async () => {
      root.render(<ExamResultReview />);
    });

    const table = container.querySelector(".er-table");
    expect(table).not.toBeNull();

    // Headers
    const headers = Array.from(table.querySelectorAll("th")).map((th) => th.textContent.trim());
    expect(headers).toEqual([
      "Student Name",
      "Roll / Enrollment",
      "Papers",
      "Academic Outcome",
      "Lifecycle Status",
      "Actions",
    ]);

    // Rows
    expect(container.textContent).toContain("Rohan Deshmukh");
    expect(container.textContent).toContain("EN202601");
    expect(container.textContent).toContain("PASS");
    expect(container.textContent).toContain("DRAFT");

    // View Sheet button
    const viewButtons = container.querySelectorAll(".btn-sheet-view");
    expect(viewButtons.length).toBe(2);

    act(() => {
      viewButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/exam/results/r1");
  });
});
