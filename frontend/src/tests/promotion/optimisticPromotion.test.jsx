import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toast } from "react-toastify";
import { AuthContext } from "../../auth/AuthContext";
import StudentPromotion from "../../pages/dashboard/College-Admin/StudentPromotion";
import * as promotionApi from "../../api/promotion";
import * as alumniApi from "../../api/alumni";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.React = React;

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  Navigate: () => null,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <div data-testid="breadcrumb" />,
}));

vi.mock("../../components/PageHeader", () => ({
  default: ({ title }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock("../../components/Loading", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        return ({ children, className, style, onClick, ...props }) => {
          const cleanProps = { ...props };
          delete cleanProps.whileHover;
          delete cleanProps.whileTap;
          delete cleanProps.initial;
          delete cleanProps.animate;
          delete cleanProps.exit;
          delete cleanProps.transition;
          const Tag = typeof prop === "string" ? prop : "div";
          return React.createElement(
            Tag,
            { className, style, onClick, ...cleanProps },
            children
          );
        };
      },
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../../api/promotion", () => ({
  getPromotionEligibleStudents: vi.fn(),
  bulkPromoteStudents: vi.fn(),
  getCollegePromotionHistory: vi.fn(),
  getPromotionEligibility: vi.fn(),
  getStudentBacklogs: vi.fn(),
  getBacklogAttempts: vi.fn(),
  evaluateBacklogAttempt: vi.fn(),
  executePromotionDecision: vi.fn(),
}));

vi.mock("../../api/alumni", () => ({
  moveToAlumni: vi.fn(),
  getAlumniEligibility: vi.fn(),
}));

describe("StudentPromotion — Optimistic UI for Sem-to-Sem Promotion", () => {
  let container;
  let root;

  const mockUser = {
    id: "admin-1",
    _id: "admin-1",
    name: "College Administrator",
    role: "COLLEGE_ADMIN",
    college_id: "college-123",
  };

  const mockStudent = {
    _id: "student-1",
    fullName: "Jagan Kokare",
    email: "jagan@gmail.com",
    currentSemester: 3,
    currentYear: 2,
    currentAcademicYear: "2024-2025",
    academicYearLabel: "2nd Year",
    status: "ENROLLED",
    course_id: {
      _id: "course-be",
      name: "Bachelor of Engineering (B.E.)",
      durationSemesters: 8,
    },
    fee: {
      totalFee: 50000,
      paidAmount: 50000,
    },
    feeStatus: "FULLY_PAID",
    isFinalYear: false,
    isAlumniEligible: false,
  };

  const mockEligibilityDecision = {
    _id: "decision-jagan-1",
    college_id: "college-123",
    student_id: "student-1",
    course_id: "course-be",
    semester: 3,
    academicYear: "2024-2025",
    promotion_outcome: "PASS",
    workflow_status: "RECOMMENDED",
    kt_count: 0,
    failed_subject_count: 0,
    policy_snapshot: {
      minAttendancePercentage: 75,
      maxAllowedKTs: 2,
      minimumFeePaidPercentage: 50,
      previousYearClearanceRequired: false,
    },
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    vi.clearAllMocks();

    promotionApi.getPromotionEligibleStudents.mockResolvedValue({ students: [mockStudent] });
    promotionApi.getPromotionEligibility.mockResolvedValue(mockEligibilityDecision);
    promotionApi.getStudentBacklogs.mockResolvedValue([]);
    promotionApi.getCollegePromotionHistory.mockResolvedValue([]);
    alumniApi.getAlumniEligibility.mockResolvedValue(null);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  const renderComponent = async () => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
          <StudentPromotion />
        </AuthContext.Provider>
      );
    });
  };

  it("1. Success: Closes modal and updates table row immediately on Confirm, sends API with idempotency key, and does not refetch full table", async () => {
    let resolveExecute;
    const executePromise = new Promise((resolve) => {
      resolveExecute = resolve;
    });
    promotionApi.executePromotionDecision.mockReturnValue(executePromise);

    await renderComponent();

    // Verify initial table row shows Sem 3
    expect(container.textContent).toContain("Jagan Kokare");
    expect(container.textContent).toContain("Sem 3");

    // Click "Promotion" action button for student
    const promotionBtn = container.querySelector(".view-btn");
    expect(promotionBtn).not.toBeNull();

    await act(async () => {
      promotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Eligibility modal is now open
    expect(container.querySelector(".promotion-eligibility-overlay")).not.toBeNull();
    const confirmPromotionBtn = container.querySelector("#confirm-promotion-btn");
    expect(confirmPromotionBtn).not.toBeNull();

    // Click "Confirm Promotion" to open confirmation dialog
    await act(async () => {
      confirmPromotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Find the ConfirmModal confirm button
    const modalButtons = Array.from(container.querySelectorAll(".erp-modal-footer button"));
    const confirmModalBtn = modalButtons.find((btn) => btn.textContent.includes("Confirm Promotion"));
    expect(confirmModalBtn).toBeDefined();

    // Click confirm in ConfirmModal
    await act(async () => {
      confirmModalBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // --- OPTIMISTIC VERIFICATIONS (Synchronous / Immediate) ---
    // 1. Modals closed immediately
    expect(container.querySelector(".promotion-eligibility-overlay")).toBeNull();
    expect(container.querySelector(".erp-modal-overlay")).toBeNull();

    // 2. Table row updated optimistically to Sem 4 immediately
    expect(container.textContent).toContain("Sem 4");
    expect(container.textContent).not.toContain("Sem 3");

    // 3. API was called with decisionId and x-idempotency-key header
    expect(promotionApi.executePromotionDecision).toHaveBeenCalledTimes(1);
    expect(promotionApi.executePromotionDecision).toHaveBeenCalledWith(
      "decision-jagan-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-idempotency-key": expect.stringMatching(/^promo_decision-jagan-1_/),
        }),
      })
    );

    // 4. Resolve the background API response
    await act(async () => {
      resolveExecute({
        executionStatus: "PROMOTED",
        decision: { workflow_status: "PROMOTED" },
        student: {
          ...mockStudent,
          currentSemester: 4,
          currentYear: 2,
        },
      });
    });

    // 5. Toast success displayed
    expect(toast.success).toHaveBeenCalledWith("Promotion executed successfully.");

    // 6. Full table was NOT refetched on success (only initial mount fetch)
    expect(promotionApi.getPromotionEligibleStudents).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Sem 4");
  });

  it("2. Failure Rollback: Reverts row to previous state and displays specific server reason when live check fails", async () => {
    let rejectExecute;
    const executePromise = new Promise((_, reject) => {
      rejectExecute = reject;
    });
    promotionApi.executePromotionDecision.mockReturnValue(executePromise);

    await renderComponent();

    // Initial state: Sem 3
    expect(container.textContent).toContain("Sem 3");

    // Open eligibility modal
    const promotionBtn = container.querySelector(".view-btn");
    await act(async () => {
      promotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Open confirmation modal
    const confirmPromotionBtn = container.querySelector("#confirm-promotion-btn");
    await act(async () => {
      confirmPromotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Confirm
    const modalButtons = Array.from(container.querySelectorAll(".erp-modal-footer button"));
    const confirmModalBtn = modalButtons.find((btn) => btn.textContent.includes("Confirm Promotion"));
    expect(confirmModalBtn).toBeDefined();
    await act(async () => {
      confirmModalBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Optimistically updated to Sem 4 immediately
    expect(container.textContent).toContain("Sem 4");

    // Simulate backend live check failure (e.g. KT limit exceeded on live evaluation)
    const serverErrorMessage = "KT count 3 exceeds the current semester-specific limit of 2.";
    await act(async () => {
      rejectExecute({
        response: {
          status: 409,
          data: {
            code: "KT_LIMIT_EXCEEDED",
            message: serverErrorMessage,
          },
        },
      });
    });

    // --- ROLLBACK VERIFICATIONS ---
    // 1. Table row rolled back to Sem 3
    expect(container.textContent).toContain("Sem 3");
    expect(container.textContent).not.toContain("Sem 4");

    // 2. Exact server reason displayed to user via toast.error
    expect(toast.error).toHaveBeenCalledWith(serverErrorMessage);
  });

  it("3. Double-Click Prevention: Prevents repeated promotion requests for the same decision", async () => {
    let resolveExecute;
    const executePromise = new Promise((resolve) => {
      resolveExecute = resolve;
    });
    promotionApi.executePromotionDecision.mockReturnValue(executePromise);

    await renderComponent();

    // Open eligibility modal
    const promotionBtn = container.querySelector(".view-btn");
    await act(async () => {
      promotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Open confirmation modal
    const confirmPromotionBtn = container.querySelector("#confirm-promotion-btn");
    await act(async () => {
      confirmPromotionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const modalButtons = Array.from(container.querySelectorAll(".erp-modal-footer button"));
    const confirmModalBtn = modalButtons.find((btn) => btn.textContent.includes("Confirm Promotion"));
    expect(confirmModalBtn).toBeDefined();

    // Rapid double click
    await act(async () => {
      confirmModalBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirmModalBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // executePromotionDecision must be called exactly ONCE
    expect(promotionApi.executePromotionDecision).toHaveBeenCalledTimes(1);

    // Clean up pending promise
    await act(async () => {
      resolveExecute({ executionStatus: "PROMOTED" });
    });
  });
});

