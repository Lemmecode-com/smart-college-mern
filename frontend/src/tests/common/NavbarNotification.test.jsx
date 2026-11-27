import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NavbarComponent from "../../components/Navbar";
import { AuthContext } from "../../auth/AuthContext";
import api from "../../api/axios";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/super-admin/dashboard" }),
}));

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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

describe("NavbarComponent — Super Admin & College Admin Notifications (#587)", () => {
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

  const superAdminUser = {
    id: "sa-101",
    role: "SUPER_ADMIN",
    name: "System Super Admin",
    email: "superadmin@novaa.com",
  };

  const collegeAdminUser = {
    id: "ca-202",
    role: "COLLEGE_ADMIN",
    name: "College Administrator",
    email: "admin@college.edu",
    college_id: "college-888",
  };

  it("1. Renders bell for SUPER_ADMIN with unread count badge", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/notifications/count/super-admin") {
        return Promise.resolve({ data: { total: 4 } });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: superAdminUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    // Verify bell is present
    const bellBtn = container.querySelector(".notification-bell");
    expect(bellBtn).not.toBeNull();

    // Verify badge text displays 4
    const badge = container.querySelector(".notification-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("4");
    expect(api.get).toHaveBeenCalledWith("/notifications/count/super-admin");
  });

  it("2. Clicking an item in dropdown calls mark-read and navigates to its actionUrl", async () => {
    const mockNotifs = [
      {
        _id: "notif-999",
        title: "New College Enquiry",
        message: "Alpha Institute submitted an enquiry",
        actionUrl: "/super-admin/enquiry/inq-555",
        type: "ENQUIRY",
        createdAt: new Date().toISOString(),
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === "/notifications/count/super-admin") {
        return Promise.resolve({ data: { total: 1 } });
      }
      if (url === "/notifications/unread/bell") {
        return Promise.resolve({ data: mockNotifs });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockResolvedValue({ data: { success: true } });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: superAdminUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    // Open dropdown to trigger fetchNotes
    const bellBtn = container.querySelector(".notification-bell");
    await act(async () => {
      bellBtn.click();
    });

    expect(api.get).toHaveBeenCalledWith("/notifications/unread/bell");

    // Click the notification card
    const card = container.querySelector(".notification-card");
    expect(card).not.toBeNull();
    expect(card.textContent).toContain("New College Enquiry");

    await act(async () => {
      card.click();
    });

    // Verifies markAsRead was called for this notification
    expect(api.post).toHaveBeenCalledWith("/notifications/notif-999/mark-read");

    // Verifies navigation to the notification's specific actionUrl
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/enquiry/inq-555");
  });

  it("3. Renders empty state when there are no unread notifications", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/notifications/count/super-admin") {
        return Promise.resolve({ data: { total: 0 } });
      }
      if (url === "/notifications/unread/bell") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: superAdminUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    const bellBtn = container.querySelector(".notification-bell");
    await act(async () => {
      bellBtn.click();
    });

    const emptyMsg = container.querySelector(".notification-empty");
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toContain("No new notifications");
  });

  it("4. Gracefully handles API failure states without crashing", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/notifications/count/super-admin") {
        return Promise.reject(new Error("500 Internal Server Error"));
      }
      if (url === "/notifications/unread/bell") {
        return Promise.reject(new Error("500 Internal Server Error"));
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: superAdminUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    // Badge should not be rendered on count failure
    const badge = container.querySelector(".notification-badge");
    expect(badge).toBeNull();

    // Clicking bell still opens and renders empty fallback gracefully
    const bellBtn = container.querySelector(".notification-bell");
    await act(async () => {
      bellBtn.click();
    });

    const emptyMsg = container.querySelector(".notification-empty");
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toContain("No new notifications");
  });

  it("5. Nothing changes for COLLEGE_ADMIN: queries admin count and routes View All to /notification/list", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/notifications/count/admin") {
        return Promise.resolve({ data: { total: 3 } });
      }
      if (url === "/notifications/unread/bell") {
        return Promise.resolve({
          data: [
            {
              _id: "admin-notif-1",
              title: "Exam Schedule Published",
              message: "Exam schedule published for all departments.",
              actionUrl: "/notification/view/admin-notif-1",
              type: "EXAM",
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: collegeAdminUser, logout: vi.fn() }}>
          <NavbarComponent />
        </AuthContext.Provider>
      );
    });

    // Verify COLLEGE_ADMIN calls /notifications/count/admin (NOT super-admin)
    expect(api.get).toHaveBeenCalledWith("/notifications/count/admin");
    expect(api.get).not.toHaveBeenCalledWith("/notifications/count/super-admin");

    const badge = container.querySelector(".notification-badge");
    expect(badge.textContent).toBe("3");

    // Open bell dropdown
    const bellBtn = container.querySelector(".notification-bell");
    await act(async () => {
      bellBtn.click();
    });

    // Click "View all notifications"
    const viewAllBtn = container.querySelector(".dropdown-footer button");
    expect(viewAllBtn).not.toBeNull();

    await act(async () => {
      viewAllBtn.click();
    });

    // Verify navigation routes to /notification/list (NOT /super-admin/enquiries)
    expect(mockNavigate).toHaveBeenCalledWith("/notification/list");
  });
});
