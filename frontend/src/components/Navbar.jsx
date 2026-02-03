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
  const prevCount = useRef(0);

  const dropdownRef = useRef();

  if (!user) return null;

  /* ================= FETCH COUNTS ================= */
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
      console.error("Count error", err);
    }
  };

  /* ================= FETCH DROPDOWN DATA ================= */
  const fetchNotes = async () => {
    try {
      let res;

      if (user.role === "COLLEGE_ADMIN")
        res = await api.get("/notifications/admin/read");
      if (user.role === "TEACHER")
        res = await api.get("/notifications/teacher/read");
      if (user.role === "STUDENT")
        res = await api.get("/notifications/student/read");

      let data = [];
      if (user.role === "COLLEGE_ADMIN")
        data = [...res.data.myNotifications, ...res.data.staffNotifications];
      if (user.role === "TEACHER")
        data = [...res.data.myNotifications, ...res.data.adminNotifications];
      if (user.role === "STUDENT")
        data = [...res.data.adminNotifications, ...res.data.teacherNotifications];

      setNotes(data.slice(0, 6));
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= EFFECT ================= */
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  /* ================= CLICK OUTSIDE ================= */
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
      {/* TOAST */}
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
          <h5 className="mb-0 fw-bold text-primary">NOVAA</h5>
          <span className="badge bg-dark">{user.role.replace("_", " ")}</span>
        </div>

        {/* RIGHT */}
        <div className="d-flex align-items-center gap-4 position-relative">
          {/* BELL */}
          <div
            className="position-relative"
            ref={dropdownRef}
            style={{ cursor: "pointer" }}
          >
            <FaBell size={20} onClick={() => {
              setOpen(!open);
              fetchNotes();
            }} />

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

            {/* DROPDOWN */}
            {open && (
              <div
                className="card shadow border-0 position-absolute end-0 mt-3"
                style={{ width: 320, zIndex: 2000 }}
              >
                <div className="card-body p-2">
                  <h6 className="fw-bold text-center">Notifications</h6>
                  {notes.length === 0 && (
                    <p className="text-muted small text-center">
                      No notifications
                    </p>
                  )}

                  {notes.map((n) => (
                    <div
                      key={n._id}
                      className={`p-2 rounded mb-1 small ${
                        n.isRead ? "bg-light" : "bg-warning bg-opacity-25"
                      }`}
                    >
                      <strong>{n.title}</strong>
                      <div className="text-muted small">{n.message}</div>
                      <div className="d-flex justify-content-end">
                        {!n.isRead && (
                          <button
                            className="btn btn-sm btn-link text-success p-0"
                            onClick={() =>
                              setNotes((prev) =>
                                prev.map((x) =>
                                  x._id === n._id
                                    ? { ...x, isRead: true }
                                    : x
                                )
                              )
                            }
                          >
                            <FaCheck /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="text-center mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate("/notification/list")}
                    >
                      View All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* USER EMAIL */}
          <span className="text-muted small">
            {user.email}
          </span>

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
