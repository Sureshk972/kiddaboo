import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import LegalFooter from "./components/LegalFooter";
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { HostProvider } from "./context/HostContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import AppLayout from "./components/layout/AppLayout";
import Welcome from "./pages/Welcome";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";
import OnboardingOnly from "./components/auth/OnboardingOnly";
import ParentLayout from "./layouts/ParentLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";
import RequireRole from "./components/auth/RequireRole";
import UpdateBadge from "./components/UpdateBadge";

// Lazy-load every non-landing page so the initial JS bundle stays
// small. Welcome and the auth/role wrappers stay eager since they're
// rendered immediately.
const PhoneVerification = lazy(() => import("./pages/PhoneVerification"));
const CreateProfile = lazy(() => import("./pages/CreateProfile"));
const AddChildren = lazy(() => import("./pages/AddChildren"));
const BrowseSuccess = lazy(() => import("./pages/BrowseSuccess"));
const PlaygroupDetail = lazy(() => import("./pages/PlaygroupDetail"));
const Browse = lazy(() => import("./pages/Browse"));
const MyGroups = lazy(() => import("./pages/MyGroups"));
const Messages = lazy(() => import("./pages/Messages"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const CreatePlaygroup = lazy(() => import("./pages/host/CreatePlaygroup"));
const ScreeningQuestions = lazy(() => import("./pages/host/ScreeningQuestions"));
const EnvironmentSetup = lazy(() => import("./pages/host/EnvironmentSetup"));
const HostPhotos = lazy(() => import("./pages/host/HostPhotos"));
const HostSuccess = lazy(() => import("./pages/host/HostSuccess"));
const HostDashboard = lazy(() => import("./pages/host/HostDashboard"));
const HostInsights = lazy(() => import("./pages/host/HostInsights"));
const EditPlaygroup = lazy(() => import("./pages/host/EditPlaygroup"));
const Admin = lazy(() => import("./pages/Admin"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const SessionChat = lazy(() => import("./pages/SessionChat"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Premium = lazy(() => import("./pages/Premium"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ChooseRole = lazy(() => import("./pages/onboarding/ChooseRole"));
const PhoneVerify = lazy(() => import("./pages/onboarding/PhoneVerify"));

// Shell for routes that don't use a TabBar layout. Renders the
// page then a static legal footer below it, so the DBA notice is
// reachable on every standalone page (auth, onboarding, details,
// premium, etc.). Layouts handle their own footer placement above
// the TabBar.
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
        <HostProvider>
          <NotificationsProvider>
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
              <Route path="/" element={<Welcome />} />
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
              <Route path="/children" element={<OnboardingOnly><AddChildren /></OnboardingOnly>} />
              <Route path="/success" element={<RequireAuth><BrowseSuccess /></RequireAuth>} />

              {/* Host onboarding — requires auth, no tab bar */}
              <Route path="/host/create" element={<RequireAuth><CreatePlaygroup /></RequireAuth>} />
              <Route path="/host/screening" element={<RequireAuth><ScreeningQuestions /></RequireAuth>} />
              <Route path="/host/environment" element={<RequireAuth><EnvironmentSetup /></RequireAuth>} />
              <Route path="/host/photos" element={<RequireAuth><HostPhotos /></RequireAuth>} />
              <Route path="/host/success" element={<RequireAuth><HostSuccess /></RequireAuth>} />

              {/* Detail pages — requires auth, no tab bar */}
              <Route path="/playgroup/:id" element={<RequireAuth><PlaygroupDetail /></RequireAuth>} />
              <Route path="/messages/:playgroupId" element={<RequireAuth><GroupChat /></RequireAuth>} />
              <Route path="/messages/session/:sessionId" element={<RequireAuth><SessionChat /></RequireAuth>} />
              <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationSettings /></RequireAuth>} />
              <Route path="/host/edit/:id" element={<RequireAuth><EditPlaygroup /></RequireAuth>} />
              <Route path="/premium" element={<RequireAuth><Premium /></RequireAuth>} />

              {/* Admin — requires auth + admin role, no tab bar */}
              <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* App pages — requires auth, with tab bar. Layouts embed
                LegalFooter themselves above the TabBar. */}
            <Route path="/browse" element={<RequireAuth><RequireRole role="parent"><ParentLayout><Browse /></ParentLayout></RequireRole></RequireAuth>} />
            <Route path="/my-groups" element={<RequireAuth><RequireRole role="parent"><ParentLayout><MyGroups /></ParentLayout></RequireRole></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><AppLayout><Messages /></AppLayout></RequireAuth>} />
            <Route path="/my-profile" element={<RequireAuth><AppLayout><MyProfile /></AppLayout></RequireAuth>} />
            <Route path="/host/dashboard" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostDashboard /></OrganizerLayout></RequireRole></RequireAuth>} />
            <Route path="/host/insights" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostInsights /></OrganizerLayout></RequireRole></RequireAuth>} />
          </Routes>
          </Suspense>
          </NotificationsProvider>
        </HostProvider>
      </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
