import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const PLANS = [
  {
    key: "host_monthly",
    label: "Monthly",
    price: "$4.99",
    period: "/mo",
    description: "Cancel anytime",
  },
  {
    key: "host_annual",
    label: "Annual",
    price: "$49.99",
    period: "/yr",
    description: "2 months free — just $4.17/mo",
    badge: "Best Value",
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Premium Badge",
    desc: "Stand out with a gold Premium badge on your playgroup card",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Priority Placement",
    desc: "Your playgroup appears first in Browse results",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#5C6B52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="#5C6B52" strokeWidth="1.5" />
      </svg>
    ),
    title: "View Analytics",
    desc: "See who's viewing your playgroup and track interest over time",
  },
];

export default function HostPremium() {
  useDocumentTitle("Host Premium"); // #50
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isHostPremium, hostSubscription, loading, refresh } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState("host_annual");
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  // #52: mirror the /premium cancel handling on the host side — same
  // Stripe flow, same gap. See Premium.jsx for the longer rationale.
  const [cancelMessage, setCancelMessage] = useState("");

  // Handle return from Stripe Checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("You're now a Host Premium member!");
      refresh();
    } else if (searchParams.get("cancelled") === "true") {
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
      alert("Failed to start checkout: " + (err.message || "Please try again."));
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
    <div className="min-h-screen bg-cream">
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
          <h1 className="font-bold text-base tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Host Premium
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

        {/* #52: cancelled banner for the host-side Stripe cancel */}
        {/* round-trip. See Premium.jsx for the same pattern. */}
        {cancelMessage && (
          <div className="bg-cream-dark/50 border border-cream-dark rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-taupe-dark font-medium">{cancelMessage}</p>
          </div>
        )}

        {isHostPremium ? (
          /* Already subscribed */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-amber-300 p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-charcoal text-xl mb-1">
                You're Host Premium!
              </h2>
              <p className="text-sm text-taupe mb-3">
                {hostSubscription.plan === "host_annual" ? "Annual" : "Monthly"} plan
              </p>
              <p className="text-xs text-taupe">
                Renews {new Date(hostSubscription.current_period_end).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h3 className="font-heading font-semibold text-charcoal text-sm mb-3">
                Your Host Premium benefits
              </h3>
              <div className="space-y-4">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-charcoal">{f.title}</p>
                      <p className="text-xs text-taupe">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Upsell */
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-charcoal text-2xl mb-2">
                Grow Your Playgroup
              </h2>
              <p className="text-sm text-taupe leading-relaxed max-w-xs mx-auto">
                Get more visibility, attract more families, and track your group's reach.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="bg-white rounded-2xl border border-cream-dark p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{f.title}</p>
                    <p className="text-xs text-taupe leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Plan selection */}
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                    selectedPlan === plan.key
                      ? "border-amber-400 bg-amber-50"
                      : "border-cream-dark bg-white hover:border-amber-200"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-4 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
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

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={processing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-base py-4 rounded-2xl transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {processing
                ? "Processing..."
                : `Go Premium — ${PLANS.find((p) => p.key === selectedPlan)?.price}${PLANS.find((p) => p.key === selectedPlan)?.period}`}
            </button>

            <p className="text-[11px] text-taupe/60 text-center leading-relaxed">
              Cancel anytime. Secure payment via Stripe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
