import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

/* Auth Pages */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/* Dashboards */
import Dashboard from "./pages/dashboard/Dashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";

/* Admin – Departments */
import AddDepartment from "./pages/departments/AddDepartment";
import DepartmentList from "./pages/departments/DepartmentList";

/* Admin – Courses */
import AddCourse from "./pages/courses/AddCourse";
import CourseList from "./pages/courses/CourseList";

/* Admin – Students */
import AddStudent from "./pages/students/AddStudent";
import StudentList from "./pages/students/StudentList";

/* Attendance */
import MarkAttendance from "./pages/attendance/MarkAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";
import MyAttendance from "./pages/attendance/MyAttendance";

export default function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar only when logged in */}
          {user && <Sidebar />}

          <main className="col p-0">
            {/* Navbar only when logged in */}
            {user && <Navbar />}

            <div className="p-4">
              <Routes>
                {/* Root Redirect */}
                <Route
                  path="/"
                  element={
                    <Navigate to={user ? "/dashboard" : "/login"} />
                  }
                />

                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      {user?.role === "student" ? (
                        <StudentDashboard />
                      ) : (
                        <Dashboard />
                      )}
                    </ProtectedRoute>
                  }
                />

                {/* ================= ADMIN ROUTES ================= */}

                {/* Departments */}
                <Route
                  path="/departments"
                  element={
                    <ProtectedRoute>
                      <DepartmentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/departments/add"
                  element={
                    <ProtectedRoute>
                      <AddDepartment />
                    </ProtectedRoute>
                  }
                />

                {/* Courses */}
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute>
                      <CourseList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/add"
                  element={
                    <ProtectedRoute>
                      <AddCourse />
                    </ProtectedRoute>
                  }
                />

                {/* Students */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/add"
                  element={
                    <ProtectedRoute>
                      <AddStudent />
                    </ProtectedRoute>
                  }
                />

                {/* ================= ATTENDANCE ROUTES ================= */}

                {/* Teacher / Admin */}
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/list"
                  element={
                    <ProtectedRoute>
                      <AttendanceList />
                    </ProtectedRoute>
                  }
                />

                {/* Student */}
                <Route
                  path="/my-attendance"
                  element={
                    <ProtectedRoute>
                      <MyAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
