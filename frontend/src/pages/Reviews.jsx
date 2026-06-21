import { useNavigate } from "react-router-dom";
import ReviewsList from "../components/ReviewsList";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Reviews() {
  useDocumentTitle("Parent reviews");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream">
      <div data-safe-top className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/welcome")}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-taupe hover:text-charcoal hover:bg-cream-dark bg-transparent border-none cursor-pointer transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Inter', sans-serif", color: "#8B3FE0" }}
          >
            Parent reviews
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        <ReviewsList />
      </div>
    </div>
  );
}
