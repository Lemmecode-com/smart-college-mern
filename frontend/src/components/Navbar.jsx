import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FaBell, FaCheck } from "react-icons/fa";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [college, setCollege] = useState(null); // State to store college information

  const prevCount = useRef(0);
  const dropdownRef = useRef();

  if (!user) return null;

  // Fetch college information when user is available
  useEffect(() => {
    const fetchCollegeInfo = async () => {
      if (user.college_id) {
        try {
          let response;

          if (user.role === "COLLEGE_ADMIN") {
            // College admins can access the direct college endpoint
            response = await api.get("/college/my-college");
            setCollege(response.data);
          } else if (user.role === "TEACHER") {
            // Teachers can get their profile which includes college info
            response = await api.get("/teachers/my-profile");
            // Teacher profile has college info in the populated college_id field
            if (response.data && response.data.college_id) {
              setCollege(response.data.college_id);
            }
          } else if (user.role === "STUDENT") {
            // Students can get their profile which includes college info
            response = await api.get("/students/my-profile");
            // Student profile has college info in a separate college field
            if (response.data && response.data.college) {
              setCollege(response.data.college);
            }
          }
        } catch (error) {
          console.error("Error fetching college info:", error);
          console.error("Error details:", error.response?.data || error.message);
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
          style={{ zIndex: 2000 }}
        >
          {toast}
        </div>
      )}

      <nav className="navbar navbar-light bg-white px-4 shadow-sm d-flex justify-content-between align-items-center">
        {/* LEFT */}
        <div className="d-flex align-items-center gap-3">
          {college ? (
            <h5 className="mb-0 fw-bold text-primary">{college.name}</h5>
          ) : (
            <h5 className="mb-0 fw-bold text-primary">NOVAA</h5>
          )}

          <div className="d-flex flex-wrap gap-2">
            <span className="badge bg-dark">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="d-flex align-items-center gap-4 position-relative">
          {/* BELL */}
          <div
            className="position-relative"
            ref={dropdownRef}
            style={{ cursor: "pointer" }}
          >
            <FaBell
              size={20}
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
                  fontSize: "10px"
                }}
              >
                {count}
              </span>
            )}

            {open && (
              <div
                className="card shadow border-0 position-absolute end-0 mt-3"
                style={{ width: 320, zIndex: 2000 }}
              >
                <div className="card-body p-2">
                  <h6 className="fw-bold text-center">
                    Unread Notifications
                  </h6>

                  {notes.length === 0 && (
                    <p className="text-muted small text-center">
                      No new notifications
                    </p>
                  )}

                  {notes.map((n) => (
                    <div
                      key={n._id}
                      className="p-2 rounded mb-1 small bg-warning bg-opacity-25"
                    >
                      <strong>{n.title}</strong>
                      <div className="text-muted small">
                        {n.message}
                      </div>

                      <div className="text-end">
                        <button
                          className="btn btn-sm btn-link text-success p-0"
                          onClick={() => markAsRead(n._id)}
                        >
                          <FaCheck /> Mark read
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="text-center mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={goToNotificationList}
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* USER EMAIL */}
          <span className="text-muted small">{user.email}</span>

          {/* LOGOUT */}
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
