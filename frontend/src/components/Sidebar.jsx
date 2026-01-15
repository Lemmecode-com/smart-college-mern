// import { NavLink } from "react-router-dom";
// import { useContext, useState } from "react";
// import { AuthContext } from "../auth/AuthContext";

// import {
//   FaTachometerAlt,
//   FaUniversity,
//   FaBook,
//   FaLayerGroup,
//   FaUserGraduate,
//   FaChalkboardTeacher,
//   FaUsers,
//   FaClipboardList,
//   FaLink,
//   FaChevronDown,
//   FaChevronUp
// } from "react-icons/fa";

// export default function Sidebar() {
//   const { user } = useContext(AuthContext);

//   const [openCollege, setOpenCollege] = useState(true);
//   const [openDepartments, setOpenDepartments] = useState(true);
//   const [openCourses, setOpenCourses] = useState(true);
//   const [openSubjects, setOpenSubjects] = useState(true);
//   const [openStudents, setOpenStudents] = useState(true);
//   const [openTeachers, setOpenTeachers] = useState(true);
//   const [openParents, setOpenParents] = useState(true);

//   if (!user) return null;

//   const linkClass = ({ isActive }) => ({
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//     padding: "10px 14px",
//     borderRadius: "8px",
//     textDecoration: "none",
//     fontWeight: "500",
//     color: isActive ? "#0f3a4a" : "#ffffff",
//     background: isActive ? "#ffffff" : "transparent",
//     marginBottom: "6px"
//   });

//   const dropdownTitle = {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: "10px 12px",
//     color: "#ffffff",
//     cursor: "pointer",
//     fontWeight: "600",
//     marginTop: "10px"
//   };

//   const dropdownContent = {
//     marginLeft: "12px",
//     display: "flex",
//     flexDirection: "column"
//   };

//   return (
//     <div
//       style={{
//         width: "260px",
//         height: "100vh",
//         background: "linear-gradient(180deg, #0f3a4a, #134952)",
//         padding: "16px",
//         position: "fixed",
//         overflowY: "auto"
//       }}
//     >
//       <h4 style={{ textAlign: "center", color: "#fff", marginBottom: "20px" }}>
//         Smart College
//       </h4>

//       <NavLink to="/dashboard" style={linkClass}>
//         <FaTachometerAlt /> Dashboard
//       </NavLink>

//       {(user.role === "admin" || user.role === "collegeAdmin") && (
//         <>
//           {/* College */}
//           <div style={dropdownTitle} onClick={() => setOpenCollege(!openCollege)}>
//             <span>College</span>
//             {openCollege ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openCollege && (
//             <div style={dropdownContent}>
//               <NavLink to="/college/profile" style={linkClass}>
//                 <FaUniversity /> College Profile
//               </NavLink>
//             </div>
//           )}

//           {/* Departments */}
//           <div style={dropdownTitle} onClick={() => setOpenDepartments(!openDepartments)}>
//             <span>Departments</span>
//             {openDepartments ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openDepartments && (
//             <div style={dropdownContent}>
//               <NavLink to="/departments" style={linkClass}>
//                 <FaBook /> View
//               </NavLink>
//               <NavLink to="/departments/add" style={linkClass}>
//                 <FaBook /> Add
//               </NavLink>
//             </div>
//           )}

//           {/* Courses */}
//           <div style={dropdownTitle} onClick={() => setOpenCourses(!openCourses)}>
//             <span>Courses</span>
//             {openCourses ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openCourses && (
//             <div style={dropdownContent}>
//               <NavLink to="/courses" style={linkClass}>
//                 <FaLayerGroup /> View
//               </NavLink>
//               <NavLink to="/courses/add" style={linkClass}>
//                 <FaLayerGroup /> Add
//               </NavLink>
//             </div>
//           )}

//           {/* Subjects */}
//           <div style={dropdownTitle} onClick={() => setOpenSubjects(!openSubjects)}>
//             <span>Subjects</span>
//             {openSubjects ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openSubjects && (
//             <div style={dropdownContent}>
//               <NavLink to="/subjects" style={linkClass}>
//                 <FaBook /> View
//               </NavLink>
//               <NavLink to="/subjects/add" style={linkClass}>
//                 <FaBook /> Add
//               </NavLink>
//             </div>
//           )}

//           {/* Teachers */}
//           <div style={dropdownTitle} onClick={() => setOpenTeachers(!openTeachers)}>
//             <span>Teachers</span>
//             {openTeachers ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openTeachers && (
//             <div style={dropdownContent}>
//               <NavLink to="/teachers" style={linkClass}>
//                 <FaChalkboardTeacher /> View
//               </NavLink>
//               <NavLink to="/teachers/assign-subjects" style={linkClass}>
//                 <FaLink /> Assign Subjects
//               </NavLink>
//             </div>
//           )}

//           {/* Students */}
//           <div style={dropdownTitle} onClick={() => setOpenStudents(!openStudents)}>
//             <span>Students</span>
//             {openStudents ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openStudents && (
//             <div style={dropdownContent}>
//               <NavLink to="/students" style={linkClass}>
//                 <FaUserGraduate /> View
//               </NavLink>
//               <NavLink to="/students/add" style={linkClass}>
//                 <FaUserGraduate /> Add
//               </NavLink>
//               <NavLink to="/students/assign-parent" style={linkClass}>
//                 <FaLink /> Assign Parent
//               </NavLink>
//             </div>
//           )}

//           {/* Parents */}
//           <div style={dropdownTitle} onClick={() => setOpenParents(!openParents)}>
//             <span>Parents</span>
//             {openParents ? <FaChevronUp /> : <FaChevronDown />}
//           </div>
//           {openParents && (
//             <div style={dropdownContent}>
//               <NavLink to="/parents" style={linkClass}>
//                 <FaUsers /> View
//               </NavLink>
//             </div>
//           )}
//         </>
//       )}

//       {user.role === "teacher" && (
//         <>
//           <NavLink to="/attendance/mark" style={linkClass}>
//             <FaClipboardList /> Mark Attendance
//           </NavLink>
//           <NavLink to="/attendance/report" style={linkClass}>
//             <FaClipboardList /> Attendance Report
//           </NavLink>
//         </>
//       )}

//       {user.role === "student" && (
//         <>
//           <NavLink to="/student/profile" style={linkClass}>
//             <FaUserGraduate /> My Profile
//           </NavLink>
//           <NavLink to="/my-attendance" style={linkClass}>
//             <FaClipboardList /> My Attendance
//           </NavLink>
//         </>
//       )}

//       {user.role === "parent" && (
//         <>
//           <NavLink to="/parent/children" style={linkClass}>
//             <FaUsers /> My Children
//           </NavLink>
//           <NavLink to="/parent/attendance" style={linkClass}>
//             <FaClipboardList /> Attendance
//           </NavLink>
//         </>
//       )}

//       <div style={{ marginTop: "20px", textAlign: "center", color: "#ccc" }}>
//         © 2026 Smart College
//       </div>
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
  FaChevronDown
} from "react-icons/fa";

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState({
    college: true,
    departments: true,
    courses: true,
    subjects: true,
    teachers: true,
    students: true,
    parents: true
  });

  if (!user) return null;

  const toggle = (key) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const navLink = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    color: isActive ? "#0f3a4a" : "#e6f2f5",
    background: isActive ? "#ffffff" : "transparent",
    transition: "all 0.3s ease"
  });

  const sectionTitle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    marginTop: "14px",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none"
  };

  const sectionBody = (isOpen) => ({
    maxHeight: isOpen ? "500px" : "0px",
    overflow: "hidden",
    transition: "max-height 0.4s ease",
    marginLeft: "10px"
  });

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        background: "linear-gradient(180deg, #0f3a4a, #134952)",
        padding: "20px 14px",
        overflowY: "auto"
      }}
    >
      {/* Logo */}
      <div
        style={{
          textAlign: "center",
          fontSize: "20px",
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: "24px"
        }}
      >
        Smart College
      </div>

      {/* Dashboard */}
      <NavLink to="/dashboard" style={navLink}>
        <FaTachometerAlt /> Dashboard
      </NavLink>

      {/* ADMIN / COLLEGE ADMIN */}
      {(user.role === "admin" || user.role === "collegeAdmin") && (
        <>
          {/* College */}
          <div style={sectionTitle} onClick={() => toggle("college")}>
            College <FaChevronDown style={{ transform: open.college ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.college)}>
            <NavLink to="/college/profile" style={navLink}>
              <FaUniversity /> College Profile
            </NavLink>
          </div>

          {/* Departments */}
          <div style={sectionTitle} onClick={() => toggle("departments")}>
            Departments <FaChevronDown style={{ transform: open.departments ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.departments)}>
            <NavLink to="/departments" style={navLink}>
              <FaBook /> View Departments
            </NavLink>
            <NavLink to="/departments/add" style={navLink}>
              <FaBook /> Add Department
            </NavLink>
          </div>

          {/* Courses */}
          <div style={sectionTitle} onClick={() => toggle("courses")}>
            Courses <FaChevronDown style={{ transform: open.courses ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.courses)}>
            <NavLink to="/courses" style={navLink}>
              <FaLayerGroup /> View Courses
            </NavLink>
            <NavLink to="/courses/add" style={navLink}>
              <FaLayerGroup /> Add Course
            </NavLink>
          </div>

          {/* Subjects */}
          <div style={sectionTitle} onClick={() => toggle("subjects")}>
            Subjects <FaChevronDown style={{ transform: open.subjects ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.subjects)}>
            <NavLink to="/subjects" style={navLink}>
              <FaBook /> View Subjects
            </NavLink>
            <NavLink to="/subjects/add" style={navLink}>
              <FaBook /> Add Subject
            </NavLink>
          </div>

          {/* Teachers */}
          <div style={sectionTitle} onClick={() => toggle("teachers")}>
            Teachers <FaChevronDown style={{ transform: open.teachers ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.teachers)}>
            <NavLink to="/teachers" style={navLink}>
              <FaChalkboardTeacher /> Teachers List
            </NavLink>
            <NavLink to="/teachers/assign-subjects" style={navLink}>
              <FaLink /> Assign Subjects
            </NavLink>
          </div>

          {/* Students */}
          <div style={sectionTitle} onClick={() => toggle("students")}>
            Students <FaChevronDown style={{ transform: open.students ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.students)}>
            <NavLink to="/students" style={navLink}>
              <FaUserGraduate /> Students List
            </NavLink>
            <NavLink to="/students/add" style={navLink}>
              <FaUserGraduate /> Add Student
            </NavLink>
            <NavLink to="/students/assign-parent" style={navLink}>
              <FaLink /> Assign Parent
            </NavLink>
          </div>

          {/* Parents */}
          <div style={sectionTitle} onClick={() => toggle("parents")}>
            Parents <FaChevronDown style={{ transform: open.parents ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }} />
          </div>
          <div style={sectionBody(open.parents)}>
            <NavLink to="/parents" style={navLink}>
              <FaUsers /> Parents List
            </NavLink>
          </div>
        </>
      )}

      {/* TEACHER */}
      {user.role === "teacher" && (
        <>
          <NavLink to="/attendance/mark" style={navLink}>
            <FaClipboardList /> Mark Attendance
          </NavLink>
          <NavLink to="/attendance/report" style={navLink}>
            <FaClipboardList /> Attendance Report
          </NavLink>
        </>
      )}

      {/* STUDENT */}
      {user.role === "student" && (
        <>
          <NavLink to="/student/profile" style={navLink}>
            <FaUserGraduate /> My Profile
          </NavLink>
          <NavLink to="/my-attendance" style={navLink}>
            <FaClipboardList /> My Attendance
          </NavLink>
        </>
      )}

      {/* PARENT */}
      {user.role === "parent" && (
        <>
          <NavLink to="/parent/children" style={navLink}>
            <FaUsers /> My Children
          </NavLink>
          <NavLink to="/parent/attendance" style={navLink}>
            <FaClipboardList /> Attendance
          </NavLink>
        </>
      )}

      <div
        style={{
          marginTop: "30px",
          textAlign: "center",
          fontSize: "12px",
          color: "#cfe8ef"
        }}
      >
        © 2026 Smart College
      </div>
    </aside>
  );
}
