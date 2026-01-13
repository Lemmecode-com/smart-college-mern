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
  `nav-link text-white d-flex align-items-center px-3  py-2 rounded mb-1 sidebar-link  ${
    isActive ? "fw-bold active-link" : ""
  }`;


  return (

    
    <div className="col-md-3 col-lg-2  min-vh-100 p-3 d-flex flex-column sidebar" style={{background: "linear-gradient(180deg, #0f3a4a, #134952)"}}>

      <style>
{`
  .active-link {
    background-color: #1d515a !important;
  }
`}
</style>

      <h5 className="text-center text-white mb-4 fw-bold">
        Smart College
      </h5>

      {/* Common */}
      <NavLink to="/dashboard" className={linkClass}>
        Dashboard
      </NavLink>

      {user.role === "admin" && (
        <>
          <hr className="text-secondary my-3" />

          <small className="text-secondary text-uppercase fw-semibold mb-2">
            Admin
          </small>

          {/* Departments */}
          <NavLink to="/departments" className={linkClass}>
            Departments
          </NavLink>
          <NavLink to="/departments/add" className={linkClass}>
            Add Department
          </NavLink>

          {/* Courses */}
          <NavLink to="/courses" className={linkClass}>
            Courses
          </NavLink>
          <NavLink to="/courses/add" className={linkClass}>
            Add Course
          </NavLink>

          {/* Students */}
          <NavLink to="/students" className={linkClass}>
            Students
          </NavLink>
          <NavLink to="/students/add" className={linkClass}>
            Add Student
          </NavLink>

          {/* Attendance */}
          <NavLink to="/attendance/list" className={linkClass}>
            Attendance Records
          </NavLink>
        </>
      )}

      {/* ================= TEACHER ================= */}
      {user.role === "teacher" && (
        <>
          <hr className="text-secondary my-3" />

          <small className="text-secondary text-uppercase fw-semibold mb-2">
            Teacher
          </small>

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
          <hr className="text-secondary my-3" />

          <small className="text-secondary text-uppercase fw-semibold mb-2">
            Student
          </small>

          <NavLink to="/my-attendance" className={linkClass}>
            My Attendance
          </NavLink>
        </>
      )}

      {/* ================= PARENT ================= */}
      {user.role === "parent" && (
        <>
          <NavLink to="/parent/attendance">Child Attendance</NavLink>
        </>
      )}
    </div>
  );
}
