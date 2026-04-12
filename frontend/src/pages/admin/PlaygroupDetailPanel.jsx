import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import StatusBadge from "./StatusBadge";

/**
 * Slide-over detail panel for a selected playgroup in the Admin → Playgroups tab.
 * Fetches full member profiles and reviews on demand.
 */
export default function PlaygroupDetailPanel({ playgroup: pg, onClose }) {
  const [members, setMembers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const host = pg.profiles;
  const hostName = host
    ? `${host.first_name || ""} ${host.last_name || ""}`.trim()
    : "Unknown";

  useEffect(() => {
    if (!pg?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from("memberships")
        .select(`
          id, role, created_at, intro_message,
          profiles:user_id ( id, first_name, last_name, photo_url )
        `)
        .eq("playgroup_id", pg.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select(`
          id, overall_rating, comment, created_at,
          profiles:reviewer_id ( first_name, last_name )
        `)
        .eq("playgroup_id", pg.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(([memRes, revRes]) => {
      if (!memRes.error) setMembers(memRes.data || []);
      if (!revRes.error) setReviews(revRes.data || []);
      setLoading(false);
    });
  }, [pg.id]);

  const createdDate = pg.created_at
    ? new Date(pg.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const memberCount = members.filter(
    (m) => m.role === "member" || m.role === "creator"
  ).length;
  const pendingMembers = members.filter((m) => m.role === "pending");
  const activeMembers = members.filter(
    (m) => m.role === "member" || m.role === "creator"
  );
  const declinedMembers = members.filter((m) => m.role === "declined");
  const waitlistedMembers = members.filter((m) => m.role === "waitlisted");

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "—";

  const ACCESS_LABELS = {
    open: "Open — anyone can join",
    request: "Request to Join — host approves",
    invite: "Invite Only",
  };

  const env = pg.environment || {};

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-charcoal/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-cream z-50 shadow-xl overflow-y-auto animate-slideIn">
        {/* Header */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur-sm border-b border-cream-dark px-6 py-4 flex items-center gap-3 z-10">
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <h2 className="font-heading font-bold text-charcoal text-base truncate flex-1">
            {pg.name}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full ${pg.is_active ? "bg-sage" : "bg-cream-dark"}`}
            />
            <span className="text-xs text-taupe">
              {pg.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Photos */}
          {pg.photos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar rounded-2xl">
              {pg.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${pg.name} photo ${i + 1}`}
                  className="h-40 w-auto rounded-xl object-cover shrink-0"
                />
              ))}
            </div>
          )}

          {/* Status badges */}
          {pg.is_flagged && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-sm font-medium">⚑ Flagged</span>
              </div>
              {pg.flag_reason && (
                <p className="text-xs text-amber-700 mt-1">{pg.flag_reason}</p>
              )}
              {pg.flagged_at && (
                <p className="text-[11px] text-amber-500 mt-1">
                  Flagged on {new Date(pg.flagged_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
              Description
            </h4>
            {pg.description?.trim() ? (
              <p className="text-sm text-charcoal leading-relaxed">
                {pg.description}
              </p>
            ) : (
              <p className="text-sm text-taupe/60 italic">No description</p>
            )}
          </div>

          {/* Key details */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
              Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-taupe">Location</span>
                <span className="text-charcoal font-medium text-right max-w-[60%] truncate">
                  {pg.location_name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Frequency</span>
                <span className="text-charcoal font-medium">{pg.frequency || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Age Range</span>
                <span className="text-charcoal font-medium">{pg.age_range || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Access</span>
                <span className="text-charcoal font-medium text-right max-w-[60%]">
                  {ACCESS_LABELS[pg.access_type] || pg.access_type || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Max Families</span>
                <span className="text-charcoal font-medium">{pg.max_families || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Setting</span>
                <span className="text-charcoal font-medium capitalize">{pg.setting || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">Created</span>
                <span className="text-charcoal font-medium">{createdDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-taupe">ID</span>
                <span className="text-charcoal font-medium text-[11px] font-mono">{pg.id}</span>
              </div>
            </div>
          </div>

          {/* Vibe tags */}
          {pg.vibe_tags?.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
                Vibe Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {pg.vibe_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-sage-light text-sage-dark px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Host */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
              Host
            </h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-sage-dark">
                  {(host?.first_name?.[0] || "?").toUpperCase()}
                  {(host?.last_name?.[0] || "").toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">{hostName}</p>
                <p className="text-xs text-taupe font-mono">
                  {pg.creator_id?.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          {/* Environment checklist */}
          {Object.keys(env).length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
                Environment & Safety
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(env).map(([key, value]) => {
                  if (key === "maxGroupSize") return null;
                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (c) => c.toUpperCase())
                    .trim();
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-2 ${
                        value ? "bg-sage-light/50 text-sage-dark" : "bg-cream text-taupe/60"
                      }`}
                    >
                      <span>{value ? "✓" : "✗"}</span>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Screening questions */}
          {pg.screening_questions?.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
                Screening Questions
              </h4>
              <div className="space-y-2">
                {pg.screening_questions.map((q, i) => (
                  <div key={i} className="bg-cream rounded-xl px-3 py-2.5">
                    <p className="text-xs text-taupe font-medium">Q{i + 1}</p>
                    <p className="text-sm text-charcoal mt-0.5">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-1">
              Members
            </h4>
            <p className="text-[11px] text-taupe mb-3">
              {memberCount} of {pg.max_families || "—"} families
            </p>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active members */}
                {activeMembers.length > 0 && (
                  <div className="space-y-1.5">
                    {activeMembers.map((m) => (
                      <MemberRow key={m.id} membership={m} />
                    ))}
                  </div>
                )}

                {/* Pending */}
                {pendingMembers.length > 0 && (
                  <div>
                    <p className="text-[11px] text-taupe uppercase tracking-wide font-medium mb-1.5">
                      Pending ({pendingMembers.length})
                    </p>
                    <div className="space-y-1.5">
                      {pendingMembers.map((m) => (
                        <MemberRow key={m.id} membership={m} showIntro />
                      ))}
                    </div>
                  </div>
                )}

                {/* Waitlisted */}
                {waitlistedMembers.length > 0 && (
                  <div>
                    <p className="text-[11px] text-taupe uppercase tracking-wide font-medium mb-1.5">
                      Waitlisted ({waitlistedMembers.length})
                    </p>
                    <div className="space-y-1.5">
                      {waitlistedMembers.map((m) => (
                        <MemberRow key={m.id} membership={m} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Declined */}
                {declinedMembers.length > 0 && (
                  <div>
                    <p className="text-[11px] text-taupe uppercase tracking-wide font-medium mb-1.5">
                      Declined ({declinedMembers.length})
                    </p>
                    <div className="space-y-1.5">
                      {declinedMembers.map((m) => (
                        <MemberRow key={m.id} membership={m} />
                      ))}
                    </div>
                  </div>
                )}

                {members.length === 0 && (
                  <p className="text-sm text-taupe/60 italic">No members yet</p>
                )}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium">
                Reviews
              </h4>
              <span className="text-xs text-taupe">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""} · avg {avgRating}
              </span>
            </div>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-2.5">
                {reviews.map((r) => {
                  const reviewer = r.profiles;
                  const name = reviewer
                    ? `${reviewer.first_name || ""} ${reviewer.last_name || ""}`.trim()
                    : "Anonymous";
                  return (
                    <div key={r.id} className="bg-cream rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-charcoal">{name}</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-sage-dark font-medium">
                            {r.overall_rating || "—"}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#5C6B52" stroke="none">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-taupe mt-1 leading-relaxed">
                          {r.comment}
                        </p>
                      )}
                      <p className="text-[10px] text-taupe/50 mt-1">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-taupe/60 italic">No reviews yet</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Small member row used inside the members section */
function MemberRow({ membership: m, showIntro = false }) {
  const profile = m.profiles;
  const name = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Unknown";
  const initials =
    (profile?.first_name?.[0] || "?").toUpperCase() +
    (profile?.last_name?.[0] || "").toUpperCase();

  return (
    <div className="flex items-center gap-2.5 bg-cream rounded-xl px-3 py-2">
      {profile?.photo_url ? (
        <img
          src={profile.photo_url}
          alt={name}
          className="w-7 h-7 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-sage-light flex items-center justify-center shrink-0">
          <span className="text-[10px] font-medium text-sage-dark">{initials}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-charcoal truncate">{name}</p>
        {showIntro && m.intro_message && (
          <p className="text-[11px] text-taupe leading-relaxed mt-0.5 line-clamp-2">
            "{m.intro_message}"
          </p>
        )}
      </div>
      <StatusBadge status={m.role} />
    </div>
  );
}
