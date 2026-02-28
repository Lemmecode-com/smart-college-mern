import { useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import { toast } from "react-toastify";
import { Offcanvas } from "react-bootstrap";
import { FaGraduationCap, FaBars, FaTimes } from "react-icons/fa";
import SidebarNav from "./SidebarNav";
import SidebarLogo from "./SidebarLogo";
import SidebarFooter from "./SidebarFooter";
import ConfirmModal from "../ConfirmModal";
import "./Sidebar.css";

/**
 * SidebarContainer - Main sidebar component
 * Enterprise SaaS Standard:
 * - Consistent collapsed state handling
 * - Accessible navigation with ARIA attributes
 * - Responsive behavior with smooth transitions
 * - Body scroll lock on mobile
 */
export default function SidebarContainer({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  const [isMobileDevice, setIsMobileDevice] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // Handle window resize with debounce to prevent rapid firing at breakpoint
  useEffect(() => {
    if (typeof window === "undefined") return;

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const mobile = window.innerWidth < 768;
        setIsMobileDevice(mobile);
        if (!mobile && isMobileOpen) {
          setIsMobileOpen(false);
        }
        // Add transitioning class for smooth animation
        document.body.classList.add('sidebar-resizing');
        setTimeout(() => document.body.classList.remove('sidebar-resizing'), 300);
      }, 50);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [isMobileOpen, setIsMobileOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, setIsMobileOpen]);

  // Lock body scroll and prevent content shift when sidebar opens
  useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add('sidebar-open');
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0';
    } else {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isMobileOpen]);

  // Add has-sidebar class for content sync on desktop
  useEffect(() => {
    if (!isMobileDevice) {
      document.body.classList.add('has-sidebar');
    } else {
      document.body.classList.remove('has-sidebar');
    }

    return () => {
      document.body.classList.remove('has-sidebar');
    };
  }, [isMobileDevice]);

  const toggleSection = useCallback((section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Show logout confirmation modal
  const handleLogoutClick = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  // Confirm and perform logout
  const handleConfirmLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      await logout();
      toast.success("Logged out successfully", {
        position: "top-right",
        autoClose: 3000
      });
      // Redirect to login page after successful logout
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to logout. Please try again.", {
        position: "top-right",
        autoClose: 5000
      });
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  // Close modal without logout
  const handleCancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  if (!user) return null;

  const role = user.role;

  return (
    <>
      {/* Desktop Sidebar - Supports collapsed state */}
      <div
        className={`sidebar-container d-none d-md-block ${isCollapsed ? 'sidebar-collapsed' : ''}`}
        role="navigation"
        aria-label="Main navigation"
        aria-expanded={!isCollapsed}
        data-collapsed={isCollapsed}
      >
        <aside className="sidebar-content" role="menubar">
          <SidebarLogo role={role} isCollapsed={isCollapsed} />
          <SidebarNav
            role={role}
            openSections={openSections}
            toggleSection={toggleSection}
            isMobileDevice={false}
            isCollapsed={isCollapsed}
            onClose={() => {}}
          />
          <SidebarFooter
            loggingOut={loggingOut}
            onLogout={handleLogoutClick}
            isCollapsed={isCollapsed}
          />
        </aside>
      </div>

      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas
        show={isMobileOpen && isMobileDevice}
        onHide={() => setIsMobileOpen(false)}
        placement="start"
        className="sidebar-offcanvas"
        backdrop="static"
        scroll={false}
        aria-label="Mobile navigation menu"
      >
        <Offcanvas.Header closeButton className="border-0 pb-0">
          <Offcanvas.Title>
            <div className="d-flex align-items-center gap-2">
              <FaGraduationCap size={24} className="text-primary" />
              <span className="fw-bold">NOVAA</span>
            </div>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="offcanvas-logo-section p-3 border-bottom">
            <div
              className="text-center"
              aria-label={`User role: ${role?.replace("_", " ") || "User"}`}
            >
              <Badge bg="dark" className="text-uppercase" style={{ fontSize: "0.75rem" }}>
                {role?.replace("_", " ") || "User"}
              </Badge>
            </div>
          </div>
          <div className="offcanvas-nav-section">
            <SidebarNav
              role={role}
              openSections={openSections}
              toggleSection={toggleSection}
              isMobileDevice={true}
              isCollapsed={false}
              onClose={() => setIsMobileOpen(false)}
            />
          </div>
          <div className="offcanvas-footer-section p-3 border-top">
            <SidebarFooter
              loggingOut={loggingOut}
              onLogout={handleLogoutClick}
              isCollapsed={false}
            />
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        title="Logout Confirmation"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        type="danger"
        confirmText="Logout"
        cancelText="Cancel"
        isLoading={loggingOut}
      />
    </>
  );
}

// Simple Badge component since we're using react-bootstrap
function Badge({ children, bg, className, style }) {
  return (
    <span
      className={`badge bg-${bg} ${className || ""}`}
      style={style}
    >
      {children}
    </span>
  );
}
