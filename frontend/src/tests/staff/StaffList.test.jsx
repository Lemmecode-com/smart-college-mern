import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import api from "../../api/axios";
import StaffList from "../../pages/dashboard/College-Admin/StaffList";
import { AuthContext } from "../../auth/AuthContext";
import { toast } from "react-toastify";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <nav data-testid="breadcrumb" />,
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
        <div className={className} style={style} onClick={onClick} {...cleanProps}>
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
      delete cleanProps.exit;
      delete cleanProps.transition;
      return (
        <button className={className} style={style} onClick={onClick} {...cleanProps}>
          {children}
        </button>
      );
    },
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe("StaffList - Deactivate / Reactivate Action", () => {
  let container;
  let root;
  let mock;

  const currentUser = {
    id: "admin-self-id",
    _id: "admin-self-id",
    name: "Admin Boss",
    role: "COLLEGE_ADMIN",
    college_id: "college-123",
  };

  const mockStaffData = [
    {
      id: "staff-1",
      name: "Alice Smith",
      email: "alice@college.edu",
      role: "TEACHER",
      isActive: true,
      mustChangePassword: false,
      mobileNumber: "1234567890",
      designation: "Assistant Professor",
      employmentType: "FULL_TIME",
    },
    {
      id: "staff-2",
      name: "Bob Jones",
      email: "bob@college.edu",
      role: "ACCOUNTANT",
      isActive: false,
      mustChangePassword: false,
      mobileNumber: "9876543210",
      designation: "Chief Accountant",
      employmentType: "FULL_TIME",
    },
    {
      id: "admin-self-id",
      name: "Admin Boss",
      email: "admin@college.edu",
      role: "PRINCIPAL",
      isActive: true,
      mustChangePassword: false,
      mobileNumber: "5555555555",
      designation: "Principal",
      employmentType: "FULL_TIME",
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mock = new MockAdapter(api);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
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

  const renderComponent = async (user = currentUser, staffData = mockStaffData) => {
    mock.onGet("/college/staff").reply(200, staffData);

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user }}>
          <StaffList />
        </AuthContext.Provider>
      );
    });
  };

  it("shows icon-only buttons with aria-labels for View and Edit, Deactivate for active staff, and Reactivate for inactive staff", async () => {
    await renderComponent();

    // View & Edit buttons exist with aria-labels and have no visible text
    const viewBtn = container.querySelector('button[aria-label="View profile of Alice Smith"]');
    expect(viewBtn).not.toBeNull();
    expect(viewBtn.textContent.trim()).toBe("");

    const editBtn = container.querySelector('button[aria-label="Edit details of Alice Smith"]');
    expect(editBtn).not.toBeNull();
    expect(editBtn.textContent.trim()).toBe("");

    // Alice is active -> should have Deactivate icon button with aria-label
    const deactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    expect(deactivateBtn).not.toBeNull();
    expect(deactivateBtn.textContent.trim()).toBe("");

    // Alice should NOT have Reactivate button
    const aliceReactivateBtn = container.querySelector('button[aria-label="Reactivate Alice Smith"]');
    expect(aliceReactivateBtn).toBeNull();

    // Bob is inactive -> should have Reactivate icon button with aria-label
    const reactivateBtn = container.querySelector('button[aria-label="Reactivate Bob Jones"]');
    expect(reactivateBtn).not.toBeNull();
    expect(reactivateBtn.textContent.trim()).toBe("");

    // Bob should NOT have Deactivate button
    const bobDeactivateBtn = container.querySelector('button[aria-label="Deactivate Bob Jones"]');
    expect(bobDeactivateBtn).toBeNull();
  });

  it("own row has no deactivate or reactivate button", async () => {
    await renderComponent();

    const rows = Array.from(container.querySelectorAll("tbody tr"));
    const adminRow = rows.find((r) => r.textContent.includes("Admin Boss"));
    expect(adminRow).toBeDefined();

    const adminButtons = Array.from(adminRow.querySelectorAll("button"));
    const viewBtn = adminButtons.find((b) => b.getAttribute("aria-label")?.startsWith("View"));
    const editBtn = adminButtons.find((b) => b.getAttribute("aria-label")?.startsWith("Edit"));
    const deactivateBtn = adminButtons.find((b) => b.getAttribute("aria-label")?.startsWith("Deactivate"));
    const reactivateBtn = adminButtons.find((b) => b.getAttribute("aria-label")?.startsWith("Reactivate"));

    expect(viewBtn).toBeDefined();
    expect(editBtn).toBeDefined();
    expect(deactivateBtn).toBeUndefined();
    expect(reactivateBtn).toBeUndefined();
  });

  it("displays informative tooltip on hover and on keyboard focus, and hides on blur/leave", async () => {
    await renderComponent();

    const viewBtn = container.querySelector('button[aria-label="View profile of Alice Smith"]');
    expect(viewBtn).not.toBeNull();

    // No tooltip initially
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();

    // Hover over View button (triggers mouseenter/mouseover)
    await act(async () => {
      viewBtn.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    let tooltip = document.querySelector(".erp-staff-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe("View profile of Alice Smith");

    // Mouse leave hides tooltip
    await act(async () => {
      viewBtn.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();

    // Keyboard focus on Deactivate button shows warning tooltip
    const deactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    expect(deactivateBtn).not.toBeNull();

    await act(async () => {
      deactivateBtn.focus();
    });
    tooltip = document.querySelector(".erp-staff-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe(
      "Deactivate Alice Smith. They will be logged out and cannot log in until reactivated."
    );

    // Blur hides tooltip
    await act(async () => {
      deactivateBtn.blur();
    });
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();

    // Keyboard focus on Reactivate button shows restoration tooltip
    const reactivateBtn = container.querySelector('button[aria-label="Reactivate Bob Jones"]');
    expect(reactivateBtn).not.toBeNull();

    await act(async () => {
      reactivateBtn.focus();
    });
    tooltip = document.querySelector(".erp-staff-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe("Reactivate Bob Jones. Restores login and system access.");

    // Blur hides tooltip
    await act(async () => {
      reactivateBtn.blur();
    });
    expect(document.querySelector(".erp-staff-tooltip")).toBeNull();
  });

  it("opens confirmation modal when Deactivate button is clicked with user details and warning", async () => {
    await renderComponent();

    const deactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    expect(deactivateBtn).not.toBeNull();

    await act(async () => {
      deactivateBtn.click();
    });

    const modal = document.querySelector(".erp-modal");
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain("Deactivate Staff Member");
    expect(modal.textContent).toContain("Alice Smith");
    expect(modal.textContent).toContain("logged out");
  });

  it("calls deactivate API on modal confirm and updates the list state on success", async () => {
    mock.onPut("/users/staff-1/deactivate").reply(200, {
      success: true,
      message: "Staff member deactivated successfully",
    });

    await renderComponent();

    const deactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    await act(async () => {
      deactivateBtn.click();
    });

    const confirmBtn =
      document.querySelector(".btn.btn-danger") ||
      Array.from(document.querySelectorAll(".erp-modal button")).find((b) =>
        b.textContent.includes("Deactivate")
      );
    expect(confirmBtn).not.toBeNull();

    await act(async () => {
      confirmBtn.click();
    });

    expect(toast.success).toHaveBeenCalledWith("Staff member deactivated successfully");

    // Alice should now be inactive and show Reactivate icon button
    const aliceRow = Array.from(container.querySelectorAll("tbody tr")).find((r) =>
      r.textContent.includes("Alice Smith")
    );
    expect(aliceRow.textContent).toContain("Inactive");

    const aliceReactivateBtn = container.querySelector('button[aria-label="Reactivate Alice Smith"]');
    expect(aliceReactivateBtn).not.toBeNull();

    const aliceDeactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    expect(aliceDeactivateBtn).toBeNull();
  });

  it("calls reactivate API on modal confirm and updates the list state on success", async () => {
    mock.onPut("/users/staff-2/reactivate").reply(200, {
      success: true,
      message: "Staff member reactivated successfully",
    });

    await renderComponent();

    const reactivateBtn = container.querySelector('button[aria-label="Reactivate Bob Jones"]');
    await act(async () => {
      reactivateBtn.click();
    });

    const confirmBtn =
      document.querySelector(".btn.btn-success") ||
      Array.from(document.querySelectorAll(".erp-modal button")).find((b) =>
        b.textContent.includes("Reactivate")
      );
    expect(confirmBtn).not.toBeNull();

    await act(async () => {
      confirmBtn.click();
    });

    expect(toast.success).toHaveBeenCalledWith("Staff member reactivated successfully");

    // Bob should now be active and show Deactivate icon button
    const bobRow = Array.from(container.querySelectorAll("tbody tr")).find((r) =>
      r.textContent.includes("Bob Jones")
    );
    expect(bobRow.textContent).toContain("Active");

    const bobDeactivateBtn = container.querySelector('button[aria-label="Deactivate Bob Jones"]');
    expect(bobDeactivateBtn).not.toBeNull();

    const bobReactivateBtn = container.querySelector('button[aria-label="Reactivate Bob Jones"]');
    expect(bobReactivateBtn).toBeNull();
  });

  it("shows error toast when deactivate API fails and preserves previous state", async () => {
    mock.onPut("/users/staff-1/deactivate").reply(400, {
      message: "Cannot deactivate user due to active dependencies",
    });

    await renderComponent();

    const deactivateBtn = container.querySelector('button[aria-label="Deactivate Alice Smith"]');
    await act(async () => {
      deactivateBtn.click();
    });

    const confirmBtn =
      document.querySelector(".btn.btn-danger") ||
      Array.from(document.querySelectorAll(".erp-modal button")).find((b) =>
        b.textContent.includes("Deactivate")
      );
    await act(async () => {
      confirmBtn.click();
    });

    expect(toast.error).toHaveBeenCalledWith("Cannot deactivate user due to active dependencies");

    // Alice remains active
    const aliceRow = Array.from(container.querySelectorAll("tbody tr")).find((r) =>
      r.textContent.includes("Alice Smith")
    );
    expect(aliceRow.textContent).toContain("Active");
  });
});
