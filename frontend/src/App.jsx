import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import LegalFooter from "./components/LegalFooter";
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { InboxAttentionProvider } from "./context/InboxAttentionContext";
import AppLayout from "./components/layout/AppLayout";
import Welcome from "./pages/Welcome";
import RequireAuth from "./components/auth/RequireAuth";
import OnboardingOnly from "./components/auth/OnboardingOnly";
import ParentLayout from "./layouts/ParentLayout";
import NannyLayout from "./layouts/NannyLayout";
import RequireRole from "./components/auth/RequireRole";
import UpdateBadge from "./components/UpdateBadge";

// Lazy-load every non-landing page so the initial JS bundle stays
// small. Welcome and the auth/role wrappers stay eager since they're
// rendered immediately.
const PhoneVerification = lazy(() => import("./pages/PhoneVerification"));
const CreateProfile = lazy(() => import("./pages/CreateProfile"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PayoutInfo = lazy(() => import("./pages/PayoutInfo"));
const PaymentInfo = lazy(() => import("./pages/PaymentInfo"));
const BillingHistory = lazy(() => import("./pages/BillingHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChooseRole = lazy(() => import("./pages/onboarding/ChooseRole"));
const PhoneVerify = lazy(() => import("./pages/onboarding/PhoneVerify"));

// Parent pages
const Discover = lazy(() => import("./pages/Discover"));
const Requests = lazy(() => import("./pages/Requests"));
const Upcoming = lazy(() => import("./pages/Upcoming"));
const History = lazy(() => import("./pages/History"));
const ParentInbox = lazy(() => import("./pages/ParentInbox"));
const Book = lazy(() => import("./pages/Book"));
const NannyPublicProfile = lazy(() => import("./pages/nanny/NannyPublicProfile"));

// Nanny pages
const NannyDashboard = lazy(() => import("./pages/nanny/NannyDashboard"));
const NannyAvailability = lazy(() => import("./pages/nanny/NannyAvailability"));
const NannyEarnings = lazy(() => import("./pages/nanny/NannyEarnings"));

// Shell for routes that don't use a TabBar layout. Renders the
// page then a static legal footer below it, so the DBA notice is
// reachable on every standalone page (auth, onboarding, details,
// etc.). Layouts handle their own footer placement above the TabBar.
function StandaloneShell() {
  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <LegalFooter />
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
      <OnboardingProvider>
        <NotificationsProvider>
        <InboxAttentionProvider>
          <Toaster
            position="bottom-center"
            offset={88}
            mobileOffset={88}
            toastOptions={{
              style: {
                background: "#5C6B52",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                fontFamily: "DM Sans, sans-serif",
              },
              className: "kiddaboo-toast",
            }}
          />
          <UpdateBadge />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Standalone routes (no TabBar). Wrapped in StandaloneShell
                so the global legal footer renders below the page.
                Layout-wrapped routes below render their own footer
                inside the scrollable area. */}
            <Route element={<StandaloneShell />}>
              {/* Public routes — no auth required */}
              <Route path="/choose-role" element={<ChooseRole />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/verify" element={<PhoneVerification />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />

              {/* Onboarding — requires auth, no tab bar. OnboardingOnly
                  redirects users with completed profiles to /my-profile
                  because these routes are destructive on submit (wipe
                  profile / delete all children). */}
              <Route path="/profile" element={<OnboardingOnly><CreateProfile /></OnboardingOnly>} />
              <Route path="/verify-phone" element={<RequireAuth><PhoneVerify /></RequireAuth>} />

              {/* Detail pages — requires auth, no tab bar */}
              <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationSettings /></RequireAuth>} />
              <Route path="/payout-info" element={<RequireAuth><PayoutInfo /></RequireAuth>} />
              <Route path="/payment-info" element={<RequireAuth><PaymentInfo /></RequireAuth>} />
              <Route path="/billing" element={<RequireAuth><BillingHistory /></RequireAuth>} />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* App pages — requires auth, with tab bar. Layouts embed
                LegalFooter themselves above the TabBar. */}
            <Route path="/my-profile" element={<RequireAuth><AppLayout><MyProfile /></AppLayout></RequireAuth>} />

            {/* Parent tab routes — requires parent role + ParentLayout */}
            <Route
              path="/"
              element={
                <RequireAuth>
                  <RequireRole role="parent">
                    <ParentLayout><Discover /></ParentLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/requests"
              element={
                <RequireAuth>
                  <RequireRole role="parent">
                    <ParentLayout><Requests /></ParentLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/upcoming"
              element={
                <RequireAuth>
                  <RequireRole role="parent">
                    <ParentLayout><Upcoming /></ParentLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/history"
              element={
                <RequireAuth>
                  <RequireRole role="parent">
                    <ParentLayout><History /></ParentLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/inbox"
              element={
                <RequireAuth>
                  <RequireRole role="parent">
                    <ParentLayout><ParentInbox /></ParentLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Parent detail routes — requires auth, no layout */}
            <Route path="/book/:slotId" element={<RequireAuth><Book /></RequireAuth>} />
            <Route path="/nanny/:id" element={<RequireAuth><NannyPublicProfile /></RequireAuth>} />

            {/* Nanny tab routes — requires nanny role + NannyLayout */}
            <Route
              path="/nanny/dashboard"
              element={
                <RequireAuth>
                  <RequireRole role="nanny">
                    <NannyLayout><NannyDashboard /></NannyLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/nanny/availability"
              element={
                <RequireAuth>
                  <RequireRole role="nanny">
                    <NannyLayout><NannyAvailability /></NannyLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/nanny/earnings"
              element={
                <RequireAuth>
                  <RequireRole role="nanny">
                    <NannyLayout><NannyEarnings /></NannyLayout>
                  </RequireRole>
                </RequireAuth>
              }
            />
          </Routes>
          </Suspense>
        </InboxAttentionProvider>
        </NotificationsProvider>
      </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
