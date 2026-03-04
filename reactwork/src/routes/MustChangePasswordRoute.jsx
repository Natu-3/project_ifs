import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ALLOWLIST = new Set(["/login", "/signup", "/force-password-change"]);

export default function MustChangePasswordRoute({ children }) {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();
  if (isAuthLoading) return null;

  if (user?.mustChangePassword && !ALLOWLIST.has(location.pathname)) {
    return <Navigate to="/force-password-change" replace />;
  }
  return children;
}

