import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Guards the onboarding-only routes (CreateProfile, AddChildren).
 *
 * These routes write-on-submit destructively: CreateProfile overwrites
 * the existing profile row and AddChildren deletes + reinserts every
 * child. That's intentional for first-time onboarding, but devastating
 * if a logged-in user with a completed profile hits the route directly.
 *
 * Returning users (first_name already set) are sent to /my-profile —
 * the supported edit surface. The first-time signup flow threads
 * `location.state.fromOnboarding = true` through the /profile → /children
 * transition so this guard knows to let them pass.
 */
export default function OnboardingOnly({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

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

  // In-flight signup: CreateProfile just saved first_name and is routing
  // the user to the next onboarding step. Don't bounce them out.
  if (location.state?.fromOnboarding) {
    return children;
  }

  if (profile?.first_name) {
    return <Navigate to="/my-profile" replace />;
  }

  return children;
}
