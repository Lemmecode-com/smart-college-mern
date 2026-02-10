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
  FaMoneyBillWaveAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaHome,
  FaSignOutAlt,
} from "react-icons/fa";

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    college: true,
    departments: true,
    courses: true,
    teachers: true,
    timetable: true,
    students: true,
    "fee-structure": true,
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobileOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector(".sidebar-container");
        if (sidebar && !sidebar.contains(event.target)) {
          setIsMobileOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileOpen]);

  if (!user) return null;

  const role = user.role;
  const isAdmin = role === "COLLEGE_ADMIN" || role === "SUPER_ADMIN";

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
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
  });

  const activeLinkStyle = {
    color: "#0f3a4a",
    background: "#ffffff",
    borderLeft: "3px solid #1a4b6d",
    fontWeight: 600,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

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
    backgroundColor: "rgba(255,255,255,0.1)",
  };

  const sectionBodyStyle = (isOpen) => ({
    maxHeight: isOpen ? "1000px" : "0",
    overflow: "hidden",
    transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    paddingLeft: "10px",
  });

  return (
    <>
      {/* MOBILE SIDEBAR TOGGLE BUTTON */}
      {window.innerWidth < 768 && (
        <button
          onClick={toggleMobileSidebar}
          className="mobile-menu-toggle"
          aria-label="Toggle menu"
          style={{
            position: "fixed",
            top: "15px",
            left: "15px",
            zIndex: 1050,
            width: "45px",
            height: "45px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
            border: "none",
            boxShadow: "0 4px 15px rgba(26, 75, 109, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isMobileOpen ? (
            <FaTimes size={24} color="white" />
          ) : (
            <FaBars size={24} color="white" />
          )}
        </button>
      )}

      {/* SIDEBAR CONTAINER */}
      <div
        className={`sidebar-container ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "100%",
          maxWidth: "280px",
          backgroundColor: "transparent",
          zIndex: 1040,
          display: "flex",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          transform:
            isMobileOpen || window.innerWidth >= 768
              ? "translateX(0)"
              : "translateX(-100%)",
        }}
      >
        {/* SIDEBAR BACKDROP FOR MOBILE */}
        {isMobileOpen && window.innerWidth < 768 && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: -1,
            }}
          />
        )}

        {/* SIDEBAR CONTENT */}
        <aside
          style={{
            width: "100%",
            height: "100vh",
            background: "linear-gradient(180deg, #0f3a4a 0%, #0c2d3a 100%)",
            padding: "20px 14px",
            overflowY: "auto",
            boxShadow: "4px 0 20px rgba(0, 0, 0, 0.3)",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* LOGO SECTION */}
          <div
            style={{
              textAlign: "center",
              padding: "15px 0 25px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              NOVAA
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.7)",
                marginTop: "4px",
                fontWeight: 500,
              }}
            >
              {role.replace("_", " ")}
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav>
            {/* DASHBOARD LINK */}
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

            {/* ROLE-BASED MENUS */}
            {role === "SUPER_ADMIN" && (
              <>
                <NavLink
                  to="/super-admin/create-college"
                  style={getNavLinkStyle}
                >
                  <FaUniversity /> Add New College
                </NavLink>
                <NavLink
                  to="/super-admin/colleges-list"
                  style={getNavLinkStyle}
                >
                  <FaUniversity /> Colleges List
                </NavLink>
                <NavLink to="/super-admin/settings" style={getNavLinkStyle}>
                  <FaCog /> System Settings
                </NavLink>
              </>
            )}

            {role === "COLLEGE_ADMIN" && (
              <>
                {/* COLLEGE SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("college")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("departments")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    <FaBook /> Department List
                  </NavLink>
                  <NavLink to="/departments/add" style={getNavLinkStyle}>
                    <FaBook /> Add Department
                  </NavLink>
                </div>

                {/* COURSES SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("courses")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    <FaLayerGroup /> Course List
                  </NavLink>
                  <NavLink to="/courses/add" style={getNavLinkStyle}>
                    <FaLayerGroup /> Add Course
                  </NavLink>
                  <NavLink
                    to="/subjects/course/:courseId"
                    style={getNavLinkStyle}
                  >
                    <FaLayerGroup /> Subject List
                  </NavLink>
                  <NavLink to="/subjects/add" style={getNavLinkStyle}>
                    <FaLayerGroup /> Add Subject
                  </NavLink>
                </div>

                {/* TEACHERS SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("teachers")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    <FaUserGraduate /> Teacher List
                  </NavLink>
                  <NavLink to="/teachers/add-teacher" style={getNavLinkStyle}>
                    <FaUserGraduate /> Add Teacher
                  </NavLink>
                </div>

                {/* TIMETABLE SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("timetable")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FaCalendarAlt /> Timetable
                  </div>
                  {openSections.timetable ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections.timetable)}>
                  <NavLink to="/timetable/create" style={getNavLinkStyle}>
                    <FaCalendarAlt /> Create Timetable
                  </NavLink>
                  <NavLink to="/timetable/view" style={getNavLinkStyle}>
                    <FaCalendarAlt /> View Timetable
                  </NavLink>
                </div>

                {/* STUDENTS SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("students")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    <FaUserGraduate /> Student List
                  </NavLink>
                  <NavLink to="/students/approve" style={getNavLinkStyle}>
                    <FaUserGraduate /> Approve Students
                  </NavLink>
                </div>

                {/* FEE STRUCTURE SECTION */}
                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("fee-structure")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
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
                    <FaMoneyBillWave /> Create Fee Structure
                  </NavLink>
                  <NavLink to="/fees/list" style={getNavLinkStyle}>
                    <FaMoneyBillWaveAlt /> Fee Structures List
                  </NavLink>
                </div>

                {/* Notifications */}

                <div
                  style={sectionTitleStyle}
                  onClick={() => toggleSection("Notifications")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FaBell/> Notifications
                  </div>
                  {openSections["Notifications"] ? (
                    <FaChevronUp size={12} />
                  ) : (
                    <FaChevronDown size={12} />
                  )}
                </div>
                <div style={sectionBodyStyle(openSections["Notifications"])}>
                  <NavLink to="/notification/create" style={getNavLinkStyle}>
                    <FaLink /> Create Notification
                  </NavLink>
                  <NavLink to="/notification/list" style={getNavLinkStyle}>
                    <FaLink /> Notification List
                  </NavLink>
                </div>
              </>
            )}

            {role === "TEACHER" && (
              <>
                <NavLink to="/profile/my-profile" style={getNavLinkStyle}>
                  <FaCog /> My Profile
                </NavLink>
                <NavLink to="/timetable/create" style={getNavLinkStyle}>
                  <FaCalendarAlt /> Create Timetable
                </NavLink>
                <NavLink to="/timetable/list" style={getNavLinkStyle}>
                  <FaCalendarAlt /> View Timetables
                </NavLink>
                <NavLink to="/timetable/add-slot" style={getNavLinkStyle}>
                  <FaCalendarAlt /> Add Timetable Slot
                </NavLink>
                <NavLink to="/timetable/weekly-timetable" style={getNavLinkStyle}>
                  <FaCalendarAlt /> My Shedule
                </NavLink>
                <NavLink to="/sessions/create" style={getNavLinkStyle}>
                  <FaCalendarAlt /> Create Session
                </NavLink>
                <NavLink to="/sessions/my-sessions" style={getNavLinkStyle}>
                  <FaCalendarAlt /> My Sessions
                </NavLink>
                <NavLink to="/attendance/mark" style={getNavLinkStyle}>
                  <FaClipboardList /> Mark Attendance
                </NavLink>
                <NavLink to="/attendance/report" style={getNavLinkStyle}>
                  <FaClipboardList /> Attendance Report
                </NavLink>
                <NavLink to="/teacher/notifications/create" style={getNavLinkStyle}>
                  <FaBell /> Create Notification
                </NavLink>
                <NavLink to="/teacher/notifications/list" style={getNavLinkStyle}>
                  <FaBell /> Notifications
                </NavLink>
              </>
            )}

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
          </nav>
        </aside>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .sidebar-container {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 100%;
          max-width: 280px;
          z-index: 1040;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (min-width: 768px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
        }

        .mobile-menu-toggle {
          position: fixed;
          top: 15px;
          left: 15px;
          z-index: 1050;
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border: none;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        @media (min-width: 768px) {
          .mobile-menu-toggle {
            display: none !important;
          }
        }

        .active-link {
          color: #0f3a4a !important;
          background: #ffffff !important;
          border-left: 3px solid #1a4b6d !important;
          font-weight: 600 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }

        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1039;
        }

        @media (max-width: 767px) {
          .sidebar-container.mobile-open {
            transform: translateX(0);
          }

          .sidebar-container {
            transform: translateX(-100%);
          }
        }

        /* Animation for section collapse */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sidebar-container nav > div[style*="maxHeight"] {
          animation: slideDown 0.3s ease forwards;
        }
      `}</style>
    </>
  );
}
