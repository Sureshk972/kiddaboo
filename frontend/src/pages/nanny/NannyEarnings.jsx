import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import Button from "../../components/ui/Button";

async function invokeWithJwt(name) {
  await supabase.auth.refreshSession().catch(() => {});
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return { error: { message: "Signed out. Sign in again." } };
  const res = await supabase.functions.invoke(name, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.error) {
    try {
      const txt = await res.error.context?.text?.();
      if (txt) {
        const parsed = JSON.parse(txt);
        return { error: { message: parsed.error || txt }, raw: parsed };
      }
    } catch {
      /* fall through */
    }
    return { error: res.error };
  }
  return res;
}

export default function NannyEarnings() {
  const { user, profile, fetchProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // {detailsSubmitted, requirementsDue:[], disabledReason}

  // When the user lands here from Stripe onboarding (?connect=return) or
  // a refresh redirect (?connect=refresh), don't trust the cached
  // profile state — pull live state from Stripe and update the DB.
  useEffect(() => {
    const fromStripe = params.get("connect");
    if (!fromStripe || !user?.id) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      const res = await invokeWithJwt("stripe-connect-sync");
      if (cancelled) return;
      if (!res.error) {
        setSyncStatus({
          detailsSubmitted: res.data?.details_submitted,
          requirementsDue: res.data?.requirements_currently_due || [],
          disabledReason: res.data?.requirements_disabled_reason,
        });
      }
      await fetchProfile(user.id).catch(() => {});
      // Strip the connect= param so a refresh doesn't re-sync forever
      params.delete("connect");
      setParams(params, { replace: true });
      setSyncing(false);
    })();
    return () => {
      cancelled = true;
    };
    // We only want this on first render after coming back; the param
    // gate above ensures we don't re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    const res = await invokeWithJwt("stripe-connect-link");
    if (res.error) {
      setConnectError(res.error.message);
      setConnecting(false);
      return;
    }
    if (!res.data?.url) {
      setConnectError("No onboarding URL returned.");
      setConnecting(false);
      return;
    }
    window.location.href = res.data.url;
  };

  const needsOnboarding = !profile?.stripe_connect_charges_enabled;
  const hasStartedOnboarding = !!profile?.stripe_connect_account_id;

  if (syncing) {
    return (
      <div className="px-5 py-4 flex flex-col gap-5">
        <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
          Earnings
        </h1>
        <div className="bg-white border border-cream-dark p-6 text-center">
          <p className="text-sm text-charcoal">Checking with Stripe…</p>
          <p className="text-xs text-taupe mt-2">
            Confirming your payout setup. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      <h1 className="text-2xl font-heading font-bold tracking-tight text-sage-dark">
        Earnings
      </h1>

      {needsOnboarding ? (
        <section className="bg-white border border-cream-dark p-5 flex flex-col gap-3">
          <h2 className="text-base font-heading font-bold text-charcoal">
            {hasStartedOnboarding ? "Finish setting up payouts" : "Set up payouts"}
          </h2>
          <p className="text-sm text-charcoal">
            {hasStartedOnboarding
              ? "Stripe still needs a bit more info before you can accept bookings."
              : "Connect a bank account through Stripe so we can route payments to you. Parents won't be able to book you until this is done."}
          </p>

          {/* Surface what Stripe is waiting on, if we have it from sync */}
          {syncStatus?.requirementsDue?.length > 0 && (
            <div className="bg-cream/60 border border-cream-dark p-3 text-xs text-charcoal">
              <p className="font-medium mb-1">Stripe still needs:</p>
              <ul className="list-disc list-inside text-taupe">
                {syncStatus.requirementsDue.slice(0, 5).map((r) => (
                  <li key={r}>{humanizeRequirement(r)}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={onboard} disabled={connecting} fullWidth>
            {connecting
              ? "Opening Stripe…"
              : hasStartedOnboarding
              ? "Continue with Stripe"
              : "Connect with Stripe"}
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

// Stripe's requirement codes are dot-separated, e.g.
// "external_account", "individual.id_number", "tos_acceptance.date".
// Make them human-readable.
function humanizeRequirement(code) {
  const map = {
    external_account: "Bank account",
    "individual.id_number": "SSN (last 4)",
    "individual.verification.document": "Photo ID upload",
    "individual.dob.day": "Date of birth",
    "individual.dob.month": "Date of birth",
    "individual.dob.year": "Date of birth",
    "tos_acceptance.date": "Accept Stripe's terms",
    "business_profile.url": "Business / personal URL",
  };
  if (map[code]) return map[code];
  // Fall back: replace dots/underscores with spaces, capitalize
  return code
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
