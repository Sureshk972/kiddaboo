import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Guards the onboarding-only routes (CreateProfile, AddChildren).
 *
 * These routes write-on-submit destructively: CreateProfile overwrites
 * the existing profile row and AddChildren deletes + reinserts every
 * child. That's intentional for first-time onboarding, but devastating
 * if a logged-in user with a completed profile hits the route directly.
 *
 * This wrapper sends anyone who already has a `first_name` on their
 * profile to /my-profile, which is the supported edit surface.
 */
export default function OnboardingOnly({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.first_name) {
    return <Navigate to="/my-profile" replace />;
  }

  return children;
}
