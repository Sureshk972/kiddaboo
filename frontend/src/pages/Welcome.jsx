import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // If already logged in, check profile completeness and route by role
  useEffect(() => {
    if (!loading && user) {
      if (!profile?.first_name) {
        navigate("/profile");
      } else if (profile.account_type === "organizer") {
        navigate("/host/dashboard");
      } else {
        navigate("/browse");
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      {/* Logo area */}
      <div className="flex flex-col items-center gap-6 mb-12">
        {/* Logo mark — five boxes echoing the illustration palette */}
        <div className="w-16 h-16 bg-sage-light flex flex-col items-center justify-center gap-1">
          <div className="flex gap-1">
            <div className="w-3 h-3" style={{ background: '#F4C9A8' }}></div>
            <div className="w-3 h-3" style={{ background: '#D9A441' }}></div>
            <div className="w-3 h-3" style={{ background: '#B07A8B' }}></div>
          </div>
          <div className="flex gap-1">
            <div className="w-3 h-3" style={{ background: '#B7A5E5' }}></div>
            <div className="w-3 h-3" style={{ background: '#5C8C7E' }}></div>
          </div>
        </div>

        {/* Brand name */}
        <h1 className="text-5xl tracking-tight" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, color: '#8B3FE0' }}>
          Kiddaboo
        </h1>

        {/* Tagline */}
        <p className="text-lg text-center leading-relaxed max-w-xs" style={{ color: '#8B3FE0' }}>
          Find your people.<br />Find your playgroup.
        </p>
      </div>

      {/* Illustration placeholder */}
      <div className="w-full max-w-xs mb-12">
        <div className="bg-cream-dark rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full" style={{ background: '#F4C9A8' }}></div>
            <div className="w-10 h-10 rounded-full" style={{ background: '#D9A441' }}></div>
            <div className="w-10 h-10 rounded-full" style={{ background: '#B07A8B' }}></div>
          </div>
          <div className="flex gap-2 -mt-1">
            <div className="w-8 h-8 rounded-full" style={{ background: '#B7A5E5' }}></div>
            <div className="w-8 h-8 rounded-full" style={{ background: '#5C8C7E' }}></div>
          </div>
          <p className="text-xs text-taupe/60 mt-2">Curated playgroups for your family</p>
        </div>
      </div>

      {/* CTA — #59: simplified from four items to three. The old
           "New here? Create an account" link duplicated the primary CTA
           (both went to /verify), which confused first-time users. Now
           the hierarchy is: one primary action → one secondary → one
           text link for returning users. */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <Button fullWidth onClick={() => navigate("/choose-role")}>
          Get Started
        </Button>
        <button
          onClick={() => navigate("/verify?mode=signin")}
          className="text-sm text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none py-2"
        >
          Already have an account? <span className="underline underline-offset-4">Sign in</span>
        </button>
      </div>

      {/* Legal links — #61: enlarged touch targets (min 44pt tap area) */}
      <div className="mt-8 flex gap-2">
        <button
          onClick={() => navigate("/terms")}
          className="text-xs transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2 px-3 py-3"
          style={{ color: '#8B3FE0' }}
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate("/privacy")}
          className="text-xs transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2 px-3 py-3"
          style={{ color: '#8B3FE0' }}
        >
          Privacy Policy
        </button>
      </div>

      {/* Social — #61: enlarged icon + tap area */}
      <a
        href="https://www.instagram.com/kiddaboo1/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2 text-xs transition-colors px-3 py-3"
        style={{ color: '#8B3FE0' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="6" r="1.5" fill="currentColor" />
        </svg>
        Follow us on Instagram
      </a>
    </div>
  );
}
