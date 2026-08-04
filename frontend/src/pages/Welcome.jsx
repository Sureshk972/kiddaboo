import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

const TESTIMONIALS = [
  { name: "Anita R.", text: "Found a wonderful provider two streets away. My daughter asks to go back every week." },
  { name: "Jessica L.", text: "I was nervous about leaving my toddler with someone new, but the verified profiles gave me real peace of mind." },
  { name: "Priya M.", text: "Booking is so easy — I picked a time slot on Sunday night and had confirmation by Monday morning." },
  { name: "Sarah K.", text: "We moved to a new neighbourhood and had reliable day care sorted within a day. Lifesaver." },
  { name: "Maria T.", text: "The provider we found through Kiddaboo has become like family. My kids light up when we pull into her driveway." },
  { name: "Lauren H.", text: "As a single mum working shifts, I need flexible hours. Kiddaboo is the only service that actually fits my schedule." },
  { name: "Danielle W.", text: "Background checks, reviews from other parents, easy payment — everything I needed in one place." },
  { name: "Rachel S.", text: "We've used three different providers for date nights and every single one has been fantastic." },
  { name: "Tamara J.", text: "My son has special needs and his provider has been incredibly patient and attentive. So grateful." },
  { name: "Christine P.", text: "No agencies, no waitlists — just real people offering real care. Exactly what I was looking for." },
  { name: "Emily N.", text: "The pricing is transparent and fair. No surprise fees, no hidden charges. Refreshing." },
  { name: "Aisha B.", text: "I recommended Kiddaboo to my entire mothers' group. Three of them signed up the same week." },
  { name: "Nicole F.", text: "Being able to read reviews from other parents before booking made all the difference for me." },
  { name: "Megan D.", text: "Our provider sends photos during the day. My husband and I joke that our daughter has a better social life than we do." },
  { name: "Stephanie C.", text: "Tried two other apps before this. Kiddaboo is the one that actually works — simple, fast, trustworthy." },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 14 14" fill="#D9A441" aria-hidden="true">
          <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
        </svg>
      ))}
    </div>
  );
}

function Testimonials() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? TESTIMONIALS : TESTIMONIALS.slice(0, 3);
  return (
    <div className="flex flex-col gap-3">
      {visible.map((t, i) => (
        <div key={i} className="bg-white border border-cream-dark rounded-2xl p-4">
          <div className="mb-2">
            <Stars />
          </div>
          <p className="text-sm text-charcoal leading-relaxed mb-2">
            "{t.text}"
          </p>
          <p className="text-xs text-taupe">{t.name}</p>
        </div>
      ))}
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm bg-transparent border-none py-2 cursor-pointer underline underline-offset-4 text-sage hover:text-sage-dark transition-colors"
        >
          See all reviews →
        </button>
      )}
    </div>
  );
}

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
        navigate("/");
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
          Find Trusted Day Care
        </p>

        {/* Description */}
        <p className="mt-6 leading-relaxed text-taupe">
          Book trusted, background-checked day care providers near you — on your schedule.
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
            <span className="underline underline-offset-4 text-sage hover:text-sage-dark transition-colors">
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
        <Testimonials />
      </section>

      {/* Legal links */}
      <div className="mt-10 flex gap-2">
        <button
          onClick={() => navigate("/terms")}
          className="text-xs bg-transparent border-none underline underline-offset-2 px-3 py-3 cursor-pointer text-taupe hover:text-taupe-dark transition-colors"
        >
          Terms of Service
        </button>
        <button
          onClick={() => navigate("/privacy")}
          className="text-xs bg-transparent border-none underline underline-offset-2 px-3 py-3 cursor-pointer text-taupe hover:text-taupe-dark transition-colors"
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
