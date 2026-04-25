import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Shows the host's current verification standing and a "Request
// verification" CTA. Hidden entirely for non-hosts since the badge
// only renders in host contexts (PlaygroupCard, PlaygroupDetail).
//
// States:
//   verified=true                   → green badge, no CTA
//   latest request status=pending   → "Under review" pill
//   latest request status=rejected  → "Declined" pill + re-request button
//   nothing                         → "Request verification" button
export default function HostVerificationCard({ userId, isVerified }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchLatest = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("verification_requests")
      .select("id, status, submitted_at, reviewed_at, notes")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1);
    setLatest(data?.[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchLatest();
  }, [userId]);

  const submitRequest = async () => {
    setSubmitting(true);
    setError("");
    const { error: err } = await supabase
      .from("verification_requests")
      .insert({ user_id: userId });
    setSubmitting(false);
    if (err) {
      console.error("Failed to submit verification request:", err);
      // 23505 = unique-violation from one_pending_per_user_idx
      if (err.code === "23505") {
        setError("You already have a request under review.");
      } else {
        setError(err.message || "Couldn't submit your request.");
      }
      return;
    }
    fetchLatest();
  };

  if (!userId || loading) return null;

  const statusPill = (text, tone) => (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${
        tone === "green"
          ? "bg-sage-light text-sage-dark"
          : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-cream-dark text-taupe"
      }`}
    >
      {text}
    </span>
  );

  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-heading font-bold text-charcoal">
            Host verification
          </h3>
          {isVerified ? (
            <>
              <p className="text-xs text-taupe mt-0.5 leading-relaxed">
                Your profile shows a Verified badge to parents browsing your group.
              </p>
              <div className="mt-2">
                {statusPill("✓ Verified", "green")}
              </div>
            </>
          ) : latest?.status === "pending" ? (
            <>
              <p className="text-xs text-taupe mt-0.5 leading-relaxed">
                We're reviewing your request. This usually takes a few days.
              </p>
              <div className="mt-2">{statusPill("Under review", "amber")}</div>
            </>
          ) : latest?.status === "rejected" ? (
            <>
              <p className="text-xs text-taupe mt-0.5 leading-relaxed">
                Your previous request wasn't approved. You can submit a new one anytime.
                {latest.notes ? (
                  <span className="block mt-1 italic">Reviewer note: {latest.notes}</span>
                ) : null}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {statusPill("Declined", "neutral")}
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={submitting}
                  className="text-xs bg-blue-600 text-white font-medium rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Request again"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-taupe mt-0.5 leading-relaxed">
                Verified hosts get a badge on their group and appear in the trusted-hosts filter.
              </p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={submitRequest}
                  disabled={submitting}
                  className="text-xs bg-blue-600 text-white font-medium rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Request verification"}
                </button>
              </div>
            </>
          )}
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
