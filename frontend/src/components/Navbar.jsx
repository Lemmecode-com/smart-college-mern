import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return null;

  /* ================= ROLE LABEL ================= */
  const roleLabel = {
    SUPER_ADMIN: "Super Admin",
    COLLEGE_ADMIN: "College Admin",
    TEACHER: "Teacher",
    STUDENT: "Student"
  };

  const roleColor = {
    SUPER_ADMIN: "danger",
    COLLEGE_ADMIN: "primary",
    TEACHER: "success",
    STUDENT: "secondary"
  };

  /* ================= LOGOUT HANDLER ================= */
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;

    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-light bg-light px-4 shadow-sm d-flex justify-content-between">
      {/* LEFT */}
      <div className="d-flex align-items-center gap-3">
        <h6 className="mb-0 fw-bold">Smart College ERP</h6>
        <span className={`badge bg-${roleColor[user.role]}`}>
          {roleLabel[user.role]}
        </span>
      </div>

      {/* RIGHT */}
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted small">
          Welcome, <strong>{user.name || "User"}</strong>
        </span>

        <button
          className="btn btn-outline-danger btn-sm"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
