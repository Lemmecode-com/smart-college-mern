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
  FaCalendarAlt,
  FaMoneyBillWave,
  FaMoneyBillWaveAlt,
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
            <NavLink to="/subjects/course/:courseId" style={navLink}>
              <FaLayerGroup /> Subject List
            </NavLink>
            <NavLink to="/subjects/add" style={navLink}>
              <FaLayerGroup /> Add Subject
            </NavLink>
          </div>

          {/* Teachers */}
          <div style={sectionTitle} onClick={() => toggle("teachers")}>
            Teachers <FaChevronDown />
          </div>
          <div style={sectionBody(open.teachers)}>
            <NavLink to="/teachers" style={navLink}>
              <FaUserGraduate /> Teacher List
            </NavLink>
            <NavLink to="/teachers/add-teacher" style={navLink}>
              <FaUserGraduate /> Add Teacher
            </NavLink>
          </div>

          {/* TIMETABLE */}
          <div style={sectionTitle} onClick={() => toggle("timetable")}>
            Timetable <FaChevronDown />
          </div>
          <div style={sectionBody(open.timetable)}>
            <NavLink to="/timetable/create" style={navLink}>
              <FaCalendarAlt /> Create Timetable
            </NavLink>
            <NavLink to="/timetable/view" style={navLink}>
              <FaCalendarAlt /> View Timetable
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

            <NavLink to="/students/approve" style={navLink}>
              <FaUserGraduate /> Approve Students
            </NavLink>
          </div>

          {/* FEE STRUCTURE */}
          <div style={sectionTitle} onClick={() => toggle("fee-structure")}>
            System Settings <FaChevronDown />
          </div>
          <div style={sectionBody(open["fee-structure"])}>
            <NavLink to="/fee-structure/view-teacher/:id" style={navLink}>
              <FaMoneyBillWave /> Create Fee Structure
            </NavLink>
            <NavLink to="/fee-structure/list" style={navLink}>
              <FaMoneyBillWaveAlt /> Fee Structures List
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
          <NavLink to="/profile/my-profile" style={navLink}>
            <FaCog /> My Profile
          </NavLink>
          <NavLink to="/timetable/my-timetable" style={navLink}>
            <FaCalendarAlt /> My Timetable
          </NavLink>

          <NavLink to="/students/my-students" style={navLink}>
            <FaUserGraduate /> My Students
          </NavLink>

          <NavLink to="/sessions/create" style={navLink}>
            <FaCalendarAlt /> Create Session
          </NavLink>

          <NavLink to="/sessions/my-sessions" style={navLink}>
            <FaCalendarAlt /> My Sessions
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

          <NavLink to="/student/profile" style={navLink}>
            <FaCog />Profile
          </NavLink>

          <NavLink to="/student/timetable" style={navLink}>
            <FaCalendarAlt /> Timetable
          </NavLink>
          <NavLink to="/student/fees" style={navLink}>
            <FaLink /> Fees
          </NavLink>

          <NavLink to="/student/payment-history" style={navLink}>
            <FaLink /> Payment History
          </NavLink>

          <NavLink to="/student/change-password" style={navLink}>
            <FaCog /> Change Password
          </NavLink>

          <NavLink to="/my-attendance" style={navLink}>
            <FaClipboardList /> My Attendance
          </NavLink>
        </>
      )}
    </aside>
  );
}