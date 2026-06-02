import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";

export default function NannyEarnings() {
  const { user, profile } = useAuth();
  const [completedTotal, setCompletedTotal] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("rate_cents, platform_fee_cents")
        .eq("nanny_id", user.id)
        .eq("status", "completed");
      const total = (data || []).reduce((s, b) => s + b.rate_cents - b.platform_fee_cents, 0);
      setCompletedTotal(total);
    })();
  }, [user?.id]);

  const onboard = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-link");
      if (error) {
        const body = await error.context?.text?.().catch(() => null);
        throw new Error(body || error.message || "Edge function failed");
      }
      if (!data?.url) throw new Error("No onboarding URL returned");
      window.location.href = data.url;
    } catch (e) {
      console.error("[stripe-connect-link]", e);
      setConnectError(e.message || String(e));
      setConnecting(false);
    }
  };

  const needsOnboarding = !profile?.stripe_connect_charges_enabled;

  return (
    <main>
      <h1>Earnings</h1>
      {needsOnboarding ? (
        <section>
          <p>Set up payouts to start accepting bookings.</p>
          <button onClick={onboard} disabled={connecting}>
            {connecting ? "Opening Stripe…" : "Connect with Stripe"}
          </button>
          {connectError && (
            <p role="alert" style={{ color: "crimson", marginTop: 12 }}>
              Couldn't start Stripe onboarding: {connectError}
            </p>
          )}
        </section>
      ) : (
        <section>
          <h2>Total earned: ${(completedTotal / 100).toFixed(2)}</h2>
          <p>Payouts are managed by Stripe and sent to your linked bank account.</p>
        </section>
      )}
    </main>
  );
}
