import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return user.role === "SUPER_ADMIN"
      ? <Navigate to="/super-admin/dashboard" replace />
      : <Navigate to="/dashboard" replace />;
  }

  return children;
}
