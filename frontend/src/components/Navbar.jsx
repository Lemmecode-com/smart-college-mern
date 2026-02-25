import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FaBell, FaCheck, FaBars } from "react-icons/fa";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [college, setCollege] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const prevCount = useRef(0);
  const dropdownRef = useRef();

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
      if (user.college_id) {
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
          // Silently handle auth errors - don't log to console
          // This prevents console spam when session expires
          if (error.response?.status !== 403 && error.response?.status !== 401) {
            console.error("Error fetching college info:", error);
          }
        }
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
    try {
      const res = await api.get("/notifications/unread/bell");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Bell fetch error", err);
    }
  };

  /* ================= MARK AS READ ================= */
  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotes();
      fetchCount();
    } catch (err) {
      console.error("Mark read failed", err);
    }
  };

  /* ================= ROLE BASED VIEW ALL ================= */
  const goToNotificationList = () => {
    if (user.role === "COLLEGE_ADMIN") {
      navigate("/notification/list");
    } else if (user.role === "TEACHER") {
      navigate("/teacher/notifications/list");
    } else if (user.role === "STUDENT") {
      navigate("/notification/student");
    }
  };

  /* ================= INITIAL ================= */
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  /* ================= CLOSE DROPDOWN ON OUTSIDE ================= */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    logout();
    navigate("/login");
  };

  return (
    <>
      {toast && (
        <div
          className="position-fixed top-0 end-0 m-3 alert alert-success shadow"
          style={{ zIndex: 3000 }}
        >
          {toast}
        </div>
      )}

      <nav className="navbar navbar-light bg-white px-3 px-md-4 shadow-sm d-flex justify-content-between align-items-center" style={{ position: "relative", zIndex: 1060 }}>
        {/* LEFT - With Mobile Toggle */}
        <div className="d-flex align-items-center gap-3">
          {/* MOBILE HAMBURGER BUTTON */}
          {isMobile && (
            <button
              className="btn btn-link text-dark p-0 me-2"
              onClick={onToggleSidebar}
              style={{ fontSize: "1.5rem", border: "none", zIndex: 1070 }}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>
          )}

          {college ? (
            <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
              {college.name}
            </h5>
          ) : (
            <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
              NOVAA
            </h5>
          )}

          <div className="d-flex flex-wrap gap-2">
            <span className="badge bg-dark" style={{ fontSize: isMobile ? "0.65rem" : "0.75rem" }}>
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="d-flex align-items-center gap-2 gap-md-4 position-relative">
          {/* BELL */}
          <div
            className="position-relative"
            ref={dropdownRef}
            style={{ cursor: "pointer", zIndex: 3000 }}
          >
            <FaBell
              size={isMobile ? 18 : 20}
              onClick={() => {
                setOpen(!open);
                fetchNotes();
              }}
            />

            {count > 0 && (
              <span
                className="badge bg-danger rounded-pill"
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-8px",
                  fontSize: "10px",
                  padding: "2px 5px",
                  minWidth: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {count}
              </span>
            )}

            {open && (
              <div
                className="card shadow border-0 position-absolute"
                style={{ 
                  width: isMobile ? "280px" : "320px",
                  zIndex: 3000,
                  top: "calc(100% + 10px)",
                  right: isMobile ? "-120px" : "0",
                  left: isMobile ? "auto" : "auto",
                  maxHeight: "80vh",
                  overflowY: "auto"
                }}
              >
                <div className="card-body p-2">
                  <h6 className="fw-bold text-center mb-3" style={{ fontSize: "0.9rem" }}>
                    Unread Notifications
                  </h6>

                  {notes.length === 0 && (
                    <p className="text-muted small text-center py-3">
                      No new notifications
                    </p>
                  )}

                  {notes.map((n) => (
                    <div
                      key={n._id}
                      className="p-2 rounded mb-1 small bg-warning bg-opacity-25"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <strong className="d-block mb-1">{n.title}</strong>
                      <div className="text-muted small mb-2">
                        {n.message}
                      </div>

                      <div className="text-end">
                        <button
                          className="btn btn-sm btn-link text-success p-0"
                          onClick={() => markAsRead(n._id)}
                          style={{ fontSize: "0.75rem" }}
                        >
                          <FaCheck /> Mark read
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="text-center mt-3">
                    <button
                      className="btn btn-sm btn-primary w-100"
                      onClick={goToNotificationList}
                      style={{ fontSize: "0.8rem" }}
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* USER EMAIL - Hidden on very small screens */}
          <span className="text-muted small d-none d-md-block" style={{ fontSize: "0.8rem" }}>
            {user.email}
          </span>

          {/* LOGOUT */}
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
            style={{ fontSize: isMobile ? "0.7rem" : "0.875rem", padding: isMobile ? "0.25rem 0.5rem" : "0.25rem 0.75rem" }}
          >
            <span className="d-none d-md-inline">Logout</span>
            <span className="d-md-none">🚪</span>
          </button>
        </div>
      </nav>
    </>
  );
}