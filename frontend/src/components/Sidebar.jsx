import { NavLink, useLocation } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
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
  FaChevronUp,
  FaCog,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaMoneyBill,
  FaChartBar,
  FaBell,
  FaHome,
  FaPlus,
  FaListOl,
  FaChartLine,
  FaEnvelope,
  FaSignOutAlt,
  FaUsers,
  FaGraduationCap,
  FaCheckCircle,
  FaChartPie,
  FaFileAlt,
  FaUser,
  FaEdit,
} from "react-icons/fa";

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const [openSections, setOpenSections] = useState({
    // College Admin sections
    college: true,
    departments: true,
    courses: true,
    teachers: true,
    students: true,
    "fee-structure": true,
    notifications: true,
    reports: true,
    "system-settings": true,

    // Teacher sections
    "profile-teacher": true,
    "timetable-teacher": true,
    "sessions-teacher": true,
    "attendance-teacher": true,
    "notifications-teacher": true,
    "students-teacher": true,

    // Super Admin sections
    "super-colleges": true,
    "super-reports": true,
    "super-settings": true,
  });

  // Track if device is mobile
  const [isMobileDevice, setIsMobileDevice] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // Handle window resize
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileDevice(mobile);
      // Auto-close sidebar when switching to desktop
      if (!mobile && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileOpen, setIsMobileOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, setIsMobileOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    // Only attach listener when sidebar is open on mobile
    if (!isMobileOpen || !isMobileDevice) return;

    const handleClickOutside = (event) => {
      const sidebar = document.querySelector(".sidebar-container");
      const navbar = document.querySelector(".navbar");

      // Check if click is outside both sidebar and navbar
      const clickedOutsideSidebar = !sidebar || !sidebar.contains(event.target);
      const clickedOutsideNavbar = !navbar || !navbar.contains(event.target);

      if (clickedOutsideSidebar && clickedOutsideNavbar) {
        setIsMobileOpen(false);
      }
    };

    // Use setTimeout to prevent immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobileOpen, isMobileDevice, setIsMobileOpen]);

  if (!user) return null;

  const role = user.role;

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  /* ================= STYLES ================= */
  const getNavLinkStyle = ({ isActive }) => ({
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
    transition: "all 0.3s ease",
    borderLeft: isActive ? "3px solid #1a4b6d" : "3px solid transparent",
    position: "relative",
    overflow: "hidden",
  });

  const subLinkStyle = ({ isActive }) => ({
    padding: "10px 16px 10px 36px",
    fontSize: "13px",
    fontWeight: 500,
    color: isActive ? "#0f3a4a" : "#c3e0e5",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderRadius: "8px",
    transition: "all 0.25s ease",
    borderLeft: isActive ? "3px solid #4CAF50" : "3px solid transparent",
    background: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
  });

  const sectionTitleStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    marginTop: "8px",
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderLeft: "3px solid transparent",
  };

  const sectionBodyStyle = (isOpen) => ({
    maxHeight: isOpen ? "1000px" : "0",
    overflow: "hidden",
    transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    paddingLeft: "10px",
  });

  return (
    <>
      {/* SIDEBAR CONTAINER */}
      <div
        className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "280px",
          maxWidth: "280px",
          zIndex: 1050,
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isMobileDevice && !isMobileOpen ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        {/* SIDEBAR BACKDROP FOR MOBILE */}
        {isMobileOpen && isMobileDevice && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: -1,
              backdropFilter: "blur(2px)",
            }}
          />
        )}

        {/* SIDEBAR CONTENT */}
        <aside className="sidebar-content">
          {/* LOGO SECTION */}
          <div className="sidebar-logo">
            <div className="logo-container">
              <div className="logo-icon">
                <FaGraduationCap size={24} />
              </div>
              <div className="logo-text">NOVAA</div>
            </div>
            <div className="logo-role">{role.replace("_", " ")}</div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="sidebar-nav">
            {/* DASHBOARD LINK - COMMON FOR ALL ROLES */}
            <NavLink
              to={
                role === "SUPER_ADMIN"
                  ? "/super-admin/dashboard"
                  : role === "COLLEGE_ADMIN"
                  ? "/dashboard"
                  : role === "TEACHER"
                  ? "/teacher/dashboard"
                  : "/student/dashboard"
              }
              style={getNavLinkStyle}
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <FaTachometerAlt /> Dashboard
            </NavLink>

            {/* ================= SUPER ADMIN MENU ================= */}
            {role === "SUPER_ADMIN" && (
              <>
                {/* COLLEGE MANAGEMENT */}
                <div
                  className={`sidebar-section-title ${
                    openSections["super-colleges"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("super-colleges")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaUniversity /> College Management
                  </div>
                  {openSections["super-colleges"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["super-colleges"])}>
                  <NavLink
                    to="/super-admin/create-college"
                    style={getNavLinkStyle}
                  >
                    <FaPlus /> Add New College
                  </NavLink>
                  <NavLink
                    to="/super-admin/colleges-list"
                    style={getNavLinkStyle}
                  >
                    <FaListOl /> Colleges List
                  </NavLink>
                </div>

                {/* REPORTS */}
                <div
                  className={`sidebar-section-title ${
                    openSections["super-reports"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("super-reports")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaChartPie /> Reports & Analytics
                  </div>
                  {openSections["super-reports"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["super-reports"])}>
                  <NavLink to="/super-admin/reports" style={getNavLinkStyle}>
                    <FaUniversity /> College Analytics
                  </NavLink>
                </div>

                {/* SYSTEM SETTINGS */}
                <div
                  className={`sidebar-section-title ${
                    openSections["super-settings"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("super-settings")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaCog /> System Settings
                  </div>
                  {openSections["super-settings"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["super-settings"])}>
                  <NavLink to="/super-admin/settings" style={getNavLinkStyle}>
                    <FaCog /> General Settings
                  </NavLink>
                  <NavLink
                    to="/super-admin/settings/users"
                    style={getNavLinkStyle}
                  >
                    <FaUsers /> User Management
                  </NavLink>
                </div>
              </>
            )}

            {/* ================= COLLEGE ADMIN MENU ================= */}
            {role === "COLLEGE_ADMIN" && (
              <>
                {/* COLLEGE SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.college ? "open" : ""
                  }`}
                  onClick={() => toggleSection("college")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaUniversity /> College
                  </div>
                  {openSections.college ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.college)}>
                  <NavLink to="/college/profile" style={getNavLinkStyle}>
                    <FaUniversity /> College Profile
                  </NavLink>
                </div>

                {/* DEPARTMENTS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.departments ? "open" : ""
                  }`}
                  onClick={() => toggleSection("departments")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaBook /> Departments
                  </div>
                  {openSections.departments ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.departments)}>
                  <NavLink to="/departments" style={getNavLinkStyle}>
                    <FaListOl /> Department List
                  </NavLink>
                  <NavLink to="/departments/add" style={getNavLinkStyle}>
                    <FaPlus /> Add Department
                  </NavLink>
                </div>

                {/* COURSES SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.courses ? "open" : ""
                  }`}
                  onClick={() => toggleSection("courses")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaLayerGroup /> Courses
                  </div>
                  {openSections.courses ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.courses)}>
                  <NavLink to="/courses" style={getNavLinkStyle}>
                    <FaListOl /> Course List
                  </NavLink>
                  <NavLink to="/courses/add" style={getNavLinkStyle}>
                    <FaPlus /> Add Course
                  </NavLink>
                  <NavLink
                    to="/subjects/course/:courseId"
                    style={getNavLinkStyle}
                  >
                    <FaBook /> Subject List
                  </NavLink>
                  <NavLink to="/subjects/add" style={getNavLinkStyle}>
                    <FaPlus /> Add Subject
                  </NavLink>
                </div>

                {/* TEACHERS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.teachers ? "open" : ""
                  }`}
                  onClick={() => toggleSection("teachers")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaUserGraduate /> Teachers
                  </div>
                  {openSections.teachers ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.teachers)}>
                  <NavLink to="/teachers" style={getNavLinkStyle}>
                    <FaListOl /> Teacher List
                  </NavLink>
                  <NavLink to="/teachers/add-teacher" style={getNavLinkStyle}>
                    <FaPlus /> Add Teacher
                  </NavLink>
                </div>

                {/* STUDENTS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.students ? "open" : ""
                  }`}
                  onClick={() => toggleSection("students")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaUserGraduate /> Students
                  </div>
                  {openSections.students ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.students)}>
                  <NavLink to="/students" style={getNavLinkStyle}>
                    <FaListOl /> Pending Student List
                  </NavLink>
                  <NavLink to="/students/approve" style={getNavLinkStyle}>
                    <FaCheckCircle /> Approve Students
                  </NavLink>
                  <NavLink to="/students/promotion" style={getNavLinkStyle}>
                    <FaGraduationCap /> Student Promotion
                  </NavLink>
                  <NavLink to="/students/alumni" style={getNavLinkStyle}>
                    <FaGraduationCap /> Alumni Records
                  </NavLink>
                </div>

                {/* FEE STRUCTURE SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections["fee-structure"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("fee-structure")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaMoneyBillWave /> Fee Management
                  </div>
                  {openSections["fee-structure"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["fee-structure"])}>
                  <NavLink to="/fees/create" style={getNavLinkStyle}>
                    <FaPlus /> Create Fee Structure
                  </NavLink>
                  <NavLink to="/fees/list" style={getNavLinkStyle}>
                    <FaListOl /> Fee Structures List
                  </NavLink>
                </div>

                {/* REPORTS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.reports ? "open" : ""
                  }`}
                  onClick={() => toggleSection("reports")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaChartPie /> Reports & Analytics
                  </div>
                  {openSections.reports ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.reports)}>
                  <NavLink to="/college-admin/reports-dashboard" style={getNavLinkStyle}>
                    <FaChartBar /> Reports Dashboard
                  </NavLink>
                  <NavLink to="/college-admin/reports" style={getNavLinkStyle}>
                    <FaGraduationCap /> Admission Reports
                  </NavLink>
                  <NavLink
                    to="/college-admin/reports/payment-summary"
                    style={getNavLinkStyle}
                  >
                    <FaMoneyBillWave /> Payment Reports
                  </NavLink>
                  <NavLink
                    to="/college-admin/reports/attendance"
                    style={getNavLinkStyle}
                  >
                    <FaClipboardList /> Attendance Reports
                  </NavLink>
                </div>

                {/* NOTIFICATIONS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections.notifications ? "open" : ""
                  }`}
                  onClick={() => toggleSection("notifications")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaBell /> Notifications
                  </div>
                  {openSections.notifications ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.notifications)}>
                  <NavLink to="/notification/create" style={getNavLinkStyle}>
                    <FaPlus /> Create Notification
                  </NavLink>
                  <NavLink to="/notification/list" style={getNavLinkStyle}>
                    <FaListOl /> Notification List
                  </NavLink>
                </div>

                {/* SYSTEM SETTINGS SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections["system-settings"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("system-settings")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaCog /> System Settings
                  </div>
                  {openSections["system-settings"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["system-settings"])}>
                  <NavLink
                    to="/system-settings/academic"
                    style={getNavLinkStyle}
                  >
                    <FaGraduationCap /> Academic Settings
                  </NavLink>
                  <NavLink to="/system-settings/fees" style={getNavLinkStyle}>
                    <FaMoneyBill /> Fee Settings
                  </NavLink>
                  <NavLink
                    to="/system-settings/general"
                    style={getNavLinkStyle}
                  >
                    <FaCog /> General Settings
                  </NavLink>
                  <NavLink
                    to="/system-settings/notifications"
                    style={getNavLinkStyle}
                  >
                    <FaBell /> Notification Settings
                  </NavLink>
                  <NavLink
                    to="/college/document-settings"
                    style={getNavLinkStyle}
                  >
                    <FaFileAlt /> Document Settings
                  </NavLink>
                </div>
              </>
            )}

            {/* ================= TEACHER MENU ================= */}
            {role === "TEACHER" && (
              <>
                {/* MY PROFILE SECTION */}
                <div
                  className={`sidebar-section-title ${
                    openSections["profile-teacher"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("profile-teacher")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaCog /> My Profile
                  </div>
                  {openSections["profile-teacher"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["profile-teacher"])}>
                  <NavLink
                    to="/profile/my-profile"
                    style={getNavLinkStyle}
                  >
                    <FaUser /> Profile Details
                  </NavLink>
                  <NavLink
                    to="/profile/edit-profile"
                    style={getNavLinkStyle}
                  >
                    <FaEdit /> Edit Profile
                  </NavLink>
                </div>

                {/* TIMETABLE DROPDOWN */}
                <div
                  className={`sidebar-section-title ${
                    openSections["timetable-teacher"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("timetable-teacher")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaCalendarAlt /> Timetable
                  </div>
                  {openSections["timetable-teacher"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div
                  style={sectionBodyStyle(openSections["timetable-teacher"])}
                >
                  <NavLink
                    to="/timetable/create-timetable"
                    style={getNavLinkStyle}
                  >
                    <FaPlus /> Create Timetable
                  </NavLink>
                  <NavLink
                    to="/timetable/list"
                    style={getNavLinkStyle}
                  >
                    <FaListOl /> View Timetables
                  </NavLink>
                  <NavLink
                    to="/timetable/add-slot"
                    style={getNavLinkStyle}
                  >
                    <FaPlus /> Add Timetable Slot
                  </NavLink>
                  <NavLink
                    to="/timetable/weekly-timetable"
                    style={getNavLinkStyle}
                  >
                    <FaCalendarAlt /> My Schedule
                  </NavLink>
                </div>

                {/* SESSIONS DROPDOWN */}
                <div
                  className={`sidebar-section-title ${
                    openSections["sessions-teacher"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("sessions-teacher")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaGraduationCap /> Sessions
                  </div>
                  {openSections["sessions-teacher"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["sessions-teacher"])}>
                  <NavLink
                    to="/attendance/my-sessions-list"
                    style={getNavLinkStyle}
                  >
                    <FaListOl /> My Sessions
                  </NavLink>
                  <NavLink
                    to="/attendance/create-session"
                    style={getNavLinkStyle}
                  >
                    <FaPlus /> Create Session
                  </NavLink>
                </div>

                {/* ATTENDANCE DROPDOWN */}
                <div
                  className={`sidebar-section-title ${
                    openSections["attendance-teacher"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("attendance-teacher")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaClipboardList /> Attendance
                  </div>
                  {openSections["attendance-teacher"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div
                  style={sectionBodyStyle(openSections["attendance-teacher"])}
                >
                  <NavLink
                    to="/attendance/report"
                    style={getNavLinkStyle}
                  >
                    <FaChartLine /> Attendance Report
                  </NavLink>
                  {/* <NavLink
                    to="/attendance/list"
                    style={getNavLinkStyle}
                  >
                    <FaListOl /> Attendance List
                  </NavLink> */}
                </div>

                {/* NOTIFICATIONS DROPDOWN */}
                <div
                  className={`sidebar-section-title ${
                    openSections["notifications-teacher"] ? "open" : ""
                  }`}
                  onClick={() => toggleSection("notifications-teacher")}
                  style={sectionTitleStyle}
                >
                  <div className="section-title-content">
                    <FaBell /> Notifications
                  </div>
                  {openSections["notifications-teacher"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div
                  style={sectionBodyStyle(
                    openSections["notifications-teacher"]
                  )}
                >
                  <NavLink
                    to="/teacher/notifications/create"
                    style={getNavLinkStyle}
                  >
                    <FaPlus /> Create Notification
                  </NavLink>
                  <NavLink
                    to="/teacher/notifications/list"
                    style={getNavLinkStyle}
                  >
                    <FaEnvelope /> All Notifications
                  </NavLink>
                </div>
              </>
            )}

            {/* ================= STUDENT MENU ================= */}
            {role === "STUDENT" && (
              <>
                <NavLink to="/student/profile" style={getNavLinkStyle}>
                  <FaCog /> My Profile
                </NavLink>
                <NavLink to="/student/timetable" style={getNavLinkStyle}>
                  <FaCalendarAlt /> Timetable
                </NavLink>
                <NavLink to="/student/fees" style={getNavLinkStyle}>
                  <FaMoneyBillWave /> Fees
                </NavLink>
                <NavLink to="/my-attendance" style={getNavLinkStyle}>
                  <FaClipboardList /> My Attendance
                </NavLink>
                <NavLink to="/notification/student" style={getNavLinkStyle}>
                  <FaBell /> Notifications
                </NavLink>
              </>
            )}

            {/* LOGOUT BUTTON */}
            <div className="sidebar-logout">
              <button onClick={handleLogout} className="logout-btn">
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </nav>
        </aside>
      </div>

      {/* STYLES */}
      <style>{`
        .sidebar-container {
          position: fixed !important;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          max-width: 280px;
          background: transparent;
          z-index: 1050 !important;
          display: flex;
        }

        .sidebar-container.mobile-open {
          transform: translateX(0) !important;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
        }

        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1039;
          backdrop-filter: blur(2px);
        }

        .sidebar-content {
          width: 100%;
          height: 100vh;
          background: linear-gradient(180deg, #0f3a4a 0%, #0c2d3a 100%);
          padding: 20px 14px;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }

        .sidebar-content::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-content::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.35);
        }

        .sidebar-logo {
          text-align: center;
          padding: 15px 0 25px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 10px rgba(26, 75, 109, 0.4);
          animation: float 3s ease-in-out infinite;
        }

        .logo-text {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          background: linear-gradient(45deg, #4fc3f7, #29b6f6, #0288d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
        }

        .logo-text::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, #4fc3f7, #29b6f6, #0288d1);
          border-radius: 2px;
          opacity: 0.8;
        }

        .logo-role {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-section-title {
          background: rgba(255, 255, 255, 0.08);
          border-left: 3px solid transparent;
        }

        .sidebar-section-title:hover {
          background: rgba(255, 255, 255, 0.15);
          border-left: 3px solid #1a4b6d;
        }

        .sidebar-section-title.open {
          background: rgba(26, 75, 109, 0.3);
          border-left: 3px solid #1a4b6d;
          box-shadow: 0 0 15px rgba(26, 75, 109, 0.3);
        }

        .section-title-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .active-link {
          color: #0f3a4a !important;
          background: #ffffff !important;
          border-left: 3px solid #1a4b6d !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          position: relative;
        }

        .active-link::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(26, 75, 109, 0.3),
            rgba(26, 75, 109, 0.1)
          );
        }

        .active-sublink {
          color: #0f3a4a !important;
          background: rgba(255, 255, 255, 0.15) !important;
          border-left: 3px solid #4CAF50 !important;
          font-weight: 600 !important;
          position: relative;
        }

        .active-sublink::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(76, 175, 80, 0.3),
            rgba(76, 175, 80, 0.1)
          );
        }

        .sidebar-logout {
          margin-top: auto;
          padding: 15px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(244, 67, 54, 0.55);
          background: linear-gradient(135deg, #e53935 0%, #c62828 100%);
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        @media (min-width: 768px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
        }

        @media (max-width: 767.98px) {
          .sidebar-container {
            transform: translateX(-100%) !important;
          }
          
          .sidebar-container.mobile-open {
            transform: translateX(0) !important;
          }
          
          .sidebar-content {
            padding: 15px 10px;
          }
          
          .sidebar-logo {
            padding: 10px 0 15px;
          }
          
          .logo-text {
            font-size: 24px;
          }
          
          .logo-icon {
            width: 36px;
            height: 36px;
            font-size: 20px;
          }
          
          .sidebar-section-title,
          a[style*="padding: 12px 16px"] {
            font-size: 13px;
            padding: 10px 12px;
          }
          
          a[style*="padding: 10px 16px 10px 36px"] {
            font-size: 12px;
            padding-left: 30px;
          }
          
          .logout-btn {
            padding: 10px;
            font-size: 13px;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.4);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(26, 75, 109, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .sidebar-section-title {
          animation: fadeIn 0.4s ease forwards;
        }

        .sidebar-section-title.open {
          animation: pulse 2s infinite;
        }

        a:hover,
        button:hover {
          transform: translateX(3px);
        }

        .sidebar-content {
          scroll-behavior: smooth;
        }

        a[style*="padding: 10px 16px 10px 36px"]:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateX(5px) !important;
        }

        a.active-link + div a.active {
          color: #0f3a4a !important;
          background: rgba(255, 255, 255, 0.15) !important;
          border-left: 3px solid #4CAF50 !important;
        }

        @media (max-width: 768px) {
          .sidebar-container {
            max-width: 100%;
          }
          
          .sidebar-content {
            padding: 15px 10px;
          }
          
          .sidebar-logo {
            padding: 10px 0 15px;
          }
          
          .logo-text {
            font-size: 24px;
          }
          
          .sidebar-section-title,
          a[style*="padding: 12px 16px"] {
            font-size: 13px;
            padding: 10px 12px;
          }
          
          a[style*="padding: 10px 16px 10px 36px"] {
            font-size: 12px;
            padding-left: 30px;
          }
          
          .logout-btn {
            padding: 10px;
            font-size: 13px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-text {
            font-size: 22px;
          }
          
          .logo-icon {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }
          
          .sidebar-section-title,
          a[style*="padding: 12px 16px"] {
            font-size: 12px;
            padding: 8px 10px;
          }
          
          a[style*="padding: 10px 16px 10px 36px"] {
            font-size: 11px;
            padding-left: 28px;
          }
        }
      `}</style>
    </>
  );
}