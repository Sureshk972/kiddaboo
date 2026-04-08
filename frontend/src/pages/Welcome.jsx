import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // If already logged in, check profile completeness
  useEffect(() => {
    if (!loading && user) {
      if (!profile?.first_name) {
        navigate("/profile");
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
        {/* Logo mark — a sprout/leaf */}
        <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 28V16M16 16C16 16 12 12 8 10C12 10 16 12 16 16ZM16 16C16 16 20 12 24 10C20 10 16 12 16 16Z"
              stroke="#7A8F6D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="8" r="3" fill="#A3B18A" opacity="0.5" />
          </svg>
        </div>

        {/* Brand name */}
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
          Kiddaboo
        </h1>

        {/* Tagline */}
        <p className="text-lg text-taupe text-center leading-relaxed max-w-xs">
          Find your people.<br />Find your playgroup.
        </p>
      </div>

      {/* Illustration placeholder */}
      <div className="w-full max-w-xs mb-12">
        <div className="bg-cream-dark rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-sage-light"></div>
            <div className="w-10 h-10 rounded-full bg-terracotta-light"></div>
            <div className="w-10 h-10 rounded-full bg-sage/30"></div>
          </div>
          <div className="flex gap-2 -mt-1">
            <div className="w-8 h-8 rounded-full bg-terracotta/20"></div>
            <div className="w-8 h-8 rounded-full bg-sage-light"></div>
          </div>
          <p className="text-xs text-taupe/60 mt-2">Curated playgroups for your family</p>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <Button fullWidth onClick={() => navigate("/verify")}>
          Find Your Playgroup
        </Button>
        <Button variant="secondary" fullWidth onClick={() => navigate("/host/create")}>
          Host a Playgroup
        </Button>
        <button
          onClick={() => navigate("/verify?mode=signin")}
          className="text-sm text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none"
        >
          Already have an account? <span className="underline underline-offset-4">Sign in</span>
        </button>
      </div>

      {/* Legal links */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => navigate("/terms")}
          className="text-xs text-taupe/60 hover:text-taupe transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2"
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate("/privacy")}
          className="text-xs text-taupe/60 hover:text-taupe transition-colors cursor-pointer bg-transparent border-none underline underline-offset-2"
        >
          Privacy Policy
        </button>
      </div>

      {/* Social */}
      <a
        href="https://www.instagram.com/kiddaboo1/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center gap-1.5 text-xs text-taupe/60 hover:text-sage transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="6" r="1.5" fill="currentColor" />
        </svg>
        Follow us on Instagram
      </a>
    </div>
  );
}
