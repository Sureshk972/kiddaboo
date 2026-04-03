import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import CreatePlaygroup from "./pages/host/CreatePlaygroup";
import ScreeningQuestions from "./pages/host/ScreeningQuestions";
import EnvironmentSetup from "./pages/host/EnvironmentSetup";
import HostPhotos from "./pages/host/HostPhotos";
import HostSuccess from "./pages/host/HostSuccess";
import HostDashboard from "./pages/host/HostDashboard";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OnboardingProvider>
        <HostProvider>
          <Routes>
            {/* Onboarding — no tab bar */}
            <Route path="/" element={<Welcome />} />
            <Route path="/verify" element={<PhoneVerification />} />
            <Route path="/profile" element={<CreateProfile />} />
            <Route path="/children" element={<AddChildren />} />
            <Route path="/success" element={<BrowseSuccess />} />

            {/* Host onboarding — no tab bar */}
            <Route path="/host/create" element={<CreatePlaygroup />} />
            <Route path="/host/screening" element={<ScreeningQuestions />} />
            <Route path="/host/environment" element={<EnvironmentSetup />} />
            <Route path="/host/photos" element={<HostPhotos />} />
            <Route path="/host/success" element={<HostSuccess />} />

            {/* Detail page — no tab bar (has back button) */}
            <Route path="/playgroup/:id" element={<PlaygroupDetail />} />

            {/* App pages — with tab bar */}
            <Route path="/browse" element={<AppLayout><Browse /></AppLayout>} />
            <Route path="/my-groups" element={<AppLayout><MyGroups /></AppLayout>} />
            <Route path="/messages" element={<AppLayout><Messages /></AppLayout>} />
            <Route path="/my-profile" element={<AppLayout><MyProfile /></AppLayout>} />
            <Route path="/host/dashboard" element={<AppLayout><HostDashboard /></AppLayout>} />
          </Routes>
        </HostProvider>
      </OnboardingProvider>
    </BrowserRouter>
  );
}
