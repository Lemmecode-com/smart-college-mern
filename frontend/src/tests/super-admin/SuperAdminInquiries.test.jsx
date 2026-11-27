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

  it("renders Export to PDF and Export to Excel buttons in header band", async () => {
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

    const pdfBtn = container.querySelector(".btn-export-pdf");
    const excelBtn = container.querySelector(".btn-export-excel");
    expect(pdfBtn).not.toBeNull();
    expect(excelBtn).not.toBeNull();
    expect(pdfBtn.textContent).toContain("PDF");
    expect(excelBtn.textContent).toContain("Excel");
  });

  it("renders Onboarded stat card and tab, and filters by CONVERTED status on click", async () => {
    const mockInquiries = [
      {
        _id: "inq_conv",
        inquiryNumber: "ENQ-202611-0004",
        institutionName: "Greenfield College of Management",
        firstName: "Priya",
        lastName: "Deshmukh",
        email: "priya.deshmukh@greenfield-demo.edu",
        role: "admin",
        message: "We are looking for a comprehensive ERP",
        status: "CONVERTED",
        createdAt: new Date().toISOString(),
      },
    ];

    api.get.mockResolvedValueOnce({
      data: mockInquiries,
      pagination: {
        total: 5,
        totalPages: 1,
        summary: {
          totalAll: 5,
          new: 1,
          contacted: 1,
          closed: 0,
          converted: 3,
        },
      },
    });

    await act(async () => {
      root.render(<SuperAdminInquiries />);
    });

    expect(container.textContent).toContain("Onboarded");
    expect(container.textContent).toContain("Active institutions");

    // Verify Onboarded tab badge displays converted count
    const tabs = Array.from(container.querySelectorAll(".sa-tab-btn"));
    const onboardedTab = tabs.find((t) => t.textContent.includes("Onboarded"));
    expect(onboardedTab).toBeDefined();
    expect(onboardedTab.querySelector(".sa-tab-badge").textContent).toBe("3");

    // Click Onboarded card
    const onboardedCard = container.querySelector('[aria-label="Filter by onboarded enquiries"]');
    expect(onboardedCard).not.toBeNull();

    api.get.mockResolvedValueOnce({
      data: mockInquiries,
      pagination: {
        total: 3,
        totalPages: 1,
        summary: { totalAll: 5, new: 1, contacted: 1, closed: 0, converted: 3 },
      },
    });

    await act(async () => {
      onboardedCard.click();
    });

    expect(api.get).toHaveBeenCalledWith(
      "/inquiries",
      expect.objectContaining({
        params: expect.objectContaining({ status: "CONVERTED" }),
      })
    );

    // Verify Archived card and tab
    expect(container.textContent).toContain("Archived");
    const archivedCard = container.querySelector('[aria-label="Filter by archived enquiries"]');
    expect(archivedCard).not.toBeNull();

    api.get.mockResolvedValueOnce({
      data: [],
      pagination: {
        total: 0,
        totalPages: 1,
        summary: { totalAll: 5, new: 1, contacted: 1, closed: 0, converted: 3 },
      },
    });

    await act(async () => {
      archivedCard.click();
    });

    expect(api.get).toHaveBeenCalledWith(
      "/inquiries",
      expect.objectContaining({
        params: expect.objectContaining({ status: "CLOSED" }),
      })
    );
  });
});
