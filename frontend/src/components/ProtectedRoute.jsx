import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import Loading from "./Loading";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <Loading fullScreen text="Authenticating..." />;

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
