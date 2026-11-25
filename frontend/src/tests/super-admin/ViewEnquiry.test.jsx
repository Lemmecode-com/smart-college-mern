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
  default: ({ message, onRetry }) => (
    <div data-testid="api-error">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
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
    expect(container.textContent).toContain("We need full ERP setup for our college");
    expect(container.textContent).toContain("NEW");
  });
});
