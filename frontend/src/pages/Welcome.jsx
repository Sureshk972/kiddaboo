import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function Welcome() {
  const navigate = useNavigate();

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
        <h1 className="text-4xl font-heading font-bold text-charcoal tracking-tight">
          kiddaboo
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
        <button className="text-sm text-sage hover:text-sage-dark transition-colors cursor-pointer bg-transparent border-none">
          Already have an account? <span className="underline underline-offset-4">Sign in</span>
        </button>
      </div>
    </div>
  );
}
