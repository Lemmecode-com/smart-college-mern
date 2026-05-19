import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import Loading from "./Loading";
import { getDashboardPath } from "./Sidebar/config/navigation.config";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <Loading fullScreen text="Authenticating..." />;

  if (!user) return <Navigate to="/login" replace />;

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}
