import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import Loading from "./Loading";

export default function GuestRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <Loading fullScreen text="Loading..." />;

  if (user) return <Navigate to="/home" replace />;

  return children;
}
