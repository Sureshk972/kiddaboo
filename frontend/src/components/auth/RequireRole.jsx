import { Navigate } from "react-router-dom";
import { useAccountType } from "../../hooks/useAccountType";

const HOME_FOR = {
  parent: "/browse",
  organizer: "/host/dashboard",
};

/**
 * Blocks a route so only the given role can see it. If a user with the
 * wrong role hits this route, they are bounced to their own home. If
 * accountType is still loading we render nothing (the global splash
 * from RequireAuth already covers that case).
 */
export default function RequireRole({ role, children }) {
  const { accountType, loading } = useAccountType();
  if (loading) return null;
  if (accountType !== role) {
    return <Navigate to={HOME_FOR[accountType] || "/"} replace />;
  }
  return children;
}
