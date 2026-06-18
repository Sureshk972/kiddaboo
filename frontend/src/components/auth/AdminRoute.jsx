import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { loading, user, profile } = useAuth();
  if (loading) return null;
  if (!user || profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
