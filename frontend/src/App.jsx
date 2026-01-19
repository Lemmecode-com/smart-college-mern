// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { useContext } from "react";

// import { AuthContext } from "./auth/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Sidebar from "./components/Sidebar";
// import Navbar from "./components/Navbar";

// /* Auth Pages */
// import Login from "./pages/auth/Login";
// import Register from "./pages/auth/Register";

// /* Dashboards */
// import Dashboard from "./pages/dashboard/Dashboard";
// import StudentDashboard from "./pages/dashboard/StudentDashboard";

// /* Admin – Departments */
// import AddDepartment from "./pages/departments/AddDepartment";
// import DepartmentList from "./pages/departments/DepartmentList";

// /* Admin – Courses */
// import AddCourse from "./pages/courses/AddCourse";
// import CourseList from "./pages/courses/CourseList";

// /* Admin – Students */
// import AddStudent from "./pages/students/AddStudent";
// import StudentList from "./pages/students/StudentList";

// /* Attendance */
// import MarkAttendance from "./pages/attendance/MarkAttendance";
// import AttendanceList from "./pages/attendance/AttendanceList";
// import MyAttendance from "./pages/attendance/MyAttendance";
// import ParentDashboard from "./pages/dashboard/ParentDashboard";
// import AddParent from "./pages/students/AddParent";
// import ChildAttendance from "./pages/attendance/ChildAttendance";

// export default function App() {
//   const { user } = useContext(AuthContext);

//   return (
//     <BrowserRouter>
//       <div className="container-fluid">
//         <div className="row">
//           {/* Sidebar only when logged in */}
//           {user && <Sidebar />}

//           <main className="col p-0">
//             {/* Navbar only when logged in */}
//             {user && <Navbar />}

//             <div className="p-4">
//               <Routes>
//                 {/* Root Redirect */}
//                 <Route
//                   path="/"
//                   element={<Navigate to={user ? "/dashboard" : "/login"} />}
//                 />

//                 {/* Public Routes */}
//                 <Route path="/login" element={<Login />} />
//                 <Route path="/register" element={<Register />} />

//                 {/* Protected Routes */}
//                 <Route
//                   path="/dashboard"
//                   element={
//                     <ProtectedRoute>
//                       {user?.role === "student" ? (
//                         <StudentDashboard />
//                       ) : (
//                         <Dashboard />
//                       )}
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* ================= ADMIN ROUTES ================= */}

//                 {/* Departments */}
//                 <Route
//                   path="/departments"
//                   element={
//                     <ProtectedRoute>
//                       <DepartmentList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/departments/add"
//                   element={
//                     <ProtectedRoute>
//                       <AddDepartment />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Courses */}
//                 <Route
//                   path="/courses"
//                   element={
//                     <ProtectedRoute>
//                       <CourseList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/courses/add"
//                   element={
//                     <ProtectedRoute>
//                       <AddCourse />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Students */}
//                 <Route
//                   path="/students"
//                   element={
//                     <ProtectedRoute>
//                       <StudentList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/students/add"
//                   element={
//                     <ProtectedRoute>
//                       <AddStudent />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* ================= ATTENDANCE ROUTES ================= */}

//                 {/* Teacher / Admin */}
//                 <Route
//                   path="/attendance"
//                   element={
//                     <ProtectedRoute>
//                       <MarkAttendance />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/attendance/list"
//                   element={
//                     <ProtectedRoute>
//                       <AttendanceList />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/*========== Student ===========*/}
//                 <Route
//                   path="/my-attendance"
//                   element={
//                     <ProtectedRoute>
//                       <MyAttendance />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route
//                   path="/add-parent"
//                   element={
//                     <ProtectedRoute roles={["student"]}>
//                       <AddParent />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* PARENT ROUTES */}
//                 <Route
//                   path="/parent/dashboard"
//                   element={
//                     <ProtectedRoute roles={["parent"]}>
//                       <ParentDashboard />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/parent/attendance"
//                   element={
//                     <ProtectedRoute roles={["parent"]}>
//                       <ChildAttendance />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Fallback */}
//                 <Route path="*" element={<Navigate to="/" />} />
//               </Routes>
//             </div>
//           </main>
//         </div>
//       </div>
//     </BrowserRouter>
//   );
// }

// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { useContext } from "react";

// import { AuthContext } from "./auth/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Sidebar from "./components/Sidebar";
// import Navbar from "./components/Navbar";

// /* Auth */
// import Login from "./pages/auth/Login";
// import Register from "./pages/auth/Register";

// /* Dashboards */
// import Dashboard from "./pages/dashboard/Dashboard";
// import StudentDashboard from "./pages/dashboard/StudentDashboard";
// import ParentDashboard from "./pages/dashboard/ParentDashboard";

// /* Departments */
// import AddDepartment from "./pages/departments/AddDepartment";
// import DepartmentList from "./pages/departments/DepartmentList";

// /* Courses */
// import AddCourse from "./pages/courses/AddCourse";
// import CourseList from "./pages/courses/CourseList";

// /* Students */
// import AddStudent from "./pages/students/AddStudent";
// import StudentList from "./pages/students/StudentList";
// import AddParent from "./pages/students/AddParent";

// /* Attendance */
// import MarkAttendance from "./pages/attendance/MarkAttendance";
// import AttendanceList from "./pages/attendance/AttendanceList";
// import MyAttendance from "./pages/attendance/MyAttendance";
// import ChildAttendance from "./pages/attendance/ChildAttendance";
// import CollegeProfile from "./pages/college/CollegeProfile";
// import AssignSubjects from "./pages/teacher/AssignSubjects";
// import AssignParent from "./pages/students/AssignParent";
// import TeacherStudents from "./pages/students/TeacherStudents";
// import StudentProfile from "./pages/students/StudentProfile";

// export default function App() {
//   const { user } = useContext(AuthContext);

//   return (
//     <BrowserRouter>
//       <div className="container-fluid">
//         <div className="row">
//           {user && <Sidebar />}

//           <main className="col p-0">
//             {user && <Navbar />}

//             <div className="p-4">
//               <Routes>
//                 <Route
//                   path="/"
//                   element={<Navigate to={user ? "/dashboard" : "/login"} />}
//                 />

//                 {/* Public */}
//                 <Route path="/login" element={<Login />} />
//                 <Route path="/register" element={<Register />} />

//                 {/* Dashboards */}
//                 <Route
//                   path="/dashboard"
//                   element={
//                     <ProtectedRoute>
//                       {user?.role === "student" ? (
//                         <StudentDashboard />
//                       ) : user?.role === "parent" ? (
//                         <ParentDashboard />
//                       ) : (
//                         <Dashboard />
//                       )}
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Admin / CollegeAdmin */}
//                 <Route
//                   path="/departments"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <DepartmentList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/departments/add"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <AddDepartment />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route
//                   path="/courses"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <CourseList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/courses/add"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <AddCourse />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route
//                   path="/students"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <StudentList />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/students/add"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <AddStudent />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Attendance */}
//                 <Route
//                   path="/attendance"
//                   element={
//                     <ProtectedRoute roles={["teacher"]}>
//                       <MarkAttendance />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/attendance/list"
//                   element={
//                     <ProtectedRoute
//                       roles={["admin", "collegeAdmin", "teacher"]}
//                     >
//                       <AttendanceList />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Student */}
//                 <Route
//                   path="/my-attendance"
//                   element={
//                     <ProtectedRoute roles={["student"]}>
//                       <MyAttendance />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/add-parent"
//                   element={
//                     <ProtectedRoute roles={["student"]}>
//                       <AddParent />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Parent */}
//                 <Route
//                   path="/parent/attendance"
//                   element={
//                     <ProtectedRoute roles={["parent"]}>
//                       <ChildAttendance />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Collge */}
//                 <Route
//                   path="/college-profile"
//                   element={
//                     <ProtectedRoute>
//                       <CollegeProfile />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Assign subject to teacher */}
//                 <Route
//                   path="/teachers/assign"
//                   element={
//                     <ProtectedRoute roles={["admin", "collegeAdmin"]}>
//                       <AssignSubjects />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Assign parent to student */}
//                 <Route
//                   path="/students/:id/assign-parent"
//                   element={
//                     <ProtectedRoute>
//                       <AssignParent />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route
//                   path="/teacher/students"
//                   element={
//                     <ProtectedRoute roles={["teacher"]}>
//                       <TeacherStudents />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route
//                   path="/student/profile"
//                   element={
//                     <ProtectedRoute roles={["student"]}>
//                       <StudentProfile />
//                     </ProtectedRoute>
//                   }
//                 />

//                 <Route path="*" element={<Navigate to="/" />} />
//               </Routes>
//             </div>
//           </main>
//         </div>
//       </div>
//     </BrowserRouter>
//   );
// }





import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

/* Auth */
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/* Dashboards */
import Dashboard from "./pages/dashboard/Dashboard";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import ParentDashboard from "./pages/dashboard/ParentDashboard";

/* College */
import CollegeProfile from "./pages/college/CollegeProfile";

/* Departments */
import AddDepartment from "./pages/departments/AddDepartment";
import DepartmentList from "./pages/departments/DepartmentList";

/* Courses */
import AddCourse from "./pages/courses/AddCourse";
import CourseList from "./pages/courses/CourseList";

/* Students */
import AddStudent from "./pages/students/AddStudent";
import StudentList from "./pages/students/StudentList";
import StudentProfile from "./pages/students/StudentProfile";
import AssignParent from "./pages/students/AssignParent";
import AddParent from "./pages/students/AddParent";
import TeacherStudents from "./pages/students/TeacherStudents";

/* Teachers */
import AssignSubjects from "./pages/teacher/AssignSubjects";

/* Attendance */
import MarkAttendance from "./pages/attendance/MarkAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";
import MyAttendance from "./pages/attendance/MyAttendance";
import ChildAttendance from "./pages/attendance/ChildAttendance";

export default function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <div className="container-fluid">
        <div className="row">
          {user && <Sidebar />}

          <main className="col p-0">
            {user && <Navbar />}

            <div className="p-4">
              <Routes>
                {/* Root */}
                <Route
                  path="/"
                  element={<Navigate to={user ? "/dashboard" : "/login"} />}
                />

                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      {user?.role === "student" ? (
                        <StudentDashboard />
                      ) : user?.role === "parent" ? (
                        <ParentDashboard />
                      ) : (
                        <Dashboard />
                      )}
                    </ProtectedRoute>
                  }
                />

                {/* College */}
                <Route
                  path="/college-profile"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <CollegeProfile />
                    </ProtectedRoute>
                  }
                />

                {/* Departments */}
                <Route
                  path="/departments"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <DepartmentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/departments/add"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <AddDepartment />
                    </ProtectedRoute>
                  }
                />

                {/* Courses */}
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <CourseList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/add"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <AddCourse />
                    </ProtectedRoute>
                  }
                />

                {/* Students */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/add"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <AddStudent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students/:id/assign-parent"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <AssignParent />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher */}
                <Route
                  path="/teachers/assign"
                  element={
                    <ProtectedRoute roles={["admin", "collegeAdmin"]}>
                      <AssignSubjects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/students"
                  element={
                    <ProtectedRoute roles={["teacher"]}>
                      <TeacherStudents />
                    </ProtectedRoute>
                  }
                />

                {/* Attendance */}
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute roles={["teacher"]}>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/list"
                  element={
                    <ProtectedRoute
                      roles={["admin", "collegeAdmin", "teacher"]}
                    >
                      <AttendanceList />
                    </ProtectedRoute>
                  }
                />

                {/* Student */}
                <Route
                  path="/my-attendance"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <MyAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/add-parent"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <AddParent />
                    </ProtectedRoute>
                  }
                />

                {/* Parent */}
                <Route
                  path="/parent/dashboard"
                  element={
                    <ProtectedRoute roles={["parent"]}>
                      <ParentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent/attendance"
                  element={
                    <ProtectedRoute roles={["parent"]}>
                      <ChildAttendance />
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
