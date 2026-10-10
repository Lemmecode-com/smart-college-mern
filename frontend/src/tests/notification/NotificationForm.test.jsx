import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "notif-123" }),
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
    div: ({ children, className, style, ...props }) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    span: ({ children, className, ...props }) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../api/axios", () => ({
  default: {
    get: (...args) => mockApi.get(...args),
    post: (...args) => mockApi.post(...args),
    put: (...args) => mockApi.put(...args),
    delete: (...args) => mockApi.delete(...args),
  },
}));

vi.mock("../../components/Loading", () => ({
  default: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <div data-testid="breadcrumb" />,
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: () => null,
}));

vi.mock("../../components/common/PageHero", () => ({
  default: ({ title }) => <header><h1>{title}</h1></header>,
}));

import NotificationForm from "../../components/NotificationForm";
import { AuthContext } from "../../auth/AuthContext";
import { toast } from "react-toastify";

describe("NotificationForm Component", () => {
  let container;
  let root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mockApi.get.mockImplementation((url) => {
      if (url.includes("/departments")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes("/courses")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes("/notifications/")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              title: "Existing Title",
              message: "Existing Message",
              type: "GENERAL",
              priority: "NORMAL",
              target: "ALL",
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  const renderComponent = async (props = {}) => {
    const defaultUser = { id: "user-1", role: "COLLEGE_ADMIN" };
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: defaultUser }}>
          <NotificationForm role="college-admin" mode="create" {...props} />
        </AuthContext.Provider>
      );
    });
  };

  const setInputValue = (input, value) => {
    const proto =
      input instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("renders creation form with initial state and enabled submit button", async () => {
    await renderComponent({ mode: "create" });

    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.disabled).toBe(false);
  });

  it("submits notification, disables submit button, shows toast, and navigates after timeout", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { _id: "notif-new" } },
    });

    await renderComponent({ mode: "create" });

    const titleInput = container.querySelector('input[name="title"]');
    const messageInput = container.querySelector('textarea[name="message"]');
    const submitBtn = container.querySelector('button[type="submit"]');

    expect(titleInput).not.toBeNull();
    expect(messageInput).not.toBeNull();

    // Fill valid form fields
    await act(async () => {
      setInputValue(titleInput, "Upcoming College Seminar");
      setInputValue(messageInput, "All students are requested to attend tomorrow in the auditorium.");
    });

    // Click submit
    await act(async () => {
      submitBtn.click();
    });

    // api.post was called with correct payload
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith(
      "/notifications/admin/create",
      expect.objectContaining({
        title: "Upcoming College Seminar",
        message: "All students are requested to attend tomorrow in the auditorium.",
        target: "ALL",
      })
    );

    // Toast was shown
    expect(toast.success).toHaveBeenCalledWith("Notification created successfully!");

    // Button should stay disabled while navigation is pending
    expect(submitBtn.disabled).toBe(true);

    // Navigation should NOT have happened immediately
    expect(mockNavigate).not.toHaveBeenCalled();

    // Fast-forward timers for the 1200ms delay
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Now navigation occurred
    expect(mockNavigate).toHaveBeenCalledWith("/notification/list");
  });

  it("prevents duplicate submissions on rapid multiple clicks", async () => {
    let resolvePost;
    mockApi.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );

    await renderComponent({ mode: "create" });

    const titleInput = container.querySelector('input[name="title"]');
    const messageInput = container.querySelector('textarea[name="message"]');
    const submitBtn = container.querySelector('button[type="submit"]');

    await act(async () => {
      setInputValue(titleInput, "Emergency Campus Alert");
      setInputValue(messageInput, "Campus closed today due to weather conditions.");
    });

    // Rapid double-click
    await act(async () => {
      submitBtn.click();
      submitBtn.click();
      submitBtn.click();
    });

    // Only one post request was issued
    expect(mockApi.post).toHaveBeenCalledTimes(1);

    // Resolve the in-flight request
    await act(async () => {
      resolvePost({ data: { success: true } });
    });

    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("re-enables submit button and retains error state if submission fails without navigating", async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { data: { message: "Duplicate notification detected" } },
    });

    await renderComponent({ mode: "create" });

    const titleInput = container.querySelector('input[name="title"]');
    const messageInput = container.querySelector('textarea[name="message"]');
    const submitBtn = container.querySelector('button[type="submit"]');

    await act(async () => {
      setInputValue(titleInput, "Duplicate Alert");
      setInputValue(messageInput, "Message already posted.");
    });

    await act(async () => {
      submitBtn.click();
    });

    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Duplicate notification detected");

    // Must NOT navigate away
    expect(mockNavigate).not.toHaveBeenCalled();

    // Submit button re-enabled for user retry
    expect(submitBtn.disabled).toBe(false);
  });

  it("cleans up navigation timer on unmount before timeout fires", async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    await renderComponent({ mode: "create" });

    const titleInput = container.querySelector('input[name="title"]');
    const messageInput = container.querySelector('textarea[name="message"]');
    const submitBtn = container.querySelector('button[type="submit"]');

    await act(async () => {
      setInputValue(titleInput, "Unmount Test");
      setInputValue(messageInput, "Testing cleanup on unmount.");
    });

    await act(async () => {
      submitBtn.click();
    });

    expect(toast.success).toHaveBeenCalled();

    // Unmount before 1200ms timer completes
    await act(async () => {
      root.unmount();
    });

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // navigate must NOT be called after unmount
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
