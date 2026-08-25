import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function AuthRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
}