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
 * Returning users (first_name already set) are sent to /my-profile —
 * the supported edit surface.
 *
 * In-flight signup has a race: after CreateProfile saves, setProfile()
 * flushes first_name into context, and OnboardingOnly may re-render at
 * /profile before the navigate() to /children lands. To survive that
 * window we gate on a sessionStorage flag set at the very start of the
 * flow (PhoneVerification) and cleared only at the terminal success
 * pages (BrowseSuccess, HostSuccess). Nav-state doesn't work here
 * because it only applies to the destination route, not the source.
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

  // In-flight signup: let through until the flow completes.
  const onboardingActive =
    typeof window !== "undefined" &&
    sessionStorage.getItem("kiddaboo.onboardingActive") === "1";
  if (onboardingActive) {
    return children;
  }

  if (profile?.first_name) {
    return <Navigate to="/my-profile" replace />;
  }

  return children;
}
