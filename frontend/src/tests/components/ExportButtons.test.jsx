import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ExportButtons from "../../components/ExportButtons";
import { toast } from "react-toastify";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../utils/exportHelpers", () => ({
  exportToPDF: vi.fn().mockResolvedValue({ success: true, message: "PDF exported" }),
  exportToExcel: vi.fn().mockResolvedValue({ success: true, message: "Excel exported" }),
}));

vi.mock("../../api/generalSettings", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({ allowDataExport: "allowed" }),
}));

describe("ExportButtons Component - Policy Enforcement (#583)", () => {
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
      root.unmount();
    });
    container.remove();
  });

  it("disables export buttons and displays tooltip when allowDataExport is 'disabled'", async () => {
    await act(async () => {
      root.render(
        <ExportButtons
          allowDataExport="disabled"
          userRole="TEACHER"
          data={[{ id: 1, name: "Test" }]}
        />
      );
    });

    const pdfButton = container.querySelector(".btn-export-pdf");
    const excelButton = container.querySelector(".btn-export-excel");

    expect(pdfButton).not.toBeNull();
    expect(pdfButton.disabled).toBe(true);
    expect(pdfButton.getAttribute("title")).toBe("Data export is disabled by your institution policy.");

    expect(excelButton).not.toBeNull();
    expect(excelButton.disabled).toBe(true);
    expect(excelButton.getAttribute("title")).toBe("Data export is disabled by your institution policy.");
  });

  it("disables buttons for Teacher when allowDataExport is 'restricted'", async () => {
    await act(async () => {
      root.render(
        <ExportButtons
          allowDataExport="restricted"
          userRole="TEACHER"
          data={[{ id: 1, name: "Test" }]}
        />
      );
    });

    const pdfButton = container.querySelector(".btn-export-pdf");
    expect(pdfButton.disabled).toBe(true);
    expect(pdfButton.getAttribute("title")).toBe(
      "Data export is restricted to administrators and principals only."
    );
  });

  it("enables buttons for College Admin when allowDataExport is 'restricted'", async () => {
    await act(async () => {
      root.render(
        <ExportButtons
          allowDataExport="restricted"
          userRole="COLLEGE_ADMIN"
          data={[{ id: 1, name: "Test" }]}
        />
      );
    });

    const pdfButton = container.querySelector(".btn-export-pdf");
    const excelButton = container.querySelector(".btn-export-excel");

    expect(pdfButton.disabled).toBe(false);
    expect(excelButton.disabled).toBe(false);
  });

  it("exempts Super Admin and enables buttons even when policy is 'disabled'", async () => {
    await act(async () => {
      root.render(
        <ExportButtons
          allowDataExport="disabled"
          userRole="SUPER_ADMIN"
          data={[{ id: 1, name: "Test" }]}
        />
      );
    });

    const pdfButton = container.querySelector(".btn-export-pdf");
    expect(pdfButton.disabled).toBe(false);
  });

  it("enables buttons for all users when allowDataExport is 'allowed'", async () => {
    await act(async () => {
      root.render(
        <ExportButtons
          allowDataExport="allowed"
          userRole="STUDENT"
          data={[{ id: 1, name: "Test" }]}
        />
      );
    });

    const pdfButton = container.querySelector(".btn-export-pdf");
    expect(pdfButton.disabled).toBe(false);
  });
});
