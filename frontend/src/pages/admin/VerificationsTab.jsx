import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "./timeAgo";

// Self-contained tab — fetches its own queue rather than threading
// state through Admin.jsx, since the data only matters when this tab
// is open. Pending count is also surfaced as a sidebar badge via the
// optional onPendingCountChange prop.
export default function VerificationsTab({ onPendingCountChange }) {
  const [filter, setFilter] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");
  // Reject opens an inline notes editor on the row instead of a confirm()
  // dialog, so admins can leave a short reason that flows into the
  // rejection push notification body.
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("verification_requests")
      .select("id, user_id, status, submitted_at, reviewed_at, notes")
      .eq("status", filter)
      .order("submitted_at", { ascending: false })
      .limit(100);

    if (err) {
      console.error("Failed to fetch verification requests:", err);
      setError("Couldn't load requests.");
      setLoading(false);
      return;
    }

    // Fetch profiles separately — verification_requests.user_id is FK'd
    // to auth.users (not public.profiles), so PostgREST can't resolve
    // an embedded join. Hydrate client-side with a single batch query.
    const userIds = (data || []).map((r) => r.user_id);
    let profilesById = {};
    if (userIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, photo_url, bio, trust_score, is_verified")
        .in("id", userIds);
      if (profErr) {
        console.error("Failed to fetch profiles for verification queue:", profErr);
        setError("Couldn't load requests.");
        setLoading(false);
        return;
      }
      profilesById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }
    setRequests((data || []).map((r) => ({ ...r, profiles: profilesById[r.user_id] || null })));
    setLoading(false);

    // Refresh sidebar pending count alongside.
    if (onPendingCountChange) {
      const { count } = await supabase
        .from("verification_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      onPendingCountChange(count || 0);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleDecision = async (req, decision, noteOverride) => {
    const verb = decision === "approved" ? "approve" : "reject";
    if (decision === "approved" && !window.confirm(`Approve verification for ${req.profiles?.first_name || "this user"}?`)) {
      return;
    }
    setActingId(req.id);
    setError("");

    const note = (noteOverride ?? "").trim() || null;

    // Update the request row first. If this fails (e.g. RLS denial),
    // we abort before touching the profile so we don't leave the two
    // out of sync.
    const { error: reqErr } = await supabase
      .from("verification_requests")
      .update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewer_id: (await supabase.auth.getUser()).data.user?.id,
        ...(decision === "rejected" ? { notes: note } : {}),
      })
      .eq("id", req.id);

    if (reqErr) {
      console.error(`Failed to ${verb} request:`, reqErr);
      setError(reqErr.message || `Couldn't ${verb} the request.`);
      setActingId(null);
      return;
    }

    // On approval, flip the profile flag — admin role lets us through
    // the prevent_is_verified_escalation trigger.
    if (decision === "approved" && req.profiles?.id) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", req.profiles.id);
      if (profErr) {
        console.error("Verified the request but failed to flip profile flag:", profErr);
        setError("Request marked approved, but profile flag update failed. Re-try from the user panel.");
      }
    }

    setActingId(null);
    setRejectingId(null);
    setRejectNote("");
    fetchRequests();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h2 className="font-heading text-lg font-semibold text-charcoal">
          Verification Requests
        </h2>
        <div className="flex items-center gap-2">
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors cursor-pointer ${
                filter === s
                  ? "bg-charcoal text-white border-charcoal"
                  : "bg-white text-charcoal border-cream-dark hover:bg-cream"
              }`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">Loading...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No {filter} requests.</p>
        </div>
      ) : (
        requests.map((req) => {
          const p = req.profiles || {};
          const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown user";
          const initials =
            (p.first_name?.[0] || "?").toUpperCase() +
            (p.last_name?.[0] || "").toUpperCase();
          return (
            <div key={req.id} className="bg-white rounded-2xl border border-cream-dark p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center shrink-0 text-sage-dark font-bold text-sm">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-charcoal truncate">{fullName}</p>
                    <span className="text-xs text-taupe whitespace-nowrap shrink-0">
                      {timeAgo(req.submitted_at)}
                    </span>
                  </div>
                  <p className="text-xs text-taupe mt-0.5">
                    Trust score {p.trust_score || 0}
                    {p.is_verified && " · already verified"}
                  </p>
                  {p.bio && (
                    <p className="text-xs text-charcoal/80 mt-2 leading-relaxed line-clamp-3">
                      {p.bio}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-taupe mt-2 italic">
                      Note: {req.notes}
                    </p>
                  )}
                </div>
              </div>

              {filter === "pending" && rejectingId !== req.id && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleDecision(req, "approved")}
                    disabled={actingId === req.id}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-xl px-3 py-2 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                  >
                    {actingId === req.id ? "..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(req.id);
                      setRejectNote("");
                    }}
                    disabled={actingId === req.id}
                    className="flex-1 bg-white border border-cream-dark text-charcoal text-sm font-medium rounded-xl px-3 py-2 hover:bg-cream disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}

              {filter === "pending" && rejectingId === req.id && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs font-medium text-charcoal">
                    Reason (optional, shown to user)
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value.slice(0, 280))}
                    placeholder="e.g. Photo doesn't match profile name"
                    rows={2}
                    className="w-full text-sm border border-cream-dark rounded-xl px-3 py-2 focus:outline-none focus:border-charcoal resize-none"
                  />
                  <p className="text-[10px] text-taupe text-right">{rejectNote.length}/280</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision(req, "rejected", rejectNote)}
                      disabled={actingId === req.id}
                      className="flex-1 bg-charcoal text-white text-sm font-medium rounded-xl px-3 py-2 hover:bg-charcoal/90 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                    >
                      {actingId === req.id ? "..." : "Confirm reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNote("");
                      }}
                      disabled={actingId === req.id}
                      className="flex-1 bg-white border border-cream-dark text-charcoal text-sm font-medium rounded-xl px-3 py-2 hover:bg-cream disabled:opacity-60 disabled:cursor-wait cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
