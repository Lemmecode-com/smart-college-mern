import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import api from "../../api/axios";
import ExamList from "../../pages/dashboard/ExamCoordinator/ExamList";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.React = React;

vi.mock("../../components/Breadcrumb", () => ({
  default: () => <nav data-testid="breadcrumb" />,
}));

vi.mock("../../components/PageHeader", () => ({
  default: ({ title, subtitle, actions }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </div>
  ),
}));

vi.mock("../../components/ConfirmModal", () => ({
  default: () => null,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("ExamList — Cascading Filters and UI Enhancements", () => {
  let container;
  let root;
  let mock;

  const mockDepartments = [
    { _id: "dept-1", name: "Computer Science", code: "CS", status: "ACTIVE", isActive: true },
    { _id: "dept-2", name: "Mechanical Engineering", code: "ME", status: "ACTIVE", isActive: true },
  ];

  const mockCoursesDept1 = [
    { _id: "course-1", name: "B.Tech CSE", code: "COM-CO", durationSemesters: 8, status: "ACTIVE", isActive: true },
    { _id: "course-2", name: "M.Tech CSE", code: "MTECH-CO", durationSemesters: 4, status: "ACTIVE", isActive: true },
  ];

  const mockExams = [
    {
      _id: "exam-1",
      name: "CSE Semester 1 Regular Exam",
      semester: 1,
      academicYear: "2026-2027",
      status: "DRAFT",
      subjects: [{ subject: { name: "Data Structures", code: "DS101" } }],
      course_id: {
        _id: "course-1",
        name: "B.Tech CSE",
        code: "COM-CO",
        department_id: { _id: "dept-1", name: "Computer Science" },
      },
    },
    {
      _id: "exam-2",
      name: "CSE Semester 2 Regular Exam",
      semester: 2,
      academicYear: "2026-2027",
      status: "PUBLISHED",
      subjects: [{ subject: { name: "Algorithms", code: "AL201" } }],
      course_id: {
        _id: "course-1",
        name: "B.Tech CSE",
        code: "COM-CO",
        department_id: { _id: "dept-1", name: "Computer Science" },
      },
    },
  ];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mock = new MockAdapter(api);

    mock.onGet(/\/departments/).reply(200, {
      success: true,
      data: { departments: mockDepartments },
    });

    mock.onGet(/\/courses/).reply(200, {
      success: true,
      data: { courses: mockCoursesDept1 },
    });

    mock.onGet(/\/exam/).reply(200, mockExams);
  });

  afterEach(() => {
    mock.restore();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderComponent = async (initialEntries = ["/dashboard/exam/list"]) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/dashboard/exam/list" element={<ExamList />} />
          </Routes>
        </MemoryRouter>
      );
    });
    // Wait for initial API calls to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it("renders filter controls in order: Search, Department, Course, Semester, Status", async () => {
    await renderComponent();

    const searchInput = container.querySelector(".search-box input");
    expect(searchInput).not.toBeNull();

    const selects = container.querySelectorAll(".filter-row select");
    expect(selects.length).toBe(4);

    const [deptSelect, courseSelect, semSelect, statusSelect] = selects;

    expect(deptSelect.options[0].textContent).toBe("All Departments");
    expect(courseSelect.options[0].textContent).toBe("All Courses");
    expect(semSelect.options[0].textContent).toBe("All Semesters");
    expect(statusSelect.options[0].textContent).toBe("All status");

    // Course and Semester must be disabled by default
    expect(courseSelect.disabled).toBe(true);
    expect(semSelect.disabled).toBe(true);
  });

  it("loads departments and enables course dropdown when department is selected", async () => {
    await renderComponent();

    const selects = container.querySelectorAll(".filter-row select");
    const [deptSelect, courseSelect] = selects;

    // Dept select should have loaded departments
    expect(deptSelect.options.length).toBe(3); // "All Departments" + 2 depts

    // Select dept-1
    await act(async () => {
      deptSelect.value = "dept-1";
      deptSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Wait for courses API to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const updatedSelects = container.querySelectorAll(".filter-row select");
    const updatedCourseSelect = updatedSelects[1];

    // Course select should now be enabled and have courses loaded
    expect(updatedCourseSelect.disabled).toBe(false);
    expect(updatedCourseSelect.options.length).toBe(3); // "All Courses" + 2 courses
  });

  it("dynamically loads semesters when course is selected and resets when department changes", async () => {
    await renderComponent();

    let selects = container.querySelectorAll(".filter-row select");

    // 1. Select dept-1
    await act(async () => {
      selects[0].value = "dept-1";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // 2. Re-query fresh selects and select course-1 (8 semesters)
    selects = container.querySelectorAll(".filter-row select");
    await act(async () => {
      selects[1].value = "course-1";
      selects[1].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    selects = container.querySelectorAll(".filter-row select");
    const semSelect = selects[2];
    expect(semSelect.disabled).toBe(false);
    expect(semSelect.options.length).toBe(9); // "All Semesters" + 8 semesters

    // 3. Select semester 2
    await act(async () => {
      semSelect.value = "2";
      semSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(semSelect.value).toBe("2");

    // 4. Changing department resets Course and Semester
    selects = container.querySelectorAll(".filter-row select");
    await act(async () => {
      selects[0].value = "dept-2";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    selects = container.querySelectorAll(".filter-row select");
    expect(selects[1].value).toBe("");
    expect(selects[2].value).toBe("");
    expect(selects[2].disabled).toBe(true);
  });

  it("displays course code and department name in the Course column", async () => {
    await renderComponent();

    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const courseCodes = container.querySelectorAll(".course-code");
    expect(courseCodes.length).toBeGreaterThan(0);
    // Should format as "COM-CO · Computer Science"
    expect(courseCodes[0].textContent).toContain("COM-CO · Computer Science");
  });

  it("renders active filter chips and handles Clear filters", async () => {
    await renderComponent();

    let selects = container.querySelectorAll(".filter-row select");

    // Select dept-1
    await act(async () => {
      selects[0].value = "dept-1";
      selects[0].dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Active filter chips bar should be rendered
    const chipsBar = container.querySelector(".active-filters-bar");
    expect(chipsBar).not.toBeNull();
    expect(chipsBar.textContent).toContain("Dept: Computer Science");

    // Click "Clear filters" in active filters bar
    const clearBtn = chipsBar.querySelector(".btn-clear-filters");
    expect(clearBtn).not.toBeNull();

    await act(async () => {
      clearBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Dropdown should be reset to All Departments
    selects = container.querySelectorAll(".filter-row select");
    expect(selects[0].value).toBe("");
    expect(container.querySelector(".active-filters-bar")).toBeNull();
  });
});
