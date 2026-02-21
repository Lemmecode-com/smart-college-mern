// import { useContext, useEffect, useRef, useState } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { useNavigate } from "react-router-dom";
// import api from "../api/axios";
// import { FaBell, FaCheck, FaBars } from "react-icons/fa";

// export default function Navbar({ onToggleSidebar }) {
//   const { user, logout } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const [count, setCount] = useState(0);
//   const [open, setOpen] = useState(false);
//   const [notes, setNotes] = useState([]);
//   const [toast, setToast] = useState(null);
//   const [college, setCollege] = useState(null);
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

//   const prevCount = useRef(0);
//   const dropdownRef = useRef();

//   // Handle window resize
//   useEffect(() => {
//     const handleResize = () => {
//       setIsMobile(window.innerWidth < 768);
//     };

//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   if (!user) return null;

//   // Fetch college information when user is available
//   useEffect(() => {
//     const fetchCollegeInfo = async () => {
//       if (user.college_id) {
//         try {
//           let response;

//           if (user.role === "COLLEGE_ADMIN") {
//             response = await api.get("/college/my-college");
//             setCollege(response.data);
//           } else if (user.role === "TEACHER") {
//             response = await api.get("/teachers/my-profile");
//             if (response.data && response.data.college_id) {
//               setCollege(response.data.college_id);
//             }
//           } else if (user.role === "STUDENT") {
//             response = await api.get("/students/my-profile");
//             if (response.data && response.data.college) {
//               setCollege(response.data.college);
//             }
//           }
//         } catch (error) {
//           // Silently handle auth errors - don't log to console
//           // This prevents console spam when session expires
//           if (error.response?.status !== 403 && error.response?.status !== 401) {
//             console.error("Error fetching college info:", error);
//           }
//         }
//       }
//     };

//     fetchCollegeInfo();
//   }, [user.college_id, user.role]);

//   /* ================= FETCH COUNT (UNREAD ONLY) ================= */
//   const fetchCount = async () => {
//     try {
//       let res;

//       if (user.role === "COLLEGE_ADMIN")
//         res = await api.get("/notifications/count/admin");
//       if (user.role === "TEACHER")
//         res = await api.get("/notifications/count/teacher");
//       if (user.role === "STUDENT")
//         res = await api.get("/notifications/count/student");

//       const total = res?.data?.total || 0;

//       if (prevCount.current && total > prevCount.current) {
//         setToast("🔔 New notification received!");
//         setTimeout(() => setToast(null), 3000);
//       }

//       prevCount.current = total;
//       setCount(total);
//     } catch (err) {
//       console.error("Notification count error", err);
//     }
//   };

//   /* ================= FETCH UNREAD FOR BELL ================= */
//   const fetchNotes = async () => {
//     try {
//       const res = await api.get("/notifications/unread/bell");
//       setNotes(res.data || []);
//     } catch (err) {
//       console.error("Bell fetch error", err);
//     }
//   };

//   /* ================= MARK AS READ ================= */
//   const markAsRead = async (id) => {
//     try {
//       await api.post(`/notifications/${id}/read`);
//       fetchNotes();
//       fetchCount();
//     } catch (err) {
//       console.error("Mark read failed", err);
//     }
//   };

//   /* ================= ROLE BASED VIEW ALL ================= */
//   const goToNotificationList = () => {
//     if (user.role === "COLLEGE_ADMIN") {
//       navigate("/notification/list");
//     } else if (user.role === "TEACHER") {
//       navigate("/teacher/notifications/list");
//     } else if (user.role === "STUDENT") {
//       navigate("/notification/student");
//     }
//   };

//   /* ================= INITIAL ================= */
//   useEffect(() => {
//     fetchCount();
//     const interval = setInterval(fetchCount, 15000);
//     return () => clearInterval(interval);
//   }, [user]);

//   /* ================= CLOSE DROPDOWN ON OUTSIDE ================= */
//   useEffect(() => {
//     const handleClick = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   /* ================= LOGOUT ================= */
//   const handleLogout = () => {
//     if (!window.confirm("Are you sure you want to logout?")) return;
//     logout();
//     navigate("/login");
//   };

//   return (
//     <>
//       {toast && (
//         <div
//           className="position-fixed top-0 end-0 m-3 alert alert-success shadow"
//           style={{ zIndex: 3000 }}
//         >
//           {toast}
//         </div>
//       )}

//       <nav className="navbar navbar-light bg-white px-3 px-md-4 shadow-sm d-flex justify-content-between align-items-center" style={{ position: "relative", zIndex: 1060 }}>
//         {/* LEFT - With Mobile Toggle */}
//         <div className="d-flex align-items-center gap-3">
//           {/* MOBILE HAMBURGER BUTTON */}
//           {isMobile && (
//             <button
//               className="btn btn-link text-dark p-0 me-2"
//               onClick={onToggleSidebar}
//               style={{ fontSize: "1.5rem", border: "none", zIndex: 1070 }}
//               aria-label="Toggle sidebar"
//             >
//               <FaBars />
//             </button>
//           )}

//           {college ? (
//             <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
//               {college.name}
//             </h5>
//           ) : (
//             <h5 className="mb-0 fw-bold text-primary" style={{ fontSize: isMobile ? "0.9rem" : "1.1rem" }}>
//               NOVAA
//             </h5>
//           )}

//           <div className="d-flex flex-wrap gap-2">
//             <span className="badge bg-dark" style={{ fontSize: isMobile ? "0.65rem" : "0.75rem" }}>
//               {user.role.replace("_", " ")}
//             </span>
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="d-flex align-items-center gap-2 gap-md-4 position-relative">
//           {/* BELL */}
//           <div
//             className="position-relative"
//             ref={dropdownRef}
//             style={{ cursor: "pointer", zIndex: 3000 }}
//           >
//             <FaBell
//               size={isMobile ? 18 : 20}
//               onClick={() => {
//                 setOpen(!open);
//                 fetchNotes();
//               }}
//             />

//             {count > 0 && (
//               <span
//                 className="badge bg-danger rounded-pill"
//                 style={{
//                   position: "absolute",
//                   top: "-6px",
//                   right: "-8px",
//                   fontSize: "10px",
//                   padding: "2px 5px",
//                   minWidth: "18px",
//                   height: "18px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center"
//                 }}
//               >
//                 {count}
//               </span>
//             )}

//             {open && (
//               <div
//                 className="card shadow border-0 position-absolute"
//                 style={{ 
//                   width: isMobile ? "280px" : "320px",
//                   zIndex: 3000,
//                   top: "calc(100% + 10px)",
//                   right: isMobile ? "-120px" : "0",
//                   left: isMobile ? "auto" : "auto",
//                   maxHeight: "80vh",
//                   overflowY: "auto"
//                 }}
//               >
//                 <div className="card-body p-2">
//                   <h6 className="fw-bold text-center mb-3" style={{ fontSize: "0.9rem" }}>
//                     Unread Notifications
//                   </h6>

//                   {notes.length === 0 && (
//                     <p className="text-muted small text-center py-3">
//                       No new notifications
//                     </p>
//                   )}

//                   {notes.map((n) => (
//                     <div
//                       key={n._id}
//                       className="p-2 rounded mb-1 small bg-warning bg-opacity-25"
//                       style={{ fontSize: "0.8rem" }}
//                     >
//                       <strong className="d-block mb-1">{n.title}</strong>
//                       <div className="text-muted small mb-2">
//                         {n.message}
//                       </div>

//                       <div className="text-end">
//                         <button
//                           className="btn btn-sm btn-link text-success p-0"
//                           onClick={() => markAsRead(n._id)}
//                           style={{ fontSize: "0.75rem" }}
//                         >
//                           <FaCheck /> Mark read
//                         </button>
//                       </div>
//                     </div>
//                   ))}

//                   <div className="text-center mt-3">
//                     <button
//                       className="btn btn-sm btn-primary w-100"
//                       onClick={goToNotificationList}
//                       style={{ fontSize: "0.8rem" }}
//                     >
//                       View All
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* USER EMAIL - Hidden on very small screens */}
//           <span className="text-muted small d-none d-md-block" style={{ fontSize: "0.8rem" }}>
//             {user.email}
//           </span>

//           {/* LOGOUT */}
//           <button
//             className="btn btn-outline-danger btn-sm"
//             onClick={handleLogout}
//             style={{ fontSize: isMobile ? "0.7rem" : "0.875rem", padding: isMobile ? "0.25rem 0.5rem" : "0.25rem 0.75rem" }}
//           >
//             <span className="d-none d-md-inline">Logout</span>
//             <span className="d-md-none">🚪</span>
//           </button>
//         </div>
//       </nav>
//     </>
//   );
// }


import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FaBell, FaCheck, FaBars, FaUser, FaSignOutAlt, FaCog, FaKey, FaTimes } from "react-icons/fa";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [college, setCollege] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [fetchingNotes, setFetchingNotes] = useState(false);
  const [markingRead, setMarkingRead] = useState(null);

  const prevCount = useRef(0);
  const dropdownRef = useRef();
  const profileDropdownRef = useRef();

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
        // Silently handle auth errors - don't log to console
        // This prevents console spam when session expires
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
    setOpen(false);
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

  /* ================= CLOSE DROPDOWNS ON OUTSIDE CLICK ================= */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ================= KEYBOARD SHORTCUTS ================= */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+B or Cmd+B for notifications
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setOpen(!open);
        if (!open) fetchNotes();
      }
      // Escape to close dropdowns
      if (e.key === "Escape") {
        setOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    setProfileOpen(false);
    logout();
    navigate("/login");
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
          style={{ zIndex: 3000 }}
          role="alert"
        >
          {toast}
        </div>
      )}

      <nav
        className="navbar navbar-light bg-white px-3 px-md-4 shadow-sm d-flex justify-content-between align-items-center"
        style={{ position: "relative", zIndex: 1060 }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* LEFT - With Mobile Toggle */}
        <div className="d-flex align-items-center gap-3">
          {/* MOBILE HAMBURGER BUTTON */}
          {isMobile && (
            <button
              className="btn btn-link text-dark p-0 me-2"
              onClick={onToggleSidebar}
              style={{ fontSize: "1.5rem", border: "none", zIndex: 1070 }}
              aria-label="Toggle sidebar"
              aria-expanded="false"
            >
              <FaBars />
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
            <h5
              className="mb-0 fw-bold text-primary"
              style={{ fontSize: isMobile ? "0.9rem" : "1.1rem", cursor: "pointer" }}
              onClick={() => navigate("/dashboard")}
              title="Go to Dashboard"
            >
              {college.name}
            </h5>
          ) : (
            <h5
              className="mb-0 fw-bold text-primary"
              style={{ fontSize: isMobile ? "0.9rem" : "1.1rem", cursor: "pointer" }}
              onClick={() => navigate("/dashboard")}
              title="Go to Dashboard"
            >
              NOVAA
            </h5>
          )}

          {/* Role Badge */}
          <span
            className="badge bg-dark"
            style={{ fontSize: isMobile ? "0.65rem" : "0.75rem" }}
            title="User Role"
          >
            {user.role.replace("_", " ")}
          </span>
        </div>

        {/* RIGHT */}
        <div className="d-flex align-items-center gap-2 gap-md-4 position-relative">
          {/* BELL NOTIFICATION */}
          <div
            className="position-relative"
            ref={dropdownRef}
            style={{ cursor: "pointer", zIndex: 3000 }}
            role="button"
            tabIndex={0}
            aria-label="Notifications"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              setProfileOpen(false);
              if (!open) fetchNotes();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(!open);
                setProfileOpen(false);
                if (!open) fetchNotes();
              }
            }}
          >
            <FaBell
              size={isMobile ? 18 : 20}
              className={`transition-all ${open ? "text-primary" : "text-dark"}`}
              aria-hidden="true"
            />

            {count > 0 && (
              <span
                className="badge bg-danger rounded-pill animate__animated animate__bounceIn"
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
                  justifyContent: "center",
                }}
                aria-label={`${count} unread notifications`}
              >
                {count}
              </span>
            )}

            {/* Notification Dropdown */}
            {open && (
              <div
                className="card shadow border-0 position-absolute"
                style={{
                  width: isMobile ? "280px" : "350px",
                  zIndex: 3000,
                  top: "calc(100% + 10px)",
                  right: isMobile ? "-120px" : "0",
                  left: isMobile ? "auto" : "auto",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  animation: "fadeIn 0.2s ease-in-out",
                }}
                role="menu"
                aria-label="Notification menu"
              >
                {/* Header */}
                <div className="card-header bg-light d-flex justify-content-between align-items-center p-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "0.9rem" }}>
                    🔔 Unread Notifications
                  </h6>
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
                </div>

                {/* Body */}
                <div className="card-body p-2">
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
                        style={{ fontSize: "0.8rem", transition: "all 0.2s" }}
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
                    style={{ fontSize: "0.8rem" }}
                  >
                    View All Notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div
            className="position-relative"
            ref={profileDropdownRef}
            style={{ cursor: "pointer", zIndex: 3001 }}
            role="button"
            tabIndex={0}
            aria-label="User menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen(!profileOpen);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setProfileOpen(!profileOpen);
                setOpen(false);
              }
            }}
          >
            {/* Avatar Circle */}
            <div
              className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
              style={{
                width: isMobile ? "32px" : "36px",
                height: isMobile ? "32px" : "36px",
                fontSize: isMobile ? "0.8rem" : "0.9rem",
                fontWeight: "bold",
                transition: "all 0.2s",
                boxShadow: profileOpen ? "0 0 0 3px rgba(13, 110, 253, 0.25)" : "none",
              }}
              title={user.email}
            >
              {getUserInitials()}
            </div>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div
                className="card shadow border-0 position-absolute"
                style={{
                  width: isMobile ? "200px" : "220px",
                  zIndex: 3001,
                  top: "calc(100% + 10px)",
                  right: "0",
                  animation: "fadeIn 0.2s ease-in-out",
                }}
                role="menu"
                aria-label="Profile menu"
              >
                {/* User Info Header */}
                <div className="card-header bg-light p-3 text-center">
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-2"
                    style={{ width: "50px", height: "50px", fontSize: "1.2rem", fontWeight: "bold" }}
                  >
                    {getUserInitials()}
                  </div>
                  <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: "0.9rem" }} title={user.email}>
                    {user.email}
                  </h6>
                  <span className="badge bg-dark" style={{ fontSize: "0.7rem" }}>
                    {user.role.replace("_", " ")}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="card-body p-2">
                  <button
                    className="btn btn-sm btn-light w-100 text-start d-flex align-items-center gap-2 mb-1"
                    onClick={goToProfile}
                    style={{ fontSize: "0.85rem" }}
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
                    style={{ fontSize: "0.85rem" }}
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
                    style={{ fontSize: "0.85rem" }}
                    role="menuitem"
                  >
                    <FaKey /> Change Password
                  </button>
                  <hr className="my-2" />
                  <button
                    className="btn btn-sm btn-outline-danger w-100 text-start d-flex align-items-center gap-2"
                    onClick={handleLogout}
                    style={{ fontSize: "0.85rem" }}
                    role="menuitem"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Email - Hidden on mobile */}
          <span
            className="text-muted small d-none d-md-block"
            style={{ fontSize: "0.8rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={user.email}
          >
            {user.email}
          </span>

        </div>
      </nav>

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

        .transition-all {
          transition: all 0.2s ease-in-out;
        }

        .animate__animated {
          animation-duration: 0.3s;
          animation-fill-mode: both;
        }

        .animate__fadeInDown {
          animation-name: fadeInDown;
        }

        .animate__bounceIn {
          animation-name: bounceIn;
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

        @keyframes bounceIn {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}