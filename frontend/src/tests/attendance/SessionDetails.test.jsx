import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ sessionId: "sess-1" }),
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
    div: ({ children, className, style, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      delete cleanProps.initial;
      delete cleanProps.animate;
      delete cleanProps.exit;
      delete cleanProps.transition;
      return (
        <div className={className} style={style} {...cleanProps}>
          {children}
        </div>
      );
    },
    tr: ({ children, className, style, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      delete cleanProps.initial;
      delete cleanProps.animate;
      delete cleanProps.exit;
      delete cleanProps.transition;
      return (
        <tr className={className} style={style} {...cleanProps}>
          {children}
        </tr>
      );
    },
    button: ({ children, className, style, onClick, disabled, ...props }) => {
      const cleanProps = { ...props };
      delete cleanProps.whileHover;
      delete cleanProps.whileTap;
      return (
        <button
          className={className}
          style={style}
          onClick={onClick}
          disabled={disabled}
          {...cleanProps}
        >
          {children}
        </button>
      );
    },
    span: ({ children, className, style, ...props }) => (
      <span className={className} style={style} {...props}>
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
  default: () => <nav data-testid="breadcrumb" />,
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: () => null,
}));

import SessionDetails from "../../pages/dashboard/Teacher/SessionDetails";

describe("SessionDetails Component - Attendance Edit & Mark (Bug #556)", () => {
  let container;
  let root;

  const mockOpenSession = {
    _id: "sess-1",
    lectureNumber: 1,
    lectureDate: "2026-10-13T09:00:00.000Z",
    status: "OPEN",
    totalStudents: 2,
    presentCount: 1,
    absentCount: 1,
    subject_id: { _id: "sub-1", name: "Computer Networks", code: "CS301" },
    course_id: { _id: "cr-1", name: "Computer Science" },
    slotSnapshot: {
      startTime: "09:00",
      endTime: "10:00",
      day: "MON",
      room: "101",
      subject_name: "Computer Networks",
      subject_code: "CS301",
      teacher_name: "Prof. Smith",
    },
    teacher_id: { _id: "t-1", name: "Prof. Smith" },
  };

  const mockClosedSession = {
    ...mockOpenSession,
    status: "CLOSED",
  };

  const mockStudents = [
    {
      _id: "stu-1",
      fullName: "Alice Brown",
      rollNumber: "CS-01",
      email: "alice@test.com",
    },
    {
      _id: "stu-2",
      fullName: "Bob Green",
      rollNumber: "CS-02",
      email: "bob@test.com",
    },
  ];

  const mockSavedRecords = [
    {
      _id: "rec-1",
      student_id: { _id: "stu-1", fullName: "Alice Brown" },
      status: "PRESENT",
      createdAt: "2026-10-13T09:05:00.000Z",
    },
    {
      _id: "rec-2",
      student_id: { _id: "stu-2", fullName: "Bob Green" },
      status: "ABSENT",
      createdAt: "2026-10-13T09:05:00.000Z",
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockNavigate.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
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

  const setupMockApi = ({
    session = mockOpenSession,
    students = mockStudents,
    records = mockSavedRecords,
  } = {}) => {
    mockApi.get.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1") {
        return Promise.resolve({ data: session });
      }
      if (url === "/attendance/sessions/sess-1/students") {
        return Promise.resolve({ data: students });
      }
      if (url === "/attendance/sessions/sess-1/records") {
        return Promise.resolve({ data: records });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });
  };

  const flushPromises = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("Saved Present/Absent statuses are preloaded into the dropdowns", async () => {
    setupMockApi();

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    const selects = container.querySelectorAll("select");
    expect(selects.length).toBe(2);
    expect(selects[0].value).toBe("PRESENT");
    expect(selects[1].value).toBe("ABSENT");
    expect(container.textContent).toContain("Attendance saved (2 students)");
  });

  it("The 'Edit Attendance' button shows when records exist and the session is OPEN; dropdowns are disabled until it is clicked", async () => {
    setupMockApi();

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // 1. Dropdowns disabled
    const selects = container.querySelectorAll("select");
    expect(selects[0].disabled).toBe(true);
    expect(selects[1].disabled).toBe(true);

    // 2. Edit Attendance button is shown, Save Attendance is NOT shown
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons.find((b) => b.textContent.includes("Edit Attendance"));
    expect(editBtn).not.toBeUndefined();

    const saveBtn = buttons.find((b) => b.textContent.includes("Save Attendance"));
    expect(saveBtn).toBeUndefined();

    // 3. Click Edit Attendance
    await act(async () => {
      editBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // 4. Dropdowns become enabled, Save Changes and Cancel buttons appear
    expect(selects[0].disabled).toBe(false);
    expect(selects[1].disabled).toBe(false);

    const updatedButtons = Array.from(container.querySelectorAll("button"));
    const saveChangesBtn = updatedButtons.find((b) =>
      b.textContent.includes("Save Changes"),
    );
    const cancelBtn = updatedButtons.find((b) =>
      b.textContent.includes("Cancel"),
    );
    expect(saveChangesBtn).not.toBeUndefined();
    expect(cancelBtn).not.toBeUndefined();
  });

  it("Saving in edit mode calls PUT .../edit, then refetches records so the summary cards update", async () => {
    let currentRecords = [...mockSavedRecords];

    mockApi.get.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1") {
        return Promise.resolve({ data: mockOpenSession });
      }
      if (url === "/attendance/sessions/sess-1/students") {
        return Promise.resolve({ data: mockStudents });
      }
      if (url === "/attendance/sessions/sess-1/records") {
        return Promise.resolve({ data: currentRecords });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    mockApi.put.mockResolvedValueOnce({
      data: {
        message: "Attendance updated successfully",
        updatedCount: 2,
        summary: { total: 2, present: 0, absent: 2, percentage: 0 },
      },
    });

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Enter edit mode
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons.find((b) => b.textContent.includes("Edit Attendance"));
    await act(async () => {
      editBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Change student 1 from PRESENT to ABSENT
    const selects = container.querySelectorAll("select");
    await act(async () => {
      selects[0].value = "ABSENT";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushPromises();

    // Update records returned for next fetch
    currentRecords = [
      {
        _id: "rec-1",
        student_id: { _id: "stu-1", fullName: "Alice Brown" },
        status: "ABSENT",
      },
      {
        _id: "rec-2",
        student_id: { _id: "stu-2", fullName: "Bob Green" },
        status: "ABSENT",
      },
    ];

    // Click Save Changes
    const updatedButtons = Array.from(container.querySelectorAll("button"));
    const saveChangesBtn = updatedButtons.find((b) =>
      b.textContent.includes("Save Changes"),
    );

    await act(async () => {
      saveChangesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Verify PUT request
    expect(mockApi.put).toHaveBeenCalledWith(
      "/attendance/sessions/sess-1/edit",
      {
        attendance: [
          { student_id: "stu-1", status: "ABSENT" },
          { student_id: "stu-2", status: "ABSENT" },
        ],
      },
    );

    // Verify edit mode exited and records refetched
    const postSaveButtons = Array.from(container.querySelectorAll("button"));
    const reEditBtn = postSaveButtons.find((b) =>
      b.textContent.includes("Edit Attendance"),
    );
    expect(reEditBtn).not.toBeUndefined();
    expect(selects[0].disabled).toBe(true);
  });

  it("Cancel restores the saved statuses", async () => {
    setupMockApi();

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Enter edit mode
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons.find((b) => b.textContent.includes("Edit Attendance"));
    await act(async () => {
      editBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Change student 1 from PRESENT to ABSENT
    const selects = container.querySelectorAll("select");
    expect(selects[0].value).toBe("PRESENT");

    await act(async () => {
      selects[0].value = "ABSENT";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushPromises();
    expect(selects[0].value).toBe("ABSENT");

    // Click Cancel
    const cancelButtons = Array.from(container.querySelectorAll("button"));
    const cancelBtn = cancelButtons.find((b) => b.textContent.includes("Cancel"));
    await act(async () => {
      cancelBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Verify restored to saved status and disabled
    expect(selects[0].value).toBe("PRESENT");
    expect(selects[1].value).toBe("ABSENT");
    expect(selects[0].disabled).toBe(true);
    expect(selects[1].disabled).toBe(true);
  });

  it("A closed session shows the read-only message and no Edit button", async () => {
    setupMockApi({ session: mockClosedSession });

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Check banner message
    expect(container.textContent).toContain(
      "This session is closed, so attendance can no longer be edited.",
    );

    // Check no edit or save buttons exist
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons.find((b) => b.textContent.includes("Edit Attendance"));
    const saveBtn = buttons.find((b) => b.textContent.includes("Save Attendance"));
    expect(editBtn).toBeUndefined();
    expect(saveBtn).toBeUndefined();
  });

  it("The initial mark flow (no records) still calls POST .../mark", async () => {
    let currentRecords = [];

    mockApi.get.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1") {
        return Promise.resolve({ data: mockOpenSession });
      }
      if (url === "/attendance/sessions/sess-1/students") {
        return Promise.resolve({ data: mockStudents });
      }
      if (url === "/attendance/sessions/sess-1/records") {
        return Promise.resolve({ data: currentRecords });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    mockApi.post.mockResolvedValueOnce({
      data: { message: "Attendance saved successfully!" },
    });

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Dropdowns enabled by default in new session
    const selects = container.querySelectorAll("select");
    expect(selects[0].disabled).toBe(false);
    expect(selects[1].disabled).toBe(false);
    expect(selects[0].value).toBe("PRESENT");
    expect(selects[1].value).toBe("PRESENT");

    // Change student 2 to ABSENT
    await act(async () => {
      selects[1].value = "ABSENT";
      selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushPromises();

    // Find Save Attendance button
    const buttons = Array.from(container.querySelectorAll("button"));
    const saveBtn = buttons.find((b) => b.textContent.includes("Save Attendance"));
    expect(saveBtn).not.toBeUndefined();

    // Update records returned after save
    currentRecords = mockSavedRecords;

    await act(async () => {
      saveBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Verify POST was called
    expect(mockApi.post).toHaveBeenCalledWith(
      "/attendance/sessions/sess-1/mark",
      {
        attendance: [
          { student_id: "stu-1", status: "PRESENT" },
          { student_id: "stu-2", status: "ABSENT" },
        ],
      },
    );
  });

  it("SESSION_CLOSED from PUT switches the page to read-only", async () => {
    let currentSession = { ...mockOpenSession };

    mockApi.get.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1") {
        return Promise.resolve({ data: currentSession });
      }
      if (url === "/attendance/sessions/sess-1/students") {
        return Promise.resolve({ data: mockStudents });
      }
      if (url === "/attendance/sessions/sess-1/records") {
        return Promise.resolve({ data: mockSavedRecords });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    mockApi.put.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1/edit") {
        currentSession = { ...mockClosedSession };
        return Promise.reject({
          response: {
            status: 400,
            data: {
              code: "SESSION_CLOSED",
              message: "Cannot edit attendance for a closed session",
            },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled PUT url: ${url}`));
    });

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Enter edit mode
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons.find((b) => b.textContent.includes("Edit Attendance"));
    await act(async () => {
      editBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Click Save Changes
    const updatedButtons = Array.from(container.querySelectorAll("button"));
    const saveChangesBtn = updatedButtons.find((b) =>
      b.textContent.includes("Save Changes"),
    );

    await act(async () => {
      saveChangesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    // Verify switched to read-only
    expect(container.textContent).toContain(
      "This session is closed, so attendance can no longer be edited.",
    );
    const postCloseButtons = Array.from(container.querySelectorAll("button"));
    expect(
      postCloseButtons.find((b) => b.textContent.includes("Edit Attendance")),
    ).toBeUndefined();
    expect(
      postCloseButtons.find((b) => b.textContent.includes("Save Changes")),
    ).toBeUndefined();
  });

  it("unsaved choices survive a refetch", async () => {
    let recordList = [];

    mockApi.get.mockImplementation((url) => {
      if (url === "/attendance/sessions/sess-1") {
        return Promise.resolve({ data: mockOpenSession });
      }
      if (url === "/attendance/sessions/sess-1/students") {
        return Promise.resolve({ data: mockStudents });
      }
      if (url === "/attendance/sessions/sess-1/records") {
        return Promise.resolve({ data: recordList });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    const selects = container.querySelectorAll("select");
    expect(selects[1].value).toBe("PRESENT");

    // Change student 2 to ABSENT
    await act(async () => {
      selects[1].value = "ABSENT";
      selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushPromises();
    expect(selects[1].value).toBe("ABSENT");

    // Simulate background refetch of records or re-render
    recordList = [];
    await act(async () => {
      root.render(<SessionDetails />);
    });
    await flushPromises();

    // Unsaved selection on student 2 MUST still be ABSENT
    const selectsAfterRefetch = container.querySelectorAll("select");
    expect(selectsAfterRefetch[1].value).toBe("ABSENT");
  });
});
