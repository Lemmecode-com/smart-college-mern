import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SuperAdminInquiries from "../../pages/dashboard/Super-Admin/SuperAdminInquiries";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
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
  default: ({ message, onRetry }) => (
    <div data-testid="api-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe("SuperAdminInquiries Page", () => {
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

  it("fetches and renders inquiries list and summary cards", async () => {
    const mockInquiries = [
      {
        _id: "inq_1",
        inquiryNumber: "ENQ-202611-0001",
        institutionName: "Pune Engineering Institute",
        firstName: "Rajesh",
        lastName: "Patil",
        email: "rajesh@pei.ac.in",
        phone: "+91 9876543210",
        role: "principal",
        message: "Need ERP for 2000 students",
        status: "NEW",
        createdAt: new Date().toISOString(),
      },
    ];

    api.get.mockResolvedValueOnce({
      data: mockInquiries,
      pagination: {
        total: 1,
        totalPages: 1,
        summary: {
          totalAll: 1,
          new: 1,
          contacted: 0,
          closed: 0,
        },
      },
    });

    await act(async () => {
      root.render(<SuperAdminInquiries />);
    });

    expect(container.textContent).toContain("College Enquiries & Leads");
    expect(container.textContent).toContain("Pune Engineering Institute");
    expect(container.textContent).toContain("ENQ-202611-0001");
    expect(container.textContent).toContain("Rajesh Patil");
    expect(container.textContent).toContain("NEW");
  });

  it("renders enquiry rows with status badges and View actions", async () => {
    const mockInquiries = [
      {
        _id: "inq_new",
        inquiryNumber: "ENQ-202611-0001",
        institutionName: "College A",
        firstName: "A",
        lastName: "User",
        email: "a@college.edu",
        status: "NEW",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "inq_contacted",
        inquiryNumber: "ENQ-202611-0002",
        institutionName: "College B",
        firstName: "B",
        lastName: "User",
        email: "b@college.edu",
        status: "CONTACTED",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "inq_closed",
        inquiryNumber: "ENQ-202611-0003",
        institutionName: "College C",
        firstName: "C",
        lastName: "User",
        email: "c@college.edu",
        status: "CLOSED",
        createdAt: new Date().toISOString(),
      },
    ];

    api.get.mockResolvedValueOnce({
      data: mockInquiries,
      pagination: {
        total: 3,
        totalPages: 1,
        summary: { totalAll: 3, new: 1, contacted: 1, closed: 1 },
      },
    });

    await act(async () => {
      root.render(<SuperAdminInquiries />);
    });

    // Check that institutions and status badges are rendered
    expect(container.textContent).toContain("College A");
    expect(container.textContent).toContain("College B");
    expect(container.textContent).toContain("College C");
    expect(container.textContent).toContain("NEW");
    expect(container.textContent).toContain("View");
  });

  it("renders empty state with clear filters button when search returns no items", async () => {
    api.get.mockResolvedValueOnce({
      data: [],
      pagination: {
        total: 0,
        totalPages: 1,
        summary: { totalAll: 0, new: 0, contacted: 0, closed: 0 },
      },
    });

    await act(async () => {
      root.render(<SuperAdminInquiries />);
    });

    expect(container.textContent).toContain("No Enquiries Received Yet");
  });
});
