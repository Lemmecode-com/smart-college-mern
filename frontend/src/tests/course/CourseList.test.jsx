import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import api from "../../api/axios";
import CourseList from "../../pages/dashboard/College-Admin/CourseList";
import { AuthContext } from "../../auth/AuthContext";
import { toast } from "react-toastify";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.React = React;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Navigate: ({ to }) => <div data-testid="navigate-redirect" data-to={to} />,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <nav data-testid="breadcrumb" />,
}));

vi.mock("../../components/Loading", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../../hooks/useRole", () => ({
  default: () => ({
    canCreate: () => true,
    canEdit: () => true,
    canDelete: () => true,
    hasAccess: () => true,
  }),
}));

describe("CourseList — Action Buttons & Deactivate/Reactivate Lifecycle", () => {
  let container;
  let root;
  let mock;

  const currentUser = {
    id: "admin-1",
    _id: "admin-1",
    name: "College Administrator",
    role: "COLLEGE_ADMIN",
    college_id: "college-123",
  };

  const mockDepartmentData = [
    {
      _id: "dept-1",
      name: "Computer Science Dept",
      code: "CSD",
      status: "ACTIVE",
      isActive: true,
    },
  ];

  const mockCourseData = [
    {
      _id: "course-1",
      name: "B.Tech Computer Science",
      code: "BTCS",
      type: "UNDERGRADUATE",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 60,
      department_id: "dept-1",
      status: "ACTIVE",
      isActive: true,
    },
    {
      _id: "course-2",
      name: "B.Tech Mechanical Engineering",
      code: "BTME",
      type: "UNDERGRADUATE",
      durationSemesters: 8,
      credits: 160,
      maxStudents: 60,
      department_id: "dept-1",
      status: "INACTIVE",
      isActive: false,
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mock = new MockAdapter(api);
    mock.onGet("/departments").reply(200, mockDepartmentData);
    mock.onGet(/\/courses\/department\/dept-1.*/).reply(200, { courses: mockCourseData });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    mock.restore();
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    const tooltips = document.querySelectorAll(".erp-staff-tooltip, .erp-action-tooltip");
    tooltips.forEach((t) => t.remove());
  });

  const renderComponent = async (user = currentUser) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user, isAuthenticated: true }}>
          <CourseList />
        </AuthContext.Provider>
      );
    });

    // Select department to trigger courses loading
    const deptSelect = container.querySelector('select[aria-label="Select department"]');
    if (deptSelect) {
      await act(async () => {
        deptSelect.value = "dept-1";
        deptSelect.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
  };

  it("renders icon-only action buttons with aria-labels and tooltips, without a Delete dustbin button", async () => {
    await renderComponent();

    // Verify view button
    const viewBtn = container.querySelector('button[aria-label="View details of B.Tech Computer Science"]');
    expect(viewBtn).not.toBeNull();
    expect(viewBtn.textContent.trim()).toBe("");

    // Verify edit button
    const editBtn = container.querySelector('button[aria-label="Edit B.Tech Computer Science"]');
    expect(editBtn).not.toBeNull();
    expect(editBtn.textContent.trim()).toBe("");

    // Verify Deactivate button on active course (course-1)
    const deactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    expect(deactivateBtn).not.toBeNull();

    // Verify Reactivate button on inactive course (course-2)
    const reactivateBtn = container.querySelector('button[aria-label="Reactivate B.Tech Mechanical Engineering"]');
    expect(reactivateBtn).not.toBeNull();

    // Crucial check: Ensure NO Delete button exists in the DOM
    const deleteButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) =>
        b.getAttribute("aria-label")?.toLowerCase().includes("delete") ||
        b.className.includes("delete-btn")
    );
    expect(deleteButtons.length).toBe(0);
  });

  it("displays informative tooltip on hover and on keyboard focus, and hides on blur/leave", async () => {
    await renderComponent();

    const viewBtn = container.querySelector('button[aria-label="View details of B.Tech Computer Science"]');
    expect(viewBtn).not.toBeNull();

    // No tooltip initially
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();

    // Hover View button -> portal tooltip appears
    await act(async () => {
      viewBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    let tooltip = document.querySelector(".erp-staff-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe("View details of B.Tech Computer Science");

    // Mouse leave hides tooltip
    await act(async () => {
      viewBtn.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();

    // Focus on Deactivate button shows warning tooltip
    const deactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    await act(async () => {
      deactivateBtn.focus();
    });

    tooltip = document.querySelector(".erp-staff-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe(
      "Deactivate B.Tech Computer Science. It will no longer be available for new students, subjects, timetables or exams."
    );

    // Blur hides tooltip
    await act(async () => {
      deactivateBtn.blur();
    });
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();
  });

  it("opens confirmation modal on deactivate click and updates course to Inactive in-place", async () => {
    await renderComponent();

    const deactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    expect(deactivateBtn).not.toBeNull();

    // Click deactivate to open ConfirmModal
    await act(async () => {
      deactivateBtn.click();
    });

    // Check modal appears with course name
    const modal = document.querySelector(".erp-modal");
    expect(modal).not.toBeNull();
    expect(modal.textContent).toMatch(/deactivate course/i);
    expect(modal.textContent).toContain("B.Tech Computer Science");

    // Mock deactivate API endpoint
    mock.onPut("/courses/course-1/deactivate").reply(200, {
      success: true,
      message: '"B.Tech Computer Science" deactivated successfully',
      data: {
        course: {
          ...mockCourseData[0],
          status: "INACTIVE",
          isActive: false,
        },
      },
    });

    // Confirm deactivation
    const confirmBtn =
      document.querySelector(".confirm-modal-confirm-btn, button.btn-danger, button.btn-warning") ||
      Array.from(document.querySelectorAll(".erp-modal button")).find((b) =>
        b.textContent.includes("Deactivate")
      );
    expect(confirmBtn).not.toBeNull();

    await act(async () => {
      confirmBtn.click();
    });

    // Success toast shown
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("deactivated successfully")
    );

    // Verify in-place update: course-1 now has a Reactivate button instead of Deactivate
    const newReactivateBtn = container.querySelector('button[aria-label="Reactivate B.Tech Computer Science"]');
    expect(newReactivateBtn).not.toBeNull();

    const oldDeactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    expect(oldDeactivateBtn).toBeNull();
  });

  it("opens confirmation modal on reactivate click and updates course to Active in-place", async () => {
    await renderComponent();

    const reactivateBtn = container.querySelector('button[aria-label="Reactivate B.Tech Mechanical Engineering"]');
    expect(reactivateBtn).not.toBeNull();

    // Click reactivate to open ConfirmModal
    await act(async () => {
      reactivateBtn.click();
    });

    // Check modal appears with course name
    const modal = document.querySelector(".erp-modal");
    expect(modal).not.toBeNull();
    expect(modal.textContent).toMatch(/reactivate course/i);
    expect(modal.textContent).toContain("B.Tech Mechanical Engineering");

    // Mock reactivate API endpoint
    mock.onPut("/courses/course-2/reactivate").reply(200, {
      success: true,
      message: '"B.Tech Mechanical Engineering" reactivated successfully',
      data: {
        course: {
          ...mockCourseData[1],
          status: "ACTIVE",
          isActive: true,
        },
      },
    });

    const confirmBtn =
      document.querySelector(".confirm-modal-confirm-btn, button.btn-primary, button.btn-success") ||
      Array.from(document.querySelectorAll(".erp-modal button")).find((b) =>
        b.textContent.includes("Reactivate")
      );
    expect(confirmBtn).not.toBeNull();

    await act(async () => {
      confirmBtn.click();
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("reactivated successfully")
    );

    // Verify in-place update: course-2 now has a Deactivate button instead of Reactivate
    const newDeactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Mechanical Engineering"]');
    expect(newDeactivateBtn).not.toBeNull();

    const oldReactivateBtn = container.querySelector('button[aria-label="Reactivate B.Tech Mechanical Engineering"]');
    expect(oldReactivateBtn).toBeNull();
  });

  it("shows error toast when deactivate API fails and preserves previous state", async () => {
    await renderComponent();

    const deactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    expect(deactivateBtn).not.toBeNull();

    await act(async () => {
      deactivateBtn.click();
    });

    mock.onPut("/courses/course-1/deactivate").reply(400, {
      success: false,
      message: "Cannot deactivate course with active students enrolled",
    });

    const confirmBtn = document.querySelector(".confirm-modal-confirm-btn, button.btn-danger, button.btn-warning");
    await act(async () => {
      confirmBtn.click();
    });

    // Error toast with server message
    expect(toast.error).toHaveBeenCalledWith(
      "Cannot deactivate course with active students enrolled"
    );

    // State preserved: course-1 still has Deactivate button
    const stillDeactivateBtn = container.querySelector('button[aria-label="Deactivate B.Tech Computer Science"]');
    expect(stillDeactivateBtn).not.toBeNull();
  });
});
