import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const PLANS = [
  {
    key: "monthly",
    label: "Monthly",
    price: "$7.99",
    period: "/mo",
    priceCents: 799,
    description: "Cancel anytime",
  },
  {
    key: "annual",
    label: "Annual",
    price: "$79.99",
    period: "/yr",
    priceCents: 7999,
    description: "2 months free — just $6.67/mo",
    badge: "Best Value",
  },
];

const FEATURES = [
  { free: "1 join request / month", premium: "Unlimited join requests" },
  { free: "Browse & search playgroups", premium: "Browse & search playgroups", both: true },
  { free: "Basic filters", premium: "Advanced filters (age, philosophy)" },
  { free: "Group chat", premium: "Group chat", both: true },
  { free: "—", premium: "Priority in host queues" },
  { free: "—", premium: "Premium badge on profile" },
  { free: "—", premium: "Early access to new groups" },
];

export default function Premium() {
  useDocumentTitle("Premium"); // #50
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isPremium, subscription, loading, refresh } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // #54: inline error replaces jarring alert() on checkout failure
  const [errorMessage, setErrorMessage] = useState("");
  // #52: the cancel return from Stripe Checkout used to be silently
  // ignored — user would bounce off the Stripe page, land on
  // /premium?cancelled=true, and see nothing acknowledging their
  // cancel. Now we surface a subtle banner so it's clear the cancel
  // was received and no charge was made.
  const [cancelMessage, setCancelMessage] = useState("");

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Payment successful! Your premium access is now active.");
      refresh();
    } else if (searchParams.get("cancelled") === "true") {
      // #52: friendly confirmation that the Stripe back/cancel
      // round-trip worked and nothing was charged.
      setCancelMessage("Checkout cancelled — no charges were made.");
    }
  }, [searchParams]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/verify");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: selectedPlan },
      });

      if (error) throw new Error(error.message || "Checkout failed");
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setErrorMessage("We couldn't start checkout. Please try again in a moment — no charges were made.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream page-transition">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-heading font-bold text-charcoal text-base">
            Kiddaboo Premium
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        {/* Success message */}
        {successMessage && (
          <div className="bg-sage-light border border-sage rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-sage-dark font-medium">{successMessage}</p>
          </div>
        )}

        {/* #52: cancelled banner — shown on ?cancelled=true return from */}
        {/* Stripe Checkout. Intentionally muted cream styling so it reads */}
        {/* as "confirmation, not error" — we don't want to scold users */}
        {/* for backing out of checkout. */}
        {cancelMessage && (
          <div className="bg-cream-dark/50 border border-cream-dark rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-taupe-dark font-medium">{cancelMessage}</p>
          </div>
        )}

        {/* #54: inline error banner replaces alert() */}
        {errorMessage && (
          <div className="bg-terracotta-light/30 border border-terracotta-light rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-terracotta font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Already premium */}
        {isPremium ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-sage p-6 text-center">
              <div className="w-14 h-14 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6B52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-charcoal text-xl mb-1">
                You're Premium!
              </h2>
              <p className="text-sm text-taupe mb-3">
                {subscription.plan === "annual" ? "Annual" : "Monthly"} plan
              </p>
              <p className="text-xs text-taupe">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h3 className="font-heading font-semibold text-charcoal text-sm mb-3">
                Your Premium benefits
              </h3>
              <div className="space-y-2.5">
                {FEATURES.filter((f) => !f.both && f.premium !== "—").map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-charcoal">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C6B52" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f.premium}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5C6B52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-charcoal text-2xl mb-2">
                Unlock Kiddaboo Premium
              </h2>
              <p className="text-sm text-taupe leading-relaxed max-w-xs mx-auto">
                Find the perfect playgroups faster with unlimited requests, advanced filters, and priority access.
              </p>
            </div>

            {/* Plan selection */}
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                    selectedPlan === plan.key
                      ? "border-sage bg-sage-light/30"
                      : "border-cream-dark bg-white hover:border-sage-light"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-4 bg-sage text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading font-bold text-charcoal text-base">
                        {plan.label}
                      </p>
                      <p className="text-xs text-taupe mt-0.5">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-heading font-bold text-charcoal text-xl">
                        {plan.price}
                      </span>
                      <span className="text-xs text-taupe">{plan.period}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Feature comparison */}
            <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
              <div className="grid grid-cols-2 border-b border-cream-dark">
                <div className="px-4 py-3 text-xs font-bold text-taupe uppercase tracking-wider">
                  Free
                </div>
                <div className="px-4 py-3 text-xs font-bold text-sage-dark uppercase tracking-wider bg-sage-light/20">
                  Premium
                </div>
              </div>
              {FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-2 ${
                    i < FEATURES.length - 1 ? "border-b border-cream-dark" : ""
                  }`}
                >
                  <div className="px-4 py-3 text-xs text-taupe flex items-center gap-1.5">
                    {feature.free === "—" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4D0C8" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A8F6D" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span>{feature.free === "—" ? "" : feature.free}</span>
                  </div>
                  <div className="px-4 py-3 text-xs text-charcoal font-medium flex items-center gap-1.5 bg-sage-light/10">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C6B52" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>{feature.premium}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full bg-sage hover:bg-sage-dark text-white font-heading font-bold text-base py-4 rounded-2xl transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {processing
                ? "Processing..."
                : `Subscribe — ${PLANS.find((p) => p.key === selectedPlan)?.price}${PLANS.find((p) => p.key === selectedPlan)?.period}`}
            </button>

            <p className="text-[11px] text-taupe/60 text-center leading-relaxed">
              Cancel anytime. Secure payment via Stripe.
              <br />
              By subscribing you agree to our{" "}
              <button
                onClick={() => navigate("/terms")}
                className="underline bg-transparent border-none cursor-pointer text-taupe/60 p-0"
              >
                Terms
              </button>{" "}
              and{" "}
              <button
                onClick={() => navigate("/privacy")}
                className="underline bg-transparent border-none cursor-pointer text-taupe/60 p-0"
              >
                Privacy Policy
              </button>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
