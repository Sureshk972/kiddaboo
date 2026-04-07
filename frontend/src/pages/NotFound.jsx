import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 page-transition">
      <div className="w-20 h-20 bg-sage-light rounded-full flex items-center justify-center mb-6">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#7A8F6D" strokeWidth="1.5" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" stroke="#7A8F6D" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="9" r="1" fill="#7A8F6D" />
          <circle cx="15" cy="9" r="1" fill="#7A8F6D" />
        </svg>
      </div>
      <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
        Page not found
      </h1>
      <p className="text-sm text-taupe text-center leading-relaxed max-w-xs mb-6">
        Looks like this page wandered off. Let's get you back to finding playgroups.
      </p>
      <button
        onClick={() => navigate("/browse")}
        className="bg-sage text-white font-medium text-sm rounded-2xl px-8 py-3 cursor-pointer border-none hover:bg-sage-dark transition-colors"
      >
        Back to Browse
      </button>
    </div>
  );
}
