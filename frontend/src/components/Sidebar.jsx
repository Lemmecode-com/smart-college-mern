import { NavLink } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";

import {
  FaTachometerAlt,
  FaUniversity,
  FaBook,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaLink,
  FaChevronDown,
  FaCog,
} from "react-icons/fa";

export default function Sidebar() {
  const { user } = useContext(AuthContext);

  const [open, setOpen] = useState({
    college: true,
    departments: true,
    courses: true,
    students: true,
  });

  if (!user) return null;

  const role = user.role;

  const toggle = (key) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ================= STYLES ================= */
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
    opacity: 0.9,
  };

  const sectionBody = (isOpen) => ({
    maxHeight: isOpen ? "500px" : "0px",
    overflow: "hidden",
    transition: "max-height 0.4s ease",
    marginLeft: "10px",
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
        overflowY: "auto",
      }}
    >
      {/* ================= LOGO ================= */}
      <div
        style={{
          textAlign: "center",
          fontSize: "20px",
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: "24px",
        }}
      >
        Smart College ERP
      </div>

      {/* =====================================================
            SUPER ADMIN MENU
      ===================================================== */}
      {role === "SUPER_ADMIN" && (
        <>
          <NavLink to="/super-admin/dashboard" style={navLink}>
            <FaTachometerAlt /> Dashboard
          </NavLink>

          <NavLink to="/super-admin/create-college" style={navLink}>
            <FaUniversity /> Add New College
          </NavLink>

          <NavLink to="/super-admin/colleges-list" style={navLink}>
            <FaUniversity /> Colleges-List
          </NavLink>

          <NavLink to="/super-admin/settings" style={navLink}>
            <FaCog /> System Settings
          </NavLink>
        </>
      )}

      {/* =====================================================
            COLLEGE ADMIN MENU
      ===================================================== */}
      {role === "COLLEGE_ADMIN" && (
        <>
          <NavLink to="/dashboard" style={navLink}>
            <FaTachometerAlt /> Dashboard
          </NavLink>

          {/* COLLEGE */}
          <div style={sectionTitle} onClick={() => toggle("college")}>
            College <FaChevronDown />
          </div>
          <div style={sectionBody(open.college)}>
            <NavLink to="/college/profile" style={navLink}>
              <FaUniversity /> College Profile
            </NavLink>
          </div>

          {/* DEPARTMENTS */}
          <div style={sectionTitle} onClick={() => toggle("departments")}>
            Departments <FaChevronDown />
          </div>
          <div style={sectionBody(open.departments)}>
            <NavLink to="/departments" style={navLink}>
              <FaBook /> Department List
            </NavLink>
            <NavLink to="/departments/add" style={navLink}>
              <FaBook /> Add Department
            </NavLink>
          </div>

          {/* COURSES */}
          <div style={sectionTitle} onClick={() => toggle("courses")}>
            Courses <FaChevronDown />
          </div>
          <div style={sectionBody(open.courses)}>
            <NavLink to="/courses" style={navLink}>
              <FaLayerGroup /> Course List
            </NavLink>
            <NavLink to="/courses/add" style={navLink}>
              <FaLayerGroup /> Add Course
            </NavLink>
          </div>

          {/* STUDENTS */}
          <div style={sectionTitle} onClick={() => toggle("students")}>
            Students <FaChevronDown />
          </div>
          <div style={sectionBody(open.students)}>
            <NavLink to="/students" style={navLink}>
              <FaUserGraduate /> Student List
            </NavLink>
            <NavLink to="/students/add" style={navLink}>
              <FaUserGraduate /> Add Student
            </NavLink>
            <NavLink to="/students/assign-parent" style={navLink}>
              <FaLink /> Assign Parent
            </NavLink>
          </div>
        </>
      )}

      {/* =====================================================
            TEACHER MENU
      ===================================================== */}
      {role === "TEACHER" && (
        <>
          <NavLink to="/teacher/dashboard" style={navLink}>
            <FaTachometerAlt /> Dashboard
          </NavLink>

          <NavLink to="/attendance/mark" style={navLink}>
            <FaClipboardList /> Mark Attendance
          </NavLink>

          <NavLink to="/attendance/report" style={navLink}>
            <FaClipboardList /> Attendance Report
          </NavLink>
        </>
      )}

      {/* =====================================================
            STUDENT MENU
      ===================================================== */}
      {role === "STUDENT" && (
        <>
          <NavLink to="/student/dashboard" style={navLink}>
            <FaTachometerAlt /> Dashboard
          </NavLink>

          <NavLink to="/my-attendance" style={navLink}>
            <FaClipboardList /> My Attendance
          </NavLink>
        </>
      )}
    </aside>
  );
}