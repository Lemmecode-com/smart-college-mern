import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NavbarComponent from "../../components/Navbar";
import { AuthContext } from "../../auth/AuthContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: () => <div data-testid="confirm-modal" />,
}));

describe("NavbarComponent — React Rules of Hooks (#569)", () => {
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
      container = null;
    }
  });

  const testUser = {
    id: "user-123",
    role: "COLLEGE_ADMIN",
    name: "Dr. Admin",
    email: "admin@college.edu",
    college_id: "college-456",
  };

  it("re-renders smoothly when user transitions from authenticated to null (logout)", async () => {
    // 1. Initial render with authenticated user
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: testUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    // 2. Re-render with user set to null (simulating logout / token expiry)
    // This MUST NOT throw "Rendered fewer hooks than expected"
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: null, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    expect(container.innerHTML).toBe("");
  });

  it("re-renders smoothly when user transitions from null to authenticated (hydration / login)", async () => {
    // 1. Initial render with null user
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: null, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    expect(container.innerHTML).toBe("");

    // 2. Re-render with authenticated user
    // This MUST NOT throw "Rendered more hooks than during the previous render"
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: testUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    expect(container.querySelector("nav")).not.toBeNull();
  });
});

