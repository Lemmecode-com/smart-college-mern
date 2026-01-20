// import { Navigate } from "react-router-dom";
// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";

// export default function ProtectedRoute({ roles, children }) {
//   const { user, loading } = useContext(AuthContext);

//   if (loading) return null;
//   if (!user) return <Navigate to="/login" />;

//   if (roles && !roles.includes(user.role)) {
//     return <Navigate to="/dashboard" />;
//   }

//   return children;
// }



import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

/**
 * ProtectedRoute
 * ----------------
 * @param {Array} allowedRoles - roles allowed to access route
 * @param {ReactNode} children - protected component
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "60vh" }}
      >
        <span>Loading...</span>
      </div>
    );
  }

  /* ================= NOT LOGGED IN ================= */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* ================= ROLE CHECK ================= */
  if (
    allowedRoles &&
    Array.isArray(allowedRoles) &&
    !allowedRoles.includes(user.role)
  ) {
    // 🔒 Role mismatch → safe redirect
    return user.role === "SUPER_ADMIN" ? (
      <Navigate to="/super-admin/dashboard" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  /* ================= ACCESS GRANTED ================= */
  return children;
}
