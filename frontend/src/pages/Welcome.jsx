import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReviewsList from "../components/ReviewsList";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (!profile?.first_name) {
        navigate("/profile");
      } else if (profile.account_type === "nanny") {
        navigate("/nanny/dashboard");
      } else {
        navigate("/browse");
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin border-sage border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div
      data-safe-top
      className="min-h-screen flex flex-col items-center px-6 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] bg-cream"
    >
      <div className="w-full max-w-md text-center">
        {/* Category micro-label */}
        <div
          className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-[0.2em] bg-cream-dark text-taupe"
        >
          Trusted childcare
        </div>

        {/* Serif wordmark */}
        <h1 className="font-display text-6xl tracking-tight mt-6 text-charcoal">
          Kiddaboo
        </h1>

        {/* Tagline in the accent */}
        <p className="mt-4 text-lg text-sage">
          Find your nanny.
        </p>

        {/* Description */}
        <p className="mt-6 leading-relaxed text-taupe">
          Book trusted, background-checked nannies near you — on your schedule.
          No agencies, no waitlists. Just great care, close by.
        </p>

        {/* Primary CTA + sign in */}
        <div className="mt-10 flex flex-col items-stretch gap-4">
          <Button fullWidth onClick={() => navigate("/choose-role")}>Get started</Button>
          <button
            onClick={() => navigate("/verify?mode=signin")}
            className="text-sm bg-transparent border-none py-2 cursor-pointer text-taupe"
          >
            Already have an account?{" "}
            <span className="underline underline-offset-4 text-sage">
              Sign in
            </span>
          </button>
        </div>
      </div>

      {/* What parents say */}
      <section className="w-full max-w-md mt-16">
        <h2 className="text-xs uppercase tracking-[0.2em] text-center mb-5 text-taupe">
          What parents say
        </h2>
        <ReviewsList limit={3} compact />
        <div className="mt-5 text-center">
          <button
            onClick={() => navigate("/reviews")}
            className="text-sm bg-transparent border-none py-2 cursor-pointer underline underline-offset-4 text-sage"
          >
            See all reviews →
          </button>
        </div>
      </section>

      {/* Legal links */}
      <div className="mt-10 flex gap-2">
        <button
          onClick={() => navigate("/terms")}
          className="text-xs bg-transparent border-none underline underline-offset-2 px-3 py-3 cursor-pointer text-taupe"
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate("/privacy")}
          className="text-xs bg-transparent border-none underline underline-offset-2 px-3 py-3 cursor-pointer text-taupe"
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
