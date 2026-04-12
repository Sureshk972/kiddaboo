import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import StatusBadge from "./StatusBadge";

/**
 * Slide-over detail panel for a selected user in the Admin → Users tab.
 * Fetches children + memberships on mount so we don't bloat the parent
 * query with data we rarely need.
 */
export default function UserDetailPanel({
  profile,
  role,
  reportCount,
  onClose,
}) {
  const [children, setChildren] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuspended = !!profile.is_suspended;

  useEffect(() => {
    if (!profile?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from("children")
        .select("id, name, age_range, personality_tags")
        .eq("user_id", profile.id),
      supabase
        .from("memberships")
        .select(`
          id, role, created_at,
          playgroups:playgroup_id ( id, name, location_name, is_active )
        `)
        .eq("user_id", profile.id),
    ]).then(([childRes, memRes]) => {
      if (!childRes.error) setChildren(childRes.data || []);
      if (!memRes.error) setMemberships(memRes.data || []);
      setLoading(false);
    });
  }, [profile.id]);

  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/30 z-40"
        onClick={onClose}
      />

      {/* Panel — slides in from right */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-cream z-50 shadow-xl overflow-y-auto animate-slideIn">
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
          <h2 className="font-heading font-bold text-charcoal text-base">
            User Details
          </h2>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Profile card */}
          <div className={`bg-white rounded-2xl border p-5 text-center ${isSuspended ? "border-red-200" : "border-cream-dark"}`}>
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={`${profile.first_name || "User"}'s photo`}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
              />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${isSuspended ? "bg-red-100" : "bg-sage-light"}`}>
                <span className={`text-2xl font-bold ${isSuspended ? "text-red-600" : "text-sage-dark"}`}>
                  {(profile.first_name?.[0] || "?").toUpperCase()}
                  {(profile.last_name?.[0] || "").toUpperCase()}
                </span>
              </div>
            )}
            <h3 className="font-heading font-bold text-charcoal text-lg">
              {profile.first_name || "—"} {profile.last_name || ""}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              {role !== "none" && <StatusBadge status={role} />}
              {isSuspended && <StatusBadge status="suspended" />}
              {profile.is_verified && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-taupe mt-2">
              ID: {profile.id}
            </p>
            <p className="text-xs text-taupe mt-0.5">
              Joined {joinDate}
            </p>
            {profile.zip_code && (
              <p className="text-xs text-charcoal font-medium mt-1.5">
                Zip: {profile.zip_code}
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
              Bio
            </h4>
            {profile.bio && profile.bio.trim() ? (
              <p className="text-sm text-charcoal leading-relaxed">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-taupe/60 italic">No bio provided</p>
            )}
          </div>

          {/* Philosophy tags */}
          {profile.philosophy_tags?.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-dark p-5">
              <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
                Parenting Philosophy
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.philosophy_tags.map((tag) => (
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

          {/* Trust & reports */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
              Trust & Safety
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-charcoal">{profile.trust_score || 0}</p>
                <p className="text-[11px] text-taupe">Trust Score</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${reportCount > 0 ? "bg-red-50" : "bg-cream"}`}>
                <p className={`text-lg font-bold ${reportCount > 0 ? "text-red-600" : "text-charcoal"}`}>
                  {reportCount}
                </p>
                <p className="text-[11px] text-taupe">Reports Against</p>
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
              Children
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            ) : children.length > 0 ? (
              <div className="space-y-2.5">
                {children.map((child) => (
                  <div key={child.id} className="flex items-center gap-3 bg-cream rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-sage-dark">
                        {(child.name?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {child.name || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {child.age_range && (
                          <span className="text-[11px] text-taupe">{child.age_range}</span>
                        )}
                        {child.personality_tags?.length > 0 && (
                          <span className="text-[11px] text-taupe/60">
                            {child.personality_tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-taupe/60 italic">No children added</p>
            )}
          </div>

          {/* Memberships / Playgroups */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-3">
              Playgroup Memberships
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            ) : memberships.length > 0 ? (
              <div className="space-y-2">
                {memberships.map((m) => {
                  const pg = m.playgroups;
                  if (!pg) return null;
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-cream rounded-xl px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-charcoal truncate">
                          {pg.name || "—"}
                        </p>
                        <p className="text-[11px] text-taupe truncate">
                          {pg.location_name || "No location"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={m.role} />
                        {!pg.is_active && (
                          <span className="text-[10px] text-red-500 font-medium">Inactive</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-taupe/60 italic">Not a member of any playgroup</p>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-cream-dark p-5">
            <h4 className="text-xs text-taupe uppercase tracking-wide font-medium mb-2">
              Account Details
            </h4>
            <div className="space-y-1.5 text-xs text-taupe">
              <div className="flex justify-between">
                <span>Role</span>
                <span className="text-charcoal font-medium">{profile.role || "user"}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-charcoal font-medium">
                  {profile.updated_at
                    ? new Date(profile.updated_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {profile.notification_prefs && (
                <div className="flex justify-between">
                  <span>Notifications</span>
                  <span className="text-charcoal font-medium">
                    {typeof profile.notification_prefs === "object"
                      ? Object.entries(profile.notification_prefs)
                          .filter(([, v]) => v)
                          .map(([k]) => k)
                          .join(", ") || "None"
                      : "Default"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
