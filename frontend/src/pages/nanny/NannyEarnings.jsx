import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import Button from "../../components/ui/Button";

export default function NannyEarnings() {
  const { user, profile } = useAuth();
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("rate_cents, platform_fee_cents, status")
        .eq("nanny_id", user.id)
        .in("status", ["completed", "confirmed"]);
      const rows = data || [];
      const completed = rows.filter((b) => b.status === "completed");
      const pending = rows.filter((b) => b.status === "confirmed");
      const sum = (acc, b) => acc + b.rate_cents - b.platform_fee_cents;
      setCompletedTotal(completed.reduce(sum, 0));
      setCompletedCount(completed.length);
      setPendingTotal(pending.reduce(sum, 0));
      setPendingCount(pending.length);
      setLoading(false);
    })();
  }, [user?.id]);

  const onboard = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await supabase.auth.refreshSession().catch(() => {});
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("You're signed out. Please sign in again.");
      const { data, error } = await supabase.functions.invoke("stripe-connect-link", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) {
        let detail = error.message;
        try {
          const body = await error.context?.text?.();
          if (body) {
            const parsed = JSON.parse(body);
            detail = parsed.error || body;
          }
        } catch {
          /* fall through */
        }
        throw new Error(detail);
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
    <div className="px-5 py-4 flex flex-col gap-5">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Earnings
      </h1>

      {needsOnboarding ? (
        <section className="bg-white border border-cream-dark p-5 flex flex-col gap-3">
          <h2 className="text-base font-heading font-bold text-charcoal">
            Set up payouts
          </h2>
          <p className="text-sm text-charcoal">
            Connect a bank account through Stripe so we can route payments to
            you. Parents won't be able to book you until this is done.
          </p>
          <Button onClick={onboard} disabled={connecting} fullWidth>
            {connecting ? "Opening Stripe…" : "Connect with Stripe"}
          </Button>
          {connectError && (
            <p role="alert" className="text-xs text-terracotta">
              Couldn't start Stripe onboarding: {connectError}
            </p>
          )}
        </section>
      ) : loading ? (
        <p className="text-sm text-taupe text-center py-8">Loading earnings…</p>
      ) : (
        <>
          <section className="bg-white border border-cream-dark p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[1.5px] text-taupe">
              Earned (paid out)
            </p>
            <p className="text-4xl font-heading font-bold text-sage-dark mt-2">
              ${(completedTotal / 100).toFixed(2)}
            </p>
            <p className="text-xs text-taupe mt-2">
              {completedCount} completed session{completedCount === 1 ? "" : "s"}
              {" · "}your share after Kiddaboo's 15% service fee
            </p>
          </section>

          {pendingCount > 0 && (
            <section className="bg-cream/60 border border-cream-dark p-4 flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[1.5px] text-taupe">
                  Upcoming
                </p>
                <p className="text-[11px] text-taupe mt-1">
                  {pendingCount} confirmed session{pendingCount === 1 ? "" : "s"}
                  {" · "}paid out after each session ends
                </p>
              </div>
              <p className="text-2xl font-heading font-bold text-charcoal whitespace-nowrap">
                ${(pendingTotal / 100).toFixed(2)}
              </p>
            </section>
          )}

          <p className="text-xs text-taupe text-center px-4">
            Payouts are managed by Stripe and sent to your linked bank account
            on a rolling schedule.
          </p>
        </>
      )}
    </div>
  );
}
