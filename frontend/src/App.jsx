import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { HostProvider } from "./context/HostContext";
import AppLayout from "./components/layout/AppLayout";
import Welcome from "./pages/Welcome";
import PhoneVerification from "./pages/PhoneVerification";
import CreateProfile from "./pages/CreateProfile";
import AddChildren from "./pages/AddChildren";
import BrowseSuccess from "./pages/BrowseSuccess";
import PlaygroupDetail from "./pages/PlaygroupDetail";
import Browse from "./pages/Browse";
import MyGroups from "./pages/MyGroups";
import Messages from "./pages/Messages";
import MyProfile from "./pages/MyProfile";
import EditProfile from "./pages/EditProfile";
import CreatePlaygroup from "./pages/host/CreatePlaygroup";
import ScreeningQuestions from "./pages/host/ScreeningQuestions";
import EnvironmentSetup from "./pages/host/EnvironmentSetup";
import HostPhotos from "./pages/host/HostPhotos";
import HostSuccess from "./pages/host/HostSuccess";
import HostDashboard from "./pages/host/HostDashboard";
import HostInsights from "./pages/host/HostInsights";
import EditPlaygroup from "./pages/host/EditPlaygroup";
import HostPremium from "./pages/host/HostPremium";
import Admin from "./pages/Admin";
import NotificationSettings from "./pages/NotificationSettings";
import GroupChat from "./pages/GroupChat";
import ResetPassword from "./pages/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Premium from "./pages/Premium";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";
import OnboardingOnly from "./components/auth/OnboardingOnly";
import ParentLayout from "./layouts/ParentLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";
import RequireRole from "./components/auth/RequireRole";
import ChooseRole from "./pages/onboarding/ChooseRole";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
      <OnboardingProvider>
        <HostProvider>
          <Routes>
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
            <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationSettings /></RequireAuth>} />
            <Route path="/host/edit/:id" element={<RequireAuth><EditPlaygroup /></RequireAuth>} />
            <Route path="/host/premium" element={<RequireAuth><HostPremium /></RequireAuth>} />
            <Route path="/premium" element={<RequireAuth><Premium /></RequireAuth>} />

            {/* App pages — requires auth, with tab bar */}
            <Route path="/browse" element={<RequireAuth><RequireRole role="parent"><ParentLayout><Browse /></ParentLayout></RequireRole></RequireAuth>} />
            <Route path="/my-groups" element={<RequireAuth><RequireRole role="parent"><ParentLayout><MyGroups /></ParentLayout></RequireRole></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><AppLayout><Messages /></AppLayout></RequireAuth>} />
            <Route path="/my-profile" element={<RequireAuth><AppLayout><MyProfile /></AppLayout></RequireAuth>} />
            <Route path="/host/dashboard" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostDashboard /></OrganizerLayout></RequireRole></RequireAuth>} />
            <Route path="/host/insights" element={<RequireAuth><RequireRole role="organizer"><OrganizerLayout><HostInsights /></OrganizerLayout></RequireRole></RequireAuth>} />

            {/* Admin — requires auth + admin role, no tab bar */}
            <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HostProvider>
      </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
