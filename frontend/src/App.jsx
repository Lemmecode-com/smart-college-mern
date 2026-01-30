import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

/* ================= AUTH ================= */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/* ================= DASHBOARDS ================= */
import SuperAdminDashboard from "./pages/dashboard/Super-Admin/SuperAdminDashboard";
import CreateNewCollege from "./pages/dashboard/Super-Admin/CreateNewCollege";
import CollegeAdminDashboard from "./pages/dashboard/College-Admin/CollegeAdminDashboard";
import TeacherDashboard from "./pages/dashboard/Teacher/TeacherDashboard";
import StudentDashboard from "./pages/dashboard/Student/StudentDashboard";

/* ================= DEPARTMENTS ================= */
import DepartmentList from "./pages/dashboard/College-Admin/DepartmentList";
import AddDepartment from "./pages/dashboard/College-Admin/AddDepartment";
/* ================= COURSES ================= */
import AddCourse from "./pages/courses/AddCourse";
import CourseList from "./pages/courses/CourseList";

/* ================= STUDENTS ================= */
import AddStudent from "./pages/students/AddStudent";
import StudentList from "./pages/students/StudentList";
import AssignParent from "./pages/students/AssignParent";

/* ================= ATTENDANCE ================= */
import MarkAttendance from "./pages/attendance/MarkAttendance";
import MyAttendance from "./pages/attendance/MyAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";

/* ================= SUBJECTS / TEACHERS ================= */
import SubjectList from "./pages/Subjects/SubjectList";
import AddSubject from "./pages/Subjects/AddSubject";
import TeachersList from "./pages/Teachers/TeachersList";
import AddTeacher from "./pages/Teachers/AddTeacher";
import AssignTeacherSubjects from "./pages/Teachers/AssignTeacherSubjects";
import CollegeList from "./pages/dashboard/Super-Admin/CollegeList";
import CollegeProfile from "./pages/dashboard/College-Admin/CollegeProfile";

export default function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <div className="container-fluid">
        <div className="row">
          {/* ================= SIDEBAR ================= */}
          {user && <Sidebar />}

          <main
            className="col p-0"
            style={{ marginLeft: user ? "260px" : "0" }}
          >
            {user && <Navbar />}

            <div className="p-4">
              <Routes>
                {/* ================= ROOT DECIDER ================= */}
                <Route
                  path="/"
                  element={
                    !user ? (
                      <Navigate to="/login" />
                    ) : user.role === "SUPER_ADMIN" ? (
                      <Navigate to="/super-admin/dashboard" />
                    ) : user.role === "COLLEGE_ADMIN" ? (
                      <Navigate to="/dashboard" />
                    ) : user.role === "TEACHER" ? (
                      <Navigate to="/teacher/dashboard" />
                    ) : user.role === "STUDENT" ? (
                      <Navigate to="/student/dashboard" />
                    ) : (
                      <Navigate to="/login" />
                    )
                  }
                />

                {/* ================= PUBLIC ================= */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* ================= SUPER ADMIN ================= */}
                <Route
                  path="/super-admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/super-admin/create-college"
                  element={
                    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                      <CreateNewCollege />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/super-admin/colleges-list"
                  element={
                    <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                      <CollegeList />
                    </ProtectedRoute>
                  }
                />

                {/* ================= COLLEGE ADMIN ================= */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <CollegeAdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/college/profile"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <CollegeProfile />
                    </ProtectedRoute>
                  }
                />

                {/* ================= TEACHER ================= */}
                <Route
                  path="/teacher/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* ================= STUDENT ================= */}
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                
                {/* ================= DEPARTMENTS ================= */}
                <Route
                  path="/departments"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <DepartmentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/departments/add"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AddDepartment />
                    </ProtectedRoute>
                  }
                />

                {/* ================= COURSES ================= */}
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <CourseList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/add"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AddCourse />
                    </ProtectedRoute>
                  }
                />

                {/* ================= STUDENTS ================= */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/add"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AddStudent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/assign-parent"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AssignParent />
                    </ProtectedRoute>
                  }
                />

                {/* ================= ATTENDANCE ================= */}
                <Route
                  path="/attendance/mark"
                  element={
                    <ProtectedRoute allowedRoles={["TEACHER"]}>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/report"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN", "TEACHER"]}>
                      <AttendanceList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-attendance"
                  element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                      <MyAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* ================= SUBJECTS ================= */}
                <Route
                  path="/subjects"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <SubjectList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subjects/add"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AddSubject />
                    </ProtectedRoute>
                  }
                />

                {/* ================= TEACHERS ================= */}
                <Route
                  path="/teachers"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <TeachersList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/add-teacher"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AddTeacher />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/assign-subjects"
                  element={
                    <ProtectedRoute allowedRoles={["COLLEGE_ADMIN"]}>
                      <AssignTeacherSubjects />
                    </ProtectedRoute>
                  }
                />

                {/* ================= FALLBACK ================= */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
