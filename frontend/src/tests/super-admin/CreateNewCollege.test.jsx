import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CreateNewCollege from "../../pages/dashboard/Super-Admin/CreateNewCollege";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { inquiryId: "inq_test_123", prefillName: "Sunrise Institute", prefillEmail: "shinde@gmail.com", prefillContact: "9876543210" } }),
  Navigate: ({ to }) => <div data-testid="mock-navigate" data-to={to} />,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock("../../api/axios", () => ({
  default: {
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
  default: () => <div data-testid="breadcrumb" />,
}));

vi.mock("../../components/Loading", () => ({
  default: ({ text }) => <div data-testid="loading">{text}</div>,
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: ({ isOpen, onConfirm }) =>
    isOpen ? <button data-testid="confirm-submit-btn" onClick={onConfirm}>Confirm</button> : null,
}));

describe("CreateNewCollege Component", () => {
  let container;
  let root;

  const mockUser = {
    id: "super_admin_1",
    role: "SUPER_ADMIN",
    name: "System Owner",
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders success card with password toggle, email status, and modern action buttons upon creation", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        message: "College and College Admin created successfully",
        emailSent: true,
        college: {
          id: "col_123",
          name: "Sunrise Institute of Technology",
          code: "SIOT124",
          registrationUrl: "http://localhost:5173/register/SIOT124",
          registrationQr: "data:image/png;base64,mockqr",
        },
        collegeAdmin: {
          id: "adm_123",
          email: "shinde@gmail.com",
        },
      },
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: mockUser }}>
          <CreateNewCollege />
        </AuthContext.Provider>
      );
    });

    // Check pre-filled values
    const collegeNameInput = container.querySelector('input[name="collegeName"]');
    expect(collegeNameInput.value).toBe("Sunrise Institute");

    // Fill valid required fields
    const codeInput = container.querySelector('input[name="collegeCode"]');
    const emailInput = container.querySelector('input[name="collegeEmail"]');
    const phoneInput = container.querySelector('input[name="contactNumber"]');
    const addressInput = container.querySelector('textarea[name="address"]');
    const yearInput = container.querySelector('input[name="establishedYear"]');
    const adminNameInput = container.querySelector('input[name="adminName"]');
    const adminEmailInput = container.querySelector('input[name="adminEmail"]');
    const adminPasswordInput = container.querySelector('input[name="adminPassword"]');

    const setInputValue = (input, value) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      nativeSetter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const setTextareaValue = (textarea, value) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      ).set;
      nativeSetter.call(textarea, value);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    };

    await act(async () => {
      setInputValue(codeInput, "SIOT124");
      setInputValue(emailInput, "siot@college.edu");
      setInputValue(phoneInput, "9876543210");
      setTextareaValue(addressInput, "123 Educational Highway, Pune Maharashtra 411001");
      setInputValue(yearInput, "2010");
      setInputValue(adminNameInput, "Principal Shinde");
      setInputValue(adminEmailInput, "shinde@gmail.com");
      setInputValue(adminPasswordInput, "Secret@123");
    });

    // Submit form (triggers confirmation modal)
    const submitBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Create College")
    );
    expect(submitBtn).toBeTruthy();
    await act(async () => {
      submitBtn.click();
    });

    const confirmBtn = container.querySelector('[data-testid="confirm-submit-btn"]');
    expect(confirmBtn).toBeTruthy();

    await act(async () => {
      confirmBtn.click();
    });

    // Verify success card is rendered
    expect(container.textContent).toContain("Success! College and College Admin created successfully");
    expect(container.textContent).toContain("Sunrise Institute of Technology");
    expect(container.textContent).toContain("SIOT124");
    expect(container.textContent).toContain("shinde@gmail.com");

    // Verify email delivery banner is present
    expect(container.textContent).toContain("Welcome email with login credentials sent to");

    // Verify password is initially masked
    expect(container.textContent).toContain("••••••••");

    // Find View Password (Eye) button and click it
    const viewBtn = container.querySelector(".view-btn");
    expect(viewBtn).toBeTruthy();

    await act(async () => {
      viewBtn.click();
    });

    // Password should now be unmasked
    expect(container.textContent).toContain("Secret@123");

    // Click again to mask
    await act(async () => {
      viewBtn.click();
    });
    expect(container.textContent).toContain("••••••••");

    // Verify Copy All Credentials button works
    const copyAllBtn = container.querySelector(".copy-all-btn");
    expect(copyAllBtn).toBeTruthy();

    await act(async () => {
      copyAllBtn.click();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("Secret@123")
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("shinde@gmail.com")
    );

    // Verify QR code preview and copy link
    const qrImg = container.querySelector(".qr-preview-row img");
    expect(qrImg).toBeTruthy();
    expect(qrImg.src).toContain("mockqr");

    const copyLinkBtn = container.querySelector(".btn-copy-link");
    expect(copyLinkBtn).toBeTruthy();
    await act(async () => {
      copyLinkBtn.click();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:5173/register/SIOT124")
    );

    // Verify modern action buttons exist
    const listBtn = container.querySelector(".erp-btn-primary");
    expect(listBtn.textContent).toContain("Go to Colleges List");

    const returnBtn = container.querySelector(".success-actions .erp-btn-secondary");
    expect(returnBtn.textContent).toContain("Return to Enquiry");

    await act(async () => {
      listBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/colleges-list");
  });
});
