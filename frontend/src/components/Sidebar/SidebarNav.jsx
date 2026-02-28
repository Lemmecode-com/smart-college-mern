import { NavLink, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUniversity,
  FaBook,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaCog,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaMoneyBill,
  FaChartBar,
  FaBell,
  FaPlus,
  FaListOl,
  FaChartLine,
  FaEnvelope,
  FaUsers,
  FaGraduationCap,
  FaCheckCircle,
  FaChartPie,
  FaFileAlt,
  FaUser,
  FaEdit,
  FaClock,
} from "react-icons/fa";
import SidebarSection, { SidebarSubItem } from "./SidebarSection";

/**
 * SidebarNav - Primary navigation component
 * Enterprise SaaS Standard:
 * - Proper active route logic using startsWith() for partial matching
 * - Parent section highlights when child route is active
 * - Consistent spacing and hierarchy
 * - Accessible navigation with proper ARIA attributes
 */
export default function SidebarNav({ 
  role, 
  openSections, 
  toggleSection, 
  isMobileDevice, 
  onClose,
  isCollapsed = false 
}) {
  const location = useLocation();

  const handleNavClick = () => {
    if (isMobileDevice && onClose) {
      onClose();
    }
  };

  /**
   * Check if current route matches or is a child of the base path
   * Uses startsWith() for proper partial route matching
   */
  const isActiveRoute = (basePath) => {
    if (!basePath) return false;
    return (
      location.pathname === basePath ||
      location.pathname.startsWith(basePath + '/')
    );
  };

  /**
   * Check if any child route within a section is active
   * Used to highlight parent section when child is active
   */
  const isSectionActive = (paths) => {
    if (!Array.isArray(paths)) return isActiveRoute(paths);
    return paths.some(path => isActiveRoute(path));
  };

  /**
   * Get dashboard path based on user role
   */
  const getDashboardPath = () => {
    switch (role) {
      case "SUPER_ADMIN": return "/super-admin/dashboard";
      case "COLLEGE_ADMIN": return "/dashboard";
      case "TEACHER": return "/teacher/dashboard";
      case "STUDENT": return "/student/dashboard";
      default: return "/dashboard";
    }
  };

  const dashboardPath = getDashboardPath();
  const isDashboardActive = isActiveRoute(dashboardPath);

  return (
    <nav className="sidebar-nav" role="menu" aria-label="Primary navigation">
      {/* DASHBOARD LINK - COMMON FOR ALL ROLES */}
      <NavLink
        to={dashboardPath}
        className={({ isActive }) =>
          `nav-link ${isActive || isDashboardActive ? "active-link" : ""}`
        }
        role="menuitem"
        aria-label="Dashboard"
        aria-current={isDashboardActive ? "page" : undefined}
        onClick={handleNavClick}
      >
        <span className="nav-link-icon" aria-hidden="true">
          <FaTachometerAlt />
        </span>
        <span className="nav-link-text">Dashboard</span>
      </NavLink>

      {/* ================= SUPER ADMIN MENU ================= */}
      {role === "SUPER_ADMIN" && (
        <>
          <SidebarSection
            title="College Management"
            icon={FaUniversity}
            isOpen={openSections["super-colleges"]}
            onToggle={() => toggleSection("super-colleges")}
            sectionId="super-colleges"
            isActive={isSectionActive([
              '/super-admin/create-college',
              '/super-admin/colleges-list'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/super-admin/create-college"
              icon={FaPlus}
              label="Add New College"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/super-admin/colleges-list"
              icon={FaListOl}
              label="Colleges List"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Reports & Analytics"
            icon={FaChartPie}
            isOpen={openSections["super-reports"]}
            onToggle={() => toggleSection("super-reports")}
            sectionId="super-reports"
            isActive={isActiveRoute('/super-admin/reports')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/super-admin/reports"
              icon={FaUniversity}
              label="College Analytics"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="System Settings"
            icon={FaCog}
            isOpen={openSections["super-settings"]}
            onToggle={() => toggleSection("super-settings")}
            sectionId="super-settings"
            isActive={isSectionActive([
              '/super-admin/settings',
              '/super-admin/settings/users'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/super-admin/settings"
              icon={FaCog}
              label="General Settings"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/super-admin/settings/users"
              icon={FaUsers}
              label="User Management"
              onClick={handleNavClick}
            />
          </SidebarSection>
        </>
      )}

      {/* ================= COLLEGE ADMIN MENU ================= */}
      {role === "COLLEGE_ADMIN" && (
        <>
          <SidebarSection
            title="College"
            icon={FaUniversity}
            isOpen={openSections.college}
            onToggle={() => toggleSection("college")}
            sectionId="college"
            isActive={isActiveRoute('/college/profile')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/college/profile"
              icon={FaUniversity}
              label="College Profile"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Departments"
            icon={FaBook}
            isOpen={openSections.departments}
            onToggle={() => toggleSection("departments")}
            sectionId="departments"
            isActive={isSectionActive([
              '/departments',
              '/departments/add'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/departments"
              icon={FaListOl}
              label="Department List"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/departments/add"
              icon={FaPlus}
              label="Add Department"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Courses"
            icon={FaLayerGroup}
            isOpen={openSections.courses}
            onToggle={() => toggleSection("courses")}
            sectionId="courses"
            isActive={isSectionActive([
              '/courses',
              '/courses/add',
              '/subjects',
              '/subjects/add'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem 
              to="/courses" 
              icon={FaListOl} 
              label="Course List" 
              onClick={handleNavClick} 
            />
            <SidebarSubItem
              to="/courses/add"
              icon={FaPlus}
              label="Add Course"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/subjects/course/:courseId"
              icon={FaBook}
              label="Subject List"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/subjects/add"
              icon={FaPlus}
              label="Add Subject"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Teachers"
            icon={FaUserGraduate}
            isOpen={openSections.teachers}
            onToggle={() => toggleSection("teachers")}
            sectionId="teachers"
            isActive={isSectionActive([
              '/teachers',
              '/teachers/add-teacher'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/teachers"
              icon={FaListOl}
              label="Teacher List"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/teachers/add-teacher"
              icon={FaPlus}
              label="Add Teacher"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Students"
            icon={FaUserGraduate}
            isOpen={openSections.students}
            onToggle={() => toggleSection("students")}
            sectionId="students"
            isActive={isSectionActive([
              '/students',
              '/students/approve',
              '/students/promotion'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/students"
              icon={FaListOl}
              label="Pending Student List"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/students/approve"
              icon={FaCheckCircle}
              label="Approve Students"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/students/promotion"
              icon={FaGraduationCap}
              label="Student Promotion"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Fee Management"
            icon={FaMoneyBillWave}
            isOpen={openSections["fee-structure"]}
            onToggle={() => toggleSection("fee-structure")}
            sectionId="fee-structure"
            isActive={isSectionActive([
              '/fees',
              '/fees/create',
              '/fees/list'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/fees/create"
              icon={FaPlus}
              label="Create Fee Structure"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/fees/list"
              icon={FaListOl}
              label="Fee Structures List"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Reports & Analytics"
            icon={FaChartPie}
            isOpen={openSections.reports}
            onToggle={() => toggleSection("reports")}
            sectionId="reports"
            isActive={isSectionActive([
              '/college-admin/reports-dashboard',
              '/college-admin/reports',
              '/college-admin/reports/payment-summary',
              '/college-admin/reports/attendance'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/college-admin/reports-dashboard"
              icon={FaChartBar}
              label="Reports Dashboard"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/college-admin/reports"
              icon={FaGraduationCap}
              label="Admission Reports"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/college-admin/reports/payment-summary"
              icon={FaMoneyBillWave}
              label="Payment Reports"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/college-admin/reports/attendance"
              icon={FaClipboardList}
              label="Attendance Reports"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Notifications"
            icon={FaBell}
            isOpen={openSections.notifications}
            onToggle={() => toggleSection("notifications")}
            sectionId="notifications"
            isActive={isSectionActive([
              '/notification',
              '/notification/create',
              '/notification/list'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/notification/create"
              icon={FaPlus}
              label="Create Notification"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/notification/list"
              icon={FaListOl}
              label="Notification List"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="System Settings"
            icon={FaCog}
            isOpen={openSections["system-settings"]}
            onToggle={() => toggleSection("system-settings")}
            sectionId="system-settings"
            isActive={isSectionActive([
              '/system-settings',
              '/system-settings/academic',
              '/system-settings/fees',
              '/system-settings/general',
              '/system-settings/notifications',
              '/college/document-settings'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/system-settings/academic"
              icon={FaGraduationCap}
              label="Academic Settings"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/system-settings/fees"
              icon={FaMoneyBill}
              label="Fee Settings"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/system-settings/general"
              icon={FaCog}
              label="General Settings"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/system-settings/notifications"
              icon={FaBell}
              label="Notification Settings"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/college/document-settings"
              icon={FaFileAlt}
              label="Document Settings"
              onClick={handleNavClick}
            />
          </SidebarSection>
        </>
      )}

      {/* ================= TEACHER MENU ================= */}
      {role === "TEACHER" && (
        <>
          <SidebarSection
            title="My Profile"
            icon={FaCog}
            isOpen={openSections["profile-teacher"]}
            onToggle={() => toggleSection("profile-teacher")}
            sectionId="profile-teacher"
            isActive={isActiveRoute('/profile')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/profile/my-profile"
              icon={FaUser}
              label="Profile Details"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/profile/edit-profile"
              icon={FaEdit}
              label="Edit Profile"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Timetable"
            icon={FaCalendarAlt}
            isOpen={openSections["timetable-teacher"]}
            onToggle={() => toggleSection("timetable-teacher")}
            sectionId="timetable-teacher"
            isActive={isSectionActive([
              '/timetable',
              '/timetable/create-timetable',
              '/timetable/list',
              '/timetable/add-slot',
              '/timetable/weekly-timetable'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/timetable/create-timetable"
              icon={FaPlus}
              label="Create Timetable"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/timetable/list"
              icon={FaListOl}
              label="View Timetables"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/timetable/add-slot"
              icon={FaPlus}
              label="Add Slot"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/timetable/weekly-timetable"
              icon={FaClock}
              label="My Schedule"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Attendance Sessions"
            icon={FaClipboardList}
            isOpen={openSections["sessions-teacher"]}
            onToggle={() => toggleSection("sessions-teacher")}
            sectionId="sessions-teacher"
            isActive={isSectionActive([
              '/attendance',
              '/attendance/create-session',
              '/attendance/my-sessions-list'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/attendance/create-session"
              icon={FaPlus}
              label="Create Session"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/attendance/my-sessions-list"
              icon={FaListOl}
              label="My Sessions"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Attendance"
            icon={FaClipboardList}
            isOpen={openSections["attendance-teacher"]}
            onToggle={() => toggleSection("attendance-teacher")}
            sectionId="attendance-teacher"
            isActive={isActiveRoute('/attendance/report')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/attendance/report"
              icon={FaChartLine}
              label="Attendance Report"
              onClick={handleNavClick}
            />
          </SidebarSection>

          <SidebarSection
            title="Notifications"
            icon={FaBell}
            isOpen={openSections["notifications-teacher"]}
            onToggle={() => toggleSection("notifications-teacher")}
            sectionId="notifications-teacher"
            isActive={isSectionActive([
              '/teacher/notifications',
              '/teacher/notifications/create',
              '/teacher/notifications/list'
            ])}
            isCollapsed={isCollapsed}
          >
            <SidebarSubItem
              to="/teacher/notifications/create"
              icon={FaPlus}
              label="Create Notification"
              onClick={handleNavClick}
            />
            <SidebarSubItem
              to="/teacher/notifications/list"
              icon={FaEnvelope}
              label="All Notifications"
              onClick={handleNavClick}
            />
          </SidebarSection>
        </>
      )}

      {/* ================= STUDENT MENU ================= */}
      {role === "STUDENT" && (
        <>
          <NavLink
            to="/student/profile"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
            role="menuitem"
            aria-label="My Profile"
            aria-current={isActiveRoute('/student/profile') ? "page" : undefined}
            onClick={handleNavClick}
          >
            <span className="nav-link-icon" aria-hidden="true">
              <FaCog />
            </span>
            <span className="nav-link-text">My Profile</span>
          </NavLink>

          <NavLink
            to="/student/timetable"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
            role="menuitem"
            aria-label="Timetable"
            aria-current={isActiveRoute('/student/timetable') ? "page" : undefined}
            onClick={handleNavClick}
          >
            <span className="nav-link-icon" aria-hidden="true">
              <FaCalendarAlt />
            </span>
            <span className="nav-link-text">Timetable</span>
          </NavLink>

          <NavLink
            to="/student/fees"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
            role="menuitem"
            aria-label="Fees"
            aria-current={isActiveRoute('/student/fees') ? "page" : undefined}
            onClick={handleNavClick}
          >
            <span className="nav-link-icon" aria-hidden="true">
              <FaMoneyBillWave />
            </span>
            <span className="nav-link-text">Fees</span>
          </NavLink>

          <NavLink
            to="/my-attendance"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
            role="menuitem"
            aria-label="My Attendance"
            aria-current={isActiveRoute('/my-attendance') ? "page" : undefined}
            onClick={handleNavClick}
          >
            <span className="nav-link-icon" aria-hidden="true">
              <FaClipboardList />
            </span>
            <span className="nav-link-text">My Attendance</span>
          </NavLink>

          <NavLink
            to="/notification/student"
            className={({ isActive }) =>
              `nav-link ${isActive ? "active-link" : ""}`
            }
            role="menuitem"
            aria-label="Notifications"
            aria-current={isActiveRoute('/notification/student') ? "page" : undefined}
            onClick={handleNavClick}
          >
            <span className="nav-link-icon" aria-hidden="true">
              <FaBell />
            </span>
            <span className="nav-link-text">Notifications</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}
