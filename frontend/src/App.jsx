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
//                   element={
//                     <Navigate to={user ? "/dashboard" : "/login"} />
//                   }
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

//                 {/* Student */}
//                 <Route
//                   path="/my-attendance"
//                   element={
//                     <ProtectedRoute>
//                       <MyAttendance />
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
// import MyAttendance from "./pages/attendance/MyAttendance";
// import ParentDashboard from "./pages/dashboard/ParentDashboard";
// import ChildAttendance from "./pages/attendance/ChildAttendance";

// /* 🔹 PLACEHOLDERS */
// import AttendanceList from "./pages/attendance/AttendanceList";
// import ComingSoon from "./common/ComingSoon";
// import CollegeProfile from "./pages/college/CollegeProfile";
// import SubjectList from "./pages/Subjects/SubjectList";
// import AddSubject from "./pages/Subjects/AddSubject";
// import TeachersList from "./pages/Teachers/TeachersList";
// import AddTeacher from "./pages/Teachers/AddTeacher";
// import AddParent from "./pages/students/AddParent";

// export default function App() {
//   const { user } = useContext(AuthContext);

//   return (
//     <BrowserRouter>
//       <div className="container-fluid">
//         <div className="row">
//           {user && <Sidebar />}

//           {/* 🔹 FIXED OFFSET FOR SIDEBAR */}
//           <main
//             className="col p-0"
//             style={{ marginLeft: user ? "260px" : "0" }}
//           >
//             {user && <Navbar />}

//             <div className="p-4">
//               <Routes>
//                 {/* Root */}
//                 <Route
//                   path="/"
//                   element={<Navigate to={user ? "/dashboard" : "/login"} />}
//                 />

//                 {/* Public */}
//                 <Route path="/login" element={<Login />} />
//                 <Route path="/register" element={<Register />} />

//                 {/* Dashboard */}
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

//                 {/* ===== ADMIN ===== */}
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

//                 {/* ===== ATTENDANCE ===== */}
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
//                 <Route
//                   path="/my-attendance"
//                   element={
//                     <ProtectedRoute>
//                       <MyAttendance />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* ===== NEW SIDEBAR ROUTES (PLACEHOLDER) ===== */}
//                 <Route
//                   path="/college/profile"
//                   element={
//                     <ProtectedRoute>
//                       <CollegeProfile title="College Profile" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/subjects"
//                   element={
//                     <ProtectedRoute>
//                       <SubjectList title="Subjects" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/subjects/add"
//                   element={
//                     <ProtectedRoute>
//                       <AddSubject title="Add Subject" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/teachers"
//                   element={
//                     <ProtectedRoute>
//                       <TeachersList title="Teachers" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/teachers/assign-subjects"
//                   element={
//                     <ProtectedRoute>
//                       <AddTeacher title="Assign Subjects" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/parents"
//                   element={
//                     <ProtectedRoute>
//                       <ComingSoon title="Parents" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/students/assign-parent"
//                   element={
//                     <ProtectedRoute>
//                       <AddParent title="Assign Parent" />
//                     </ProtectedRoute>
//                   }
//                 />

//                 {/* Student / Parent */}
//                 <Route
//                   path="/student/profile"
//                   element={
//                     <ProtectedRoute>
//                       <ComingSoon title="Student Profile" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/parent/children"
//                   element={
//                     <ProtectedRoute>
//                       <ComingSoon title="My Children" />
//                     </ProtectedRoute>
//                   }
//                 />
//                 <Route
//                   path="/parent/attendance"
//                   element={
//                     <ProtectedRoute>
//                       <ComingSoon title="Child Attendance" />
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
import ParentDashboard from "./pages/dashboard/ParentDashboard";

/* Admin – Departments */
import AddDepartment from "./pages/departments/AddDepartment";
import DepartmentList from "./pages/departments/DepartmentList";

/* Admin – Courses */
import AddCourse from "./pages/courses/AddCourse";
import CourseList from "./pages/courses/CourseList";

/* Admin – Students */
import AddStudent from "./pages/students/AddStudent";
import StudentList from "./pages/students/StudentList";
import AddParent from "./pages/students/AddParent";

/* Attendance */
import MarkAttendance from "./pages/attendance/MarkAttendance";
import MyAttendance from "./pages/attendance/MyAttendance";
import AttendanceList from "./pages/attendance/AttendanceList";
import ChildAttendance from "./pages/attendance/ChildAttendance";

/* Others */
import ComingSoon from "./common/ComingSoon";
import CollegeProfile from "./pages/college/CollegeProfile";
import SubjectList from "./pages/Subjects/SubjectList";
import AddSubject from "./pages/Subjects/AddSubject";
import TeachersList from "./pages/Teachers/TeachersList";
import AddTeacher from "./pages/Teachers/AddTeacher";

export default function App() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <div className="container-fluid">
        <div className="row">
          {user && <Sidebar />}

          <main
            className="col p-0"
            style={{ marginLeft: user ? "260px" : "0" }}
          >
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

                {/* ADMIN */}
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
                <Route
                  path="/students/assign-parent"
                  element={
                    <ProtectedRoute>
                      <AddParent />
                    </ProtectedRoute>
                  }
                />

                {/* Attendance */}
                <Route
                  path="/attendance/mark"
                  element={
                    <ProtectedRoute>
                      <MarkAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/report"
                  element={
                    <ProtectedRoute>
                      <AttendanceList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-attendance"
                  element={
                    <ProtectedRoute>
                      <MyAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent/attendance"
                  element={
                    <ProtectedRoute>
                      <ChildAttendance />
                    </ProtectedRoute>
                  }
                />

                {/* College / Subjects / Teachers */}
                <Route
                  path="/college/profile"
                  element={
                    <ProtectedRoute>
                      <CollegeProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subjects"
                  element={
                    <ProtectedRoute>
                      <SubjectList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subjects/add"
                  element={
                    <ProtectedRoute>
                      <AddSubject />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers"
                  element={
                    <ProtectedRoute>
                      <TeachersList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teachers/assign-subjects"
                  element={
                    <ProtectedRoute>
                      <AddTeacher />
                    </ProtectedRoute>
                  }
                />

                {/* Student / Parent */}
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute>
                      <ComingSoon title="Student Profile" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent/children"
                  element={
                    <ProtectedRoute>
                      <ComingSoon title="My Children" />
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
