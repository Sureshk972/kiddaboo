import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Routes a half-authenticated user (signed up + email confirmed, but
// phone OTP never completed) is allowed to reach. Without this list
// we'd bounce them into /verify-phone even when they ARE on
// /verify-phone, causing a render loop. /profile and /children are
// part of the create-profile onboarding step that runs *before*
// phone verification in the happy path, so we let them through too.
const PHONE_VERIFY_EXEMPT = new Set([
  "/verify-phone",
  "/profile",
  "/children",
]);

export default function RequireAuth({ children }) {
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

  // If the profile has loaded and phone is not yet verified, funnel
  // the user back into PhoneVerify. We only act once profile is
  // non-null — otherwise a slow profile fetch would bounce the user
  // to /verify-phone before we even know their state.
  if (
    profile &&
    profile.role !== "admin" &&
    !profile.is_phone_verified &&
    !PHONE_VERIFY_EXEMPT.has(location.pathname)
  ) {
    return <Navigate to="/verify-phone" replace />;
  }

  return children;
}
