import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="navbar navbar-light bg-light mb-3 px-3 shadow-sm">
      <span className="navbar-text">
        Logged in as <strong>{user.role.toUpperCase()}</strong>
      </span>
      <button className="btn btn-outline-danger btn-sm" onClick={logout}>
        Logout
      </button>
    </nav>
  );
}
