import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import Loading from "./Loading";
import ApiError from "./ApiError";
import { getDashboardPath } from "./Sidebar/config/navigation.config";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, authError, retryAuthCheck, sessionExpiryRedirectInProgress } = useContext(AuthContext);

  if (loading) return <Loading fullScreen text="Authenticating..." />;

  if (!user && authError) {
    return (
      <ApiError
        errorCode={authError.code}
        message={authError.message}
        onRetry={retryAuthCheck}
      />
    );
  }

  // When a session-expiry hard navigation (window.location.href) is already
  // in progress, suppress the secondary <Navigate>. The hard redirect is
  // the single navigation mechanism for session expiry; letting
  // ProtectedRoute also render <Navigate> causes a double-navigation flicker.
  if (!user && sessionExpiryRedirectInProgress) {
    return null;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}
