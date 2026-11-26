import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ViewEnquiry from "../../pages/dashboard/Super-Admin/ViewEnquiry";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "inq_test_123" }),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
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

vi.mock("../../components/ApiError", () => ({
  default: ({ message, onRetry, onGoBack }) => (
    <div data-testid="api-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
      <button onClick={onGoBack}>Go Back</button>
    </div>
  ),
}));

describe("ViewEnquiry Page", () => {
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

  it("fetches and renders full inquiry details", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup for our college with 3,000 students and examination automation.",
      status: "NEW",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({
      data: mockInquiry,
    });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("MIT Academy of Engineering");
    expect(container.textContent).toContain("ENQ-202611-9999");
    expect(container.textContent).toContain("Sunil Kulkarni");
    expect(container.textContent).toContain("sunil@mitaoe.ac.in");
    expect(container.textContent).toContain("+91 9123456780");
    expect(container.textContent).toContain("We need full ERP setup for our college");
    expect(container.textContent).toContain("NEW");
  });

  it("renders stepper and displays next-step action 'Mark as Contacted' when status is NEW", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup.",
      status: "NEW",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("New Lead");
    expect(container.textContent).toContain("Contacted");
    expect(container.textContent).toContain("Closed");
    expect(container.textContent).toContain("Mark as Contacted");
    expect(container.textContent).not.toContain("Mark as Closed");
    expect(container.textContent).not.toContain("Reopen Enquiry");
  });

  it("displays next-step action 'Mark as Closed' when status is CONTACTED", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup.",
      status: "CONTACTED",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("Mark as Closed");
    expect(container.textContent).not.toContain("Mark as Contacted");
  });

  it("displays next-step action 'Reopen Enquiry' when status is CLOSED", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup.",
      status: "CLOSED",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("Reopen Enquiry");
    expect(container.textContent).not.toContain("Mark as Contacted");
    expect(container.textContent).not.toContain("Mark as Closed");
  });

  it("navigates to /super-admin/create-college with prefill state when Onboard College is clicked", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup.",
      status: "NEW",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    // Find Onboard College button
    const onboardBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.includes("Onboard College")
    );
    expect(onboardBtn).toBeDefined();

    await act(async () => {
      onboardBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/create-college", {
      state: {
        inquiryId: "inq_test_123",
        prefillName: "MIT Academy of Engineering",
        prefillEmail: "sunil@mitaoe.ac.in",
        prefillContact: "+91 9123456780",
      },
    });
  });

  it("renders 'College Onboarded' card and 'View College' button when enquiry is converted", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "+91 9123456780",
      role: "principal",
      message: "We need full ERP setup.",
      status: "CONVERTED",
      convertedCollegeId: {
        _id: "college_789",
        name: "MIT Academy of Engineering",
      },
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("CONVERTED");
    expect(container.textContent).toContain("College Onboarded");
    expect(container.textContent).toContain("View Registered College");

    const viewCollegeBtn = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.includes("View Registered College")
    );
    expect(viewCollegeBtn).toBeDefined();

    await act(async () => {
      viewCollegeBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/college/college_789");
  });

  it("renders 'Not provided' and disables call button when phone is missing", async () => {
    const mockInquiry = {
      _id: "inq_test_123",
      inquiryNumber: "ENQ-202611-9999",
      institutionName: "MIT Academy of Engineering",
      firstName: "Sunil",
      lastName: "Kulkarni",
      email: "sunil@mitaoe.ac.in",
      phone: "",
      role: "principal",
      message: "We need full ERP setup.",
      status: "NEW",
      createdAt: new Date().toISOString(),
    };

    api.get.mockResolvedValueOnce({ data: mockInquiry });

    await act(async () => {
      root.render(<ViewEnquiry />);
    });

    expect(container.textContent).toContain("Not provided");
    const disabledCall = container.querySelector(".sa-comm-disabled");
    expect(disabledCall).not.toBeNull();
  });
});
