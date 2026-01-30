// import { NavLink } from "react-router-dom";
// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";

// export default function Sidebar() {
//   const { user } = useContext(AuthContext);

//   if (!user) return null;

//   const linkClass = ({ isActive }) =>
//     `nav-link text-white ${isActive ? "fw-bold bg-secondary rounded" : ""}`;

//   return (
//     <div className="col-md-3 col-lg-2 bg-dark min-vh-100 p-3">
//       <h5 className="text-center text-white mb-4">Smart College</h5>

//       {/* Common */}
//       <NavLink to="/dashboard" className={linkClass}>
//         Dashboard
//       </NavLink>

//       {/* ================= ADMIN ================= */}
//       {user.role === "admin" && (
//         <>
//           <hr className="text-secondary" />

//           <small className="text-secondary">ADMIN</small>

//           {/* Departments */}
//           <NavLink to="/departments" className={linkClass}>
//             Departments
//           </NavLink>
//           <NavLink to="/departments/add" className={linkClass}>
//             Add Department
//           </NavLink>

//           {/* Courses */}
//           <NavLink to="/courses" className={linkClass}>
//             Courses
//           </NavLink>
//           <NavLink to="/courses/add" className={linkClass}>
//             Add Course
//           </NavLink>

//           {/* Students */}
//           <NavLink to="/students" className={linkClass}>
//             Students
//           </NavLink>
//           <NavLink to="/students/add" className={linkClass}>
//             Add Student
//           </NavLink>

//           {/* Attendance */}
//           <NavLink to="/attendance/list" className={linkClass}>
//             Attendance Records
//           </NavLink>
//         </>
//       )}

//       {/* ================= TEACHER ================= */}
//       {user.role === "teacher" && (
//         <>
//           <hr className="text-secondary" />

//           <small className="text-secondary">TEACHER</small>

//           <NavLink to="/attendance" className={linkClass}>
//             Mark Attendance
//           </NavLink>
//           <NavLink to="/attendance/list" className={linkClass}>
//             Attendance Records
//           </NavLink>
//         </>
//       )}

//       {/* ================= STUDENT ================= */}
//       {user.role === "student" && (
//         <>
//           <hr className="text-secondary" />

//           <small className="text-secondary">STUDENT</small>

//           <NavLink to="/my-attendance" className={linkClass}>
//             My Attendance
//           </NavLink>
//         </>
//       )}

//       {/* ================= PARENT ================= */}
//       {user.role === "parent" && (
//         <>
//           <NavLink to="/parent/attendance">Child Attendance</NavLink>
//         </>
//       )}
//     </div>
//   );
// }

// import { NavLink } from "react-router-dom";
// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";

// export default function Sidebar() {
//   const { user } = useContext(AuthContext);
//   if (!user) return null;

//   const linkClass = ({ isActive }) =>
//     `nav-link text-white ${isActive ? "fw-bold bg-secondary rounded" : ""}`;

//   return (
//     <div className="col-md-3 col-lg-2 bg-dark min-vh-100 p-3">
//       <h5 className="text-center text-white mb-4">Smart College</h5>
//       <NavLink to="/dashboard" className={linkClass}>
//         Dashboard
//       </NavLink>
//       {["admin", "collegeAdmin"].includes(user.role) && (
//         <>
//           <hr />
//           <NavLink to="/departments" className={linkClass}>
//             Departments
//           </NavLink>
//           <NavLink to="/courses" className={linkClass}>
//             Courses
//           </NavLink>
//           <NavLink to="/students" className={linkClass}>
//             Students
//           </NavLink>
//           <NavLink to="/attendance/list" className={linkClass}>
//             Attendance
//           </NavLink>
//         </>
//       )}
//       {user.role === "teacher" && (
//         <>
//           <hr />
//           <NavLink to="/attendance" className={linkClass}>
//             Mark Attendance
//           </NavLink>
//           <NavLink to="/attendance/list" className={linkClass}>
//             Records
//           </NavLink>
//         </>
//       )}
//       {user.role === "student" && (
//         <>
//           <hr />
//           <NavLink to="/my-attendance" className={linkClass}>
//             My Attendance
//           </NavLink>
//           <NavLink to="/add-parent" className={linkClass}>
//             Add Parent
//           </NavLink>
//         </>
//       )}
//       {user.role === "parent" && (
//         <>
//           <NavLink to="/parent/dashboard" className={linkClass}>
//             Child Profile
//           </NavLink>
//           <NavLink to="/parent/attendance" className={linkClass}>
//             Attendance
//           </NavLink>
//         </>
//       )}
//     </div>
//   );
// }




import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  const linkClass = ({ isActive }) =>
    `nav-link text-white px-3 py-2 mb-1 ${
      isActive ? "bg-secondary fw-bold rounded" : ""
    }`;

  return (
    <div className="col-md-3 col-lg-2 bg-dark min-vh-100 p-3">
      <h5 className="text-center text-white mb-4">Smart College</h5>

      {/* Common */}
      <NavLink to="/dashboard" className={linkClass}>
        Dashboard
      </NavLink>

      {/* ================= ADMIN / COLLEGE ADMIN ================= */}
      {["admin", "collegeAdmin"].includes(user.role) && (
        <>
          <hr className="text-secondary" />
          <small className="text-secondary">MANAGEMENT</small>

          <NavLink to="/college-profile" className={linkClass}>
            College Profile
          </NavLink>

          <NavLink to="/departments" className={linkClass}>
            Departments
          </NavLink>

          <NavLink to="/courses" className={linkClass}>
            Courses
          </NavLink>

          <NavLink to="/students" className={linkClass}>
            Students
          </NavLink>

          <NavLink to="/teachers/assign" className={linkClass}>
            Assign Subjects
          </NavLink>

          <NavLink to="/attendance/list" className={linkClass}>
            Attendance Records
          </NavLink>
        </>
      )}

      {/* ================= TEACHER ================= */}
      {user.role === "teacher" && (
        <>
          <hr className="text-secondary" />
          <small className="text-secondary">TEACHER</small>

          <NavLink to="/teacher/students" className={linkClass}>
            My Students
          </NavLink>

          <NavLink to="/attendance" className={linkClass}>
            Mark Attendance
          </NavLink>

          <NavLink to="/attendance/list" className={linkClass}>
            Attendance Records
          </NavLink>
        </>
      )}

      {/* ================= STUDENT ================= */}
      {user.role === "student" && (
        <>
          <hr className="text-secondary" />
          <small className="text-secondary">STUDENT</small>

          <NavLink to="/student/profile" className={linkClass}>
            My Profile
          </NavLink>

          <NavLink to="/my-attendance" className={linkClass}>
            My Attendance
          </NavLink>

          <NavLink to="/add-parent" className={linkClass}>
            Add Parent
          </NavLink>
        </>
      )}

      {/* ================= PARENT ================= */}
      {user.role === "parent" && (
        <>
          <hr className="text-secondary" />
          <small className="text-secondary">PARENT</small>

          <NavLink to="/parent/dashboard" className={linkClass}>
            Child Profile
          </NavLink>

          <NavLink to="/parent/attendance" className={linkClass}>
            Child Attendance
          </NavLink>
        </>
      )}
    </div>
  );
}
