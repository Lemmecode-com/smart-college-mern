import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FaBell, FaCheck, FaBars, FaUser, FaSignOutAlt, FaCog, FaKey, FaChevronLeft, FaChevronRight } from "react-icons/fa";
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
          if (response.data && response.data.college_id) {
            setCollege(response.data.college_id);
          }
        } else if (user.role === "STUDENT") {
          response = await api.get("/students/my-profile");
          if (response.data && response.data.college) {
            setCollege(response.data.college);
          }
        }
      } catch (error) {
        if (error.response?.status !== 403 && error.response?.status !== 401) {
          console.error("Error fetching college info:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCollegeInfo();
  }, [user.college_id, user.role]);

  /* ================= FETCH COUNT (UNREAD ONLY) ================= */
  const fetchCount = async () => {
    try {
      let res;

      if (user.role === "COLLEGE_ADMIN")
        res = await api.get("/notifications/count/admin");
      if (user.role === "TEACHER")
        res = await api.get("/notifications/count/teacher");
      if (user.role === "STUDENT")
        res = await api.get("/notifications/count/student");

      const total = res?.data?.total || 0;

      if (prevCount.current && total > prevCount.current) {
        setToast("🔔 New notification received!");
        setTimeout(() => setToast(null), 3000);
      }

      prevCount.current = total;
      setCount(total);
    } catch (err) {
      console.error("Notification count error", err);
    }
  };

  /* ================= FETCH UNREAD FOR BELL ================= */
  const fetchNotes = async () => {
    setFetchingNotes(true);
    try {
      const res = await api.get("/notifications/unread/bell");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Bell fetch error", err);
    } finally {
      setFetchingNotes(false);
    }
  };

  /* ================= MARK AS READ ================= */
  const markAsRead = async (id) => {
    setMarkingRead(id);
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotes();
      fetchCount();
    } catch (err) {
      console.error("Mark read failed", err);
    } finally {
      setMarkingRead(null);
    }
  };

  /* ================= MARK ALL AS READ ================= */
  const markAllAsRead = async () => {
    try {
      const promises = notes.map((n) => api.post(`/notifications/${n._id}/read`));
      await Promise.all(promises);
      fetchNotes();
      fetchCount();
      setToast("✅ All notifications marked as read");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Mark all read failed", err);
      setToast("❌ Failed to mark all as read");
      setTimeout(() => setToast(null), 3000);
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

  /* ================= INITIAL ================= */
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

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
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  /* ================= GET USER INITIALS ================= */
  const getUserInitials = () => {
    if (user.email && user.email.includes("@")) {
      const name = user.email.split("@")[0];
      return name.substring(0, 2).toUpperCase();
    }
    return "U";
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
          className="position-fixed top-0 end-0 m-3 alert alert-success shadow animate__animated animate__fadeInDown"
          style={{ zIndex: 1080 }}
          role="alert"
        >
          {toast}
        </div>
      )}

      <Navbar
        expand="md"
        className="bg-white shadow-sm"
        style={{ 
          zIndex: 1020,
          width: '100%',
          minHeight: 'var(--navbar-height, 60px)'
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
                  fetchNotes();
                }
              }}
              align="end"
            >
              <div
                className="d-flex align-items-center justify-content-center cursor-pointer"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                  borderRadius: "50%",
                  transition: "background-color 0.2s",
                }}
                onClick={() => setNotifOpen(!notifOpen)}
                role="button"
                aria-label="Notifications"
                tabIndex={0}
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
                  className={notifOpen ? "text-primary" : "text-dark"}
                  aria-hidden="true"
                />

                {count > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{
                      fontSize: "10px",
                      padding: "3px 6px",
                      minWidth: "20px",
                    }}
                    aria-label={`${count} unread notifications`}
                  >
                    {count}
                  </Badge>
                )}
              </div>

              <Dropdown.Menu
                className="shadow-lg border-0"
                style={{
                  width: isMobile ? "280px" : "350px",
                  maxHeight: "70vh",
                  overflowY: "auto",
                }}
                role="menu"
                aria-label="Notification menu"
              >
                {/* Header */}
                <Dropdown.Header className="bg-light d-flex justify-content-between align-items-center p-2">
                  <span className="fw-bold mb-0" style={{ fontSize: "0.9rem" }}>
                    🔔 Unread Notifications
                  </span>
                  {notes.length > 0 && (
                    <button
                      className="btn btn-sm btn-link text-primary p-0"
                      onClick={markAllAsRead}
                      style={{ fontSize: "0.75rem" }}
                      aria-label="Mark all as read"
                    >
                      Mark all read
                    </button>
                  )}
                </Dropdown.Header>

                {/* Body */}
                <div className="p-2">
                  {fetchingNotes ? (
                    <div className="text-center py-4">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="text-muted small mt-2">Loading notifications...</p>
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-4">
                      <FaBell size={40} className="text-muted mb-2 opacity-25" />
                      <p className="text-muted small mb-0">No new notifications</p>
                    </div>
                  ) : (
                    notes.map((n) => (
                      <div
                        key={n._id}
                        className="p-2 rounded mb-2 small bg-light border border-light"
                        style={{ fontSize: "0.8rem" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                          e.currentTarget.style.transform = "translateX(2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "";
                          e.currentTarget.style.transform = "";
                        }}
                        role="menuitem"
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <strong className="d-block mb-1 text-dark">{n.title}</strong>
                          {markingRead === n._id && (
                            <div
                              className="spinner-border spinner-border-sm"
                              style={{ width: "12px", height: "12px" }}
                            />
                          )}
                        </div>
                        <div className="text-muted small mb-2" style={{ lineHeight: "1.4" }}>
                          {n.message}
                        </div>
                        {n.createdAt && (
                          <div className="text-muted" style={{ fontSize: "0.7rem", marginBottom: "6px" }}>
                            🕒 {formatDate(n.createdAt)}
                          </div>
                        )}
                        <div className="text-end">
                          <button
                            className="btn btn-sm btn-link text-success p-0"
                            onClick={() => markAsRead(n._id)}
                            disabled={markingRead === n._id}
                            style={{ fontSize: "0.75rem" }}
                            aria-label={`Mark ${n.title} as read`}
                          >
                            <FaCheck /> {markingRead === n._id ? "Marking..." : "Mark read"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="card-footer bg-light text-center p-2">
                  <button
                    className="btn btn-sm btn-primary w-100"
                    onClick={goToNotificationList}
                    style={{ fontSize: "0.8rem", minHeight: "44px" }}
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
            >
              <div
                className="d-flex align-items-center justify-content-center cursor-pointer"
                style={{
                  minWidth: "44px",
                  minHeight: "44px",
                }}
                onClick={() => setProfileOpen(!profileOpen)}
                role="button"
                aria-label="User menu"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setProfileOpen((prev) => !prev);
                  }
                }}
              >
                {/* Avatar Circle */}
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold"
                  style={{
                    width: isMobile ? "36px" : "40px",
                    height: isMobile ? "36px" : "40px",
                    fontSize: isMobile ? "0.85rem" : "0.95rem",
                    transition: "all 0.2s",
                    boxShadow: profileOpen ? "0 0 0 3px rgba(13, 110, 253, 0.25)" : "none",
                  }}
                  title={user.email}
                >
                  {getUserInitials()}
                </div>
              </div>

              <Dropdown.Menu
                className="shadow-lg border-0"
                style={{
                  width: isMobile ? "220px" : "240px",
                }}
                role="menu"
                aria-label="Profile menu"
              >
                {/* User Info Header */}
                <div className="card-header bg-light p-3 text-center">
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-2"
                    style={{ width: "56px", height: "56px", fontSize: "1.3rem", fontWeight: "bold" }}
                  >
                    {getUserInitials()}
                  </div>
                  <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: "0.9rem" }} title={user.email}>
                    {user.email}
                  </h6>
                </div>

                {/* Menu Items */}
                <div className="card-body p-2">
                  <button
                    className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-1"
                    onClick={goToProfile}
                    style={{ fontSize: "0.85rem", minHeight: "44px" }}
                    role="menuitem"
                  >
                    <FaUser /> My Profile
                  </button>
                  <button
                    className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-1"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    style={{ fontSize: "0.85rem", minHeight: "44px" }}
                    role="menuitem"
                  >
                    <FaCog /> Settings
                  </button>
                  <button
                    className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-2"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/change-password");
                    }}
                    style={{ fontSize: "0.85rem", minHeight: "44px" }}
                    role="menuitem"
                  >
                    <FaKey /> Change Password
                  </button>
                  <hr className="my-2" />
                  <button
                    className="btn btn-sm btn-outline-danger w-100 text-start d-flex align-items-center gap-2"
                    onClick={handleLogoutClick}
                    style={{ fontSize: "0.85rem", minHeight: "44px" }}
                    role="menuitem"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* User Email - Hidden on mobile */}
            <span
              className="text-muted small d-none d-md-block"
              style={{
                fontSize: "0.8rem",
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={user.email}
            >
              {user.email}
            </span>
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
