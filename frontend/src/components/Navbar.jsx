import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { logger } from "../utils/logger";
import { FaBell, FaCheck, FaBars, FaUser, FaSignOutAlt, FaCog, FaKey, FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { Dropdown, Badge, Navbar, Container, Nav } from "react-bootstrap";
import ConfirmModal from "./ConfirmModal";
import "./Navbar.css";

export default function NavbarComponent({ onToggleSidebar, onToggleCollapse, isSidebarCollapsed }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [college, setCollege] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [fetchingNotes, setFetchingNotes] = useState(false);
  const [markingRead, setMarkingRead] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rateLimitBackoff, setRateLimitBackoff] = useState(false);
  const [backoffUntil, setBackoffUntil] = useState(null);

  const prevCount = useRef(0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return null;

  // Auto-clear backoff when time expires
  useEffect(() => {
    if (rateLimitBackoff && backoffUntil) {
      const checkBackoff = setInterval(() => {
        if (Date.now() >= backoffUntil) {
          setRateLimitBackoff(false);
          setBackoffUntil(null);
        }
      }, 1000);
      return () => clearInterval(checkBackoff);
    }
  }, [rateLimitBackoff, backoffUntil]);

  // Fetch college information when user is available
  useEffect(() => {
    const fetchCollegeInfo = async () => {
      setLoading(true);
      try {
        let response;

        if (user.role === "COLLEGE_ADMIN") {
          response = await api.get("/college/my-college");
          setCollege(response.data);
        } else if (user.role === "TEACHER") {
          response = await api.get("/teachers/my-profile");
          if (response.data && response.data.teacher && response.data.teacher.college_id) {
            setCollege(response.data.teacher.college_id);
          }
        } else if (user.role === "STUDENT") {
          response = await api.get("/students/my-profile");
          if (response.data && response.data.college) {
            setCollege(response.data.college);
          }
        }
      } catch (error) {
        if (error.response?.status !== 403 && error.response?.status !== 401) {
          logger.error("Error fetching college info:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCollegeInfo();
  }, [user.college_id, user.role]);

  /* ================= FETCH COUNT (UNREAD ONLY) ================= */
  const fetchCount = async (silent = false) => {
    // Skip if in backoff period
    if (rateLimitBackoff && backoffUntil && Date.now() < backoffUntil) {
      return;
    }

    try {
      let res;

      if (user.role === "COLLEGE_ADMIN")
        res = await api.get("/notifications/count/admin");
      if (user.role === "TEACHER")
        res = await api.get("/notifications/count/teacher");
      if (user.role === "STUDENT")
        res = await api.get("/notifications/count/student");

      const total = res?.data?.total || 0;

      // Detect new notifications and show toast
      if (prevCount.current && total > prevCount.current) {
        const newCount = total - prevCount.current;
        setToast(`🔔 ${newCount} new notification${newCount > 1 ? 's' : ''} received!`);
        setTimeout(() => setToast(null), 4000);
      }

      prevCount.current = total;
      setCount(total);

      // Clear backoff on success
      if (rateLimitBackoff) {
        setRateLimitBackoff(false);
        setBackoffUntil(null);
      }
    } catch (err) {
      // Handle rate limit (429) - stop polling temporarily
      if (err.response?.status === 429) {
        const backoffMs = 30000; // 30 second backoff for notification polling
        setRateLimitBackoff(true);
        setBackoffUntil(Date.now() + backoffMs);
        if (!silent) {
          setToast("⏳ Too many requests. Pausing notifications...");
          setTimeout(() => setToast(null), 3000);
        }
        logger.warn("Notification polling rate limited - backing off for 30s");
      } else if (err.response?.status !== 403 && err.response?.status !== 401) {
        logger.error("Notification count error", err);
      }
    }
  };

  /* ================= FETCH UNREAD FOR BELL ================= */
  const fetchNotes = async () => {
    setFetchingNotes(true);
    try {
      const res = await api.get("/notifications/unread/bell");
      // Backend now returns array directly: [...]
      // Axios interceptor keeps arrays as-is
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      logger.error("Bell fetch error", err);
      setNotes([]);
    } finally {
      setFetchingNotes(false);
    }
  };

  /* ================= MARK AS READ ================= */
  const markAsRead = async (id) => {
    setMarkingRead(id);
    try {
      // Use correct endpoint parameter name: notificationId
      await api.post(`/notifications/${id}/mark-read`);
      
      // Optimistic update - remove from list immediately
      setNotes(prev => prev.filter(n => n._id !== id));
      
      // Update count in background
      fetchCount();
      
      // Show success feedback
      setToast("✅ Notification marked as read");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      logger.error("Mark read failed", err);
      setToast("❌ Failed to mark as read");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setMarkingRead(null);
    }
  };

  /* ================= MARK ALL AS READ ================= */
  const markAllAsRead = async () => {
    try {
      // Optimistic update - clear all notifications immediately
      const previousNotes = [...notes];
      setNotes([]);
      setCount(0);
      
      // Mark all as read in background
      const promises = previousNotes.map((n) => api.post(`/notifications/${n._id}/read`));
      await Promise.all(promises);
      
      // Refresh count to ensure sync
      fetchCount();
      
      setToast("✅ All notifications marked as read");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      logger.error("Mark all read failed", err);
      setToast("❌ Failed to mark all as read");
      setTimeout(() => setToast(null), 3000);
      // Revert optimistic update on error
      fetchNotes();
      fetchCount();
    }
  };

  /* ================= ROLE BASED VIEW ALL ================= */
  const goToNotificationList = () => {
    setNotifOpen(false);
    if (user.role === "COLLEGE_ADMIN") {
      navigate("/notification/list");
    } else if (user.role === "TEACHER") {
      navigate("/teacher/notifications/list");
    } else if (user.role === "STUDENT") {
      navigate("/notification/student");
    }
  };

  /* ================= PROFILE NAVIGATION ================= */
  const goToProfile = () => {
    setProfileOpen(false);
    if (user.role === "COLLEGE_ADMIN") {
      navigate("/college/profile");
    } else if (user.role === "TEACHER") {
      navigate("/teacher/profile");
    } else if (user.role === "STUDENT") {
      navigate("/student/profile");
    }
  };

  /* ================= INITIAL POLLING ================= */
  useEffect(() => {
    fetchCount(true); // Silent initial fetch
    const interval = setInterval(() => {
      // Skip polling if in backoff period
      if (!rateLimitBackoff) {
        fetchCount(true); // Silent polling for count
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user, rateLimitBackoff]);

  /* ================= FETCH NOTES WHEN COUNT INCREASES ================= */
  useEffect(() => {
    // Only fetch notes if count increased (new notifications arrived)
    if (count > 0 && count > prevCount.current) {
      fetchNotes(); // ✅ Auto-fetch new notifications
    }
    // Update ref for next comparison
    prevCount.current = count;
  }, [count]);

  /* ================= KEYBOARD SHORTCUTS ================= */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setNotifOpen((prev) => !prev);
        if (!notifOpen) fetchNotes();
      }
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [notifOpen]);

  /* ================= LOGOUT ================= */
  const handleLogoutClick = () => {
    setProfileOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      logger.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  /* ================= GET USER INITIALS ================= */
  const getUserInitials = () => {
    // Priority 1: Use user.name from context (dynamically fetched)
    if (user.name) {
      const nameParts = user.name.trim().split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    // Priority 2: Use user.email from context (dynamically fetched)
    if (user.email && user.email.includes("@")) {
      const name = user.email.split("@")[0];
      // Convert dots/underscores to spaces and extract name
      const cleanName = name.replace(/[._]/g, ' ').trim();
      const nameParts = cleanName.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return nameParts[0][0].toUpperCase();
    }
    
    // Fallback: Use role-based initial
    if (user.role) {
      return user.role.charAt(0).toUpperCase();
    }
    
    return "U";
  };

  /* ================= GET USER DISPLAY NAME ================= */
  const getUserDisplayName = () => {
    // Priority 1: Use user.name from context (dynamically fetched)
    if (user.name) {
      return user.name;
    }
    
    // Priority 2: Use user.email from context (dynamically fetched)
    if (user.email && user.email.includes("@")) {
      const emailName = user.email.split("@")[0];
      // Convert dots/underscores to spaces and capitalize
      const cleanName = emailName.replace(/[._]/g, ' ').trim();
      return cleanName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Fallback: Use role
    if (user.role) {
      return user.role.replace('_', ' ');
    }
    
    return 'User';
  };

  /* ================= FORMAT DATE ================= */
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className="toast-notification"
          role="alert"
        >
          {toast}
        </div>
      )}

      <Navbar
        expand="md"
        className="bg-dark-navbar"
        style={{
          zIndex: 1020,
          width: '100%',
          minHeight: 'var(--navbar-height, 64px)'
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <Container fluid className="navbar-fluid-container d-flex justify-content-between align-items-center">
          {/* LEFT - With Mobile Toggle */}
          <div className="d-flex align-items-center gap-3">
            {/* MOBILE HAMBURGER BUTTON - Visible only on mobile */}
            {isMobile && (
              <button
                className="navbar-toggler border-0 p-2"
                onClick={onToggleSidebar}
                aria-label="Toggle sidebar"
                aria-expanded="false"
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <FaBars size={20} />
              </button>
            )}

            {/* DESKTOP SIDEBAR COLLAPSE TOGGLE - Visible only on desktop/tablet */}
            {!isMobile && onToggleCollapse && (
              <button
                className="sidebar-collapse-toggle-navbar"
                onClick={onToggleCollapse}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!isSidebarCollapsed}
                type="button"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            )}

            {/* College Name / Logo */}
            {loading ? (
              <div
                className="spinner-border spinner-border-sm text-primary"
                role="status"
                aria-label="Loading"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : college ? (
              <Navbar.Brand
                className="mb-0 fw-bold text-primary cursor-pointer"
                onClick={() => navigate("/dashboard")}
                title="Go to Dashboard"
                style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}
              >
                {college.name}
              </Navbar.Brand>
            ) : (
              <Navbar.Brand
                className="mb-0 fw-bold text-primary cursor-pointer"
                onClick={() => navigate("/dashboard")}
                title="Go to Dashboard"
                style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}
              >
                NOVAA
              </Navbar.Brand>
            )}
          </div>

          {/* RIGHT */}
          <Nav className="nav-items-gap d-flex align-items-center flex-row">
            {/* BELL NOTIFICATION - Clickable Icon with Dropdown */}
            <Dropdown
              show={notifOpen}
              onToggle={(isOpen) => {
                setNotifOpen(isOpen);
                if (isOpen) {
                  setProfileOpen(false);
                  // Force fresh fetch when opening dropdown
                  fetchNotes();
                }
              }}
              align="end"
            >
              <div
                className="navbar-icon-button notification-bell"
                role="button"
                aria-label="Notifications"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNotifOpen(!notifOpen);
                  if (!notifOpen) fetchNotes();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setNotifOpen((prev) => !prev);
                    if (!notifOpen) fetchNotes();
                  }
                }}
              >
                <FaBell
                  size={isMobile ? 18 : 20}
                  className={notifOpen ? "text-primary" : "text-secondary"}
                  aria-hidden="true"
                />

                {count > 0 && (
                  <Badge
                    bg="danger"
                    className="notification-badge"
                    aria-label={`${count} unread notifications`}
                    data-badge={count > 99 ? '99+' : count}
                  >
                    {count > 99 ? '99+' : count}
                  </Badge>
                )}
              </div>

              <Dropdown.Menu
                className="notification-dropdown shadow-lg"
                role="menu"
                aria-label="Notification menu"
              >
                {/* Header */}
                <Dropdown.Header className="dropdown-header d-flex justify-content-between align-items-center">
                  <span className="mb-0">
                    🔔 Unread Notifications
                  </span>
                  {notes.length > 0 && (
                    <button
                      className="btn btn-sm btn-link text-primary p-0 notification-mark-all-btn"
                      onClick={markAllAsRead}
                      aria-label="Mark all as read"
                    >
                      Mark all read
                    </button>
                  )}
                </Dropdown.Header>

                {/* Body */}
                <div className="p-2">
                  {fetchingNotes ? (
                    <div className="notification-loading">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted small mt-2">Loading notifications...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="notification-empty">
                      <FaBell size={40} className="mb-2" />
                      <p className="small mb-0">No new notifications</p>
                    </div>
                  ) : (
                    notes.map((n) => (
                      <div
                        key={n._id}
                        className="notification-card"
                        role="menuitem"
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <strong className="notification-card-title flex-grow-1">
                            {n.title}
                          </strong>
                          {markingRead === n._id && (
                            <div
                              className="spinner-border spinner-border-sm text-primary flex-shrink-0"
                              style={{ width: "14px", height: "14px" }}
                              role="status"
                            />
                          )}
                        </div>
                        <div className="notification-card-message">
                          {n.message.length > 80 ? `${n.message.substring(0, 80)}...` : n.message}
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          {n.createdAt && (
                            <div className="notification-card-time">
                              🕒 {formatDate(n.createdAt)}
                            </div>
                          )}
                          <button
                            className="notification-mark-read-btn ms-auto"
                            onClick={() => markAsRead(n._id)}
                            disabled={markingRead === n._id}
                            aria-label={`Mark ${n.title} as read`}
                            title="Mark as read"
                          >
                            <FaCheck /> {markingRead === n._id ? "..." : ""}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="dropdown-footer">
                  <button
                    className="btn btn-sm btn-primary w-100"
                    onClick={goToNotificationList}
                  >
                    View All Notifications →
                  </button>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* User Profile Dropdown - Clickable Icon */}
            <Dropdown
              show={profileOpen}
              onToggle={(isOpen) => {
                setProfileOpen(isOpen);
                if (isOpen) setNotifOpen(false);
              }}
              align="end"
              drop="down"
            >
              <Dropdown.Toggle
                as="div"
                className="navbar-user-dropdown p-0"
                id="profile-dropdown-toggle"
                role="button"
                aria-label="User menu"
                tabIndex={0}
                onClick={() => setProfileOpen(!profileOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setProfileOpen((prev) => !prev);
                  }
                }}
              >
                {/* Avatar Circle */}
                <div
                  className="profile-avatar-navbar"
                  title={getUserDisplayName()}
                >
                  {getUserInitials()}
                </div>
                {/* User Name - Desktop Only */}
                <span className="user-name-display d-none d-lg-block">
                  {getUserDisplayName()}
                </span>
                {/* Chevron Down */}
                <FaChevronDown className="user-dropdown-chevron d-none d-lg-block" />
              </Dropdown.Toggle>

              <Dropdown.Menu
                className="profile-dropdown shadow-lg"
                role="menu"
                aria-label="Profile menu"
                aria-labelledby="profile-dropdown-toggle"
              >
                {/* User Info Header - Enterprise SaaS Layout */}
                <div className="profile-header">
                  <div className="profile-header-content">
                    <div className="profile-avatar-large">
                      {getUserInitials()}
                    </div>
                    <div className="profile-user-info">
                      <h6 className="profile-user-name" title={getUserDisplayName()}>
                        {getUserDisplayName()}
                      </h6>
                      <p className="profile-user-email" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="profile-role-section">
                    <span className="profile-role-badge">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Menu Items - Organized in Groups */}
                <div className="profile-menu-body">
                  <div className="profile-menu-group">
                    <div className="profile-menu-group-title">Account</div>
                    <button
                      className="profile-menu-item"
                      onClick={goToProfile}
                      role="menuitem"
                    >
                      <div className="profile-menu-item-icon">
                        <FaUser />
                      </div>
                      <div className="profile-menu-item-content">
                        <span className="profile-menu-item-title">My Profile</span>
                        <span className="profile-menu-item-subtitle">View and edit your profile</span>
                      </div>
                      <FaChevronRight className="profile-menu-item-arrow" />
                    </button>
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/settings");
                      }}
                      role="menuitem"
                    >
                      <div className="profile-menu-item-icon">
                        <FaCog />
                      </div>
                      <div className="profile-menu-item-content">
                        <span className="profile-menu-item-title">Settings</span>
                        <span className="profile-menu-item-subtitle">Manage preferences</span>
                      </div>
                      <FaChevronRight className="profile-menu-item-arrow" />
                    </button>
                    <button
                      className="profile-menu-item"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/change-password");
                      }}
                      role="menuitem"
                    >
                      <div className="profile-menu-item-icon">
                        <FaKey />
                      </div>
                      <div className="profile-menu-item-content">
                        <span className="profile-menu-item-title">Change Password</span>
                        <span className="profile-menu-item-subtitle">Update your password</span>
                      </div>
                      <FaChevronRight className="profile-menu-item-arrow" />
                    </button>
                  </div>

                  <div className="profile-menu-divider" />

                  <div className="profile-menu-group">
                    <button
                      className="profile-menu-item profile-menu-item-danger"
                      onClick={handleLogoutClick}
                      role="menuitem"
                    >
                      <div className="profile-menu-item-icon">
                        <FaSignOutAlt />
                      </div>
                      <div className="profile-menu-item-content">
                        <span className="profile-menu-item-title">Logout</span>
                        <span className="profile-menu-item-subtitle">Sign out of your account</span>
                      </div>
                      <FaChevronRight className="profile-menu-item-arrow" />
                    </button>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Container>
      </Navbar>

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

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cursor-pointer {
          cursor: pointer;
        }

        .animate__animated {
          animation-duration: 0.3s;
          animation-fill-mode: both;
        }

        .animate__fadeInDown {
          animation-name: fadeInDown;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate3d(0, -20px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </>
  );
}
