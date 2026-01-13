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
//     </div>
//   );
// }


import { NavLink } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";

import {
  FaTachometerAlt,
  FaUniversity,
  FaBook,
  FaLayerGroup,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUsers,
  FaClipboardList,
  FaLink,
  FaChevronDown,
  FaChevronUp
} from "react-icons/fa";

export default function Sidebar() {
  const { user } = useContext(AuthContext);

  const [openCollege, setOpenCollege] = useState(true);
  const [openDepartments, setOpenDepartments] = useState(true);
  const [openCourses, setOpenCourses] = useState(true);
  const [openSubjects, setOpenSubjects] = useState(true);
  const [openStudents, setOpenStudents] = useState(true);
  const [openTeachers, setOpenTeachers] = useState(true);
  const [openParents, setOpenParents] = useState(true);

  if (!user) return null;

  const linkClass = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
    color: isActive ? "#0f3a4a" : "#ffffff",
    background: isActive ? "#ffffff" : "transparent",
    marginBottom: "6px"
  });

  const dropdownTitle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
    marginTop: "10px"
  };

  const dropdownContent = {
    marginLeft: "12px",
    display: "flex",
    flexDirection: "column"
  };

  return (
    <div
      style={{
        width: "260px",
        height: "100vh",
        background: "linear-gradient(180deg, #0f3a4a, #134952)",
        padding: "16px",
        position: "fixed",
        overflowY: "auto",
        scrollbarWidth: "thin"
      }}
    >
      <h4 style={{ textAlign: "center", color: "#fff", marginBottom: "20px" }}>
        Smart College
      </h4>

      {/* Dashboard */}
      <NavLink to="/dashboard" style={linkClass}>
        <FaTachometerAlt /> Dashboard
      </NavLink>

      {/* ================= ADMIN / COLLEGE ADMIN ================= */}
      {(user.role === "admin" || user.role === "collegeAdmin") && (
        <>
          {/* College */}
          <div style={dropdownTitle} onClick={() => setOpenCollege(!openCollege)}>
            <span>College</span>
            {openCollege ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openCollege && (
            <div style={dropdownContent}>
              <NavLink to="/college/profile" style={linkClass}>
                <FaUniversity /> College Profile
              </NavLink>
            </div>
          )}

          {/* Departments */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenDepartments(!openDepartments)}
          >
            <span>Departments</span>
            {openDepartments ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openDepartments && (
            <div style={dropdownContent}>
              <NavLink to="/departments" style={linkClass}>
                <FaBook /> View
              </NavLink>
              <NavLink to="/departments/add" style={linkClass}>
                <FaBook /> Add
              </NavLink>
            </div>
          )}

          {/* Courses */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenCourses(!openCourses)}
          >
            <span>Courses</span>
            {openCourses ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openCourses && (
            <div style={dropdownContent}>
              <NavLink to="/courses" style={linkClass}>
                <FaLayerGroup /> View
              </NavLink>
              <NavLink to="/courses/add" style={linkClass}>
                <FaLayerGroup /> Add
              </NavLink>
            </div>
          )}

          {/* Subjects */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenSubjects(!openSubjects)}
          >
            <span>Subjects</span>
            {openSubjects ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openSubjects && (
            <div style={dropdownContent}>
              <NavLink to="/subjects" style={linkClass}>
                <FaBook /> View
              </NavLink>
              <NavLink to="/subjects/add" style={linkClass}>
                <FaBook /> Add
              </NavLink>
            </div>
          )}

          {/* Teachers */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenTeachers(!openTeachers)}
          >
            <span>Teachers</span>
            {openTeachers ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openTeachers && (
            <div style={dropdownContent}>
              <NavLink to="/teachers" style={linkClass}>
                <FaChalkboardTeacher /> View
              </NavLink>
              <NavLink to="/teachers/assign-subjects" style={linkClass}>
                <FaLink /> Assign Subjects
              </NavLink>
            </div>
          )}

          {/* Students */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenStudents(!openStudents)}
          >
            <span>Students</span>
            {openStudents ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openStudents && (
            <div style={dropdownContent}>
              <NavLink to="/students" style={linkClass}>
                <FaUserGraduate /> View
              </NavLink>
              <NavLink to="/students/add" style={linkClass}>
                <FaUserGraduate /> Add
              </NavLink>
              <NavLink to="/students/assign-parent" style={linkClass}>
                <FaLink /> Assign Parent
              </NavLink>
            </div>
          )}

          {/* Parents */}
          <div
            style={dropdownTitle}
            onClick={() => setOpenParents(!openParents)}
          >
            <span>Parents</span>
            {openParents ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {openParents && (
            <div style={dropdownContent}>
              <NavLink to="/parents" style={linkClass}>
                <FaUsers /> View
              </NavLink>
            </div>
          )}
        </>
      )}

      {/* ================= TEACHER ================= */}
      {user.role === "teacher" && (
        <>
          <NavLink to="/attendance/mark" style={linkClass}>
            <FaClipboardList /> Mark Attendance
          </NavLink>
          <NavLink to="/attendance/report" style={linkClass}>
            <FaClipboardList /> Attendance Report
          </NavLink>
        </>
      )}

      {/* ================= STUDENT ================= */}
      {user.role === "student" && (
        <>
          <NavLink to="/student/profile" style={linkClass}>
            <FaUserGraduate /> My Profile
          </NavLink>
          <NavLink to="/student/attendance" style={linkClass}>
            <FaClipboardList /> My Attendance
          </NavLink>
        </>
      )}

      {/* ================= PARENT ================= */}
      {user.role === "parent" && (
        <>
          <NavLink to="/parent/children" style={linkClass}>
            <FaUsers /> My Children
          </NavLink>
          <NavLink to="/parent/attendance" style={linkClass}>
            <FaClipboardList /> Attendance
          </NavLink>
        </>
      )}

      <div style={{ marginTop: "20px", textAlign: "center", color: "#ccc" }}>
        © 2026 Smart College
      </div>
    </div>
  );
}

