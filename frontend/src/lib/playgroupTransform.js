// Shared transformer that converts a raw Supabase `playgroups` row
// into the shape expected by the PlaygroupCard component.
// Used by Browse (for the public listing) and HostDashboard (for the
// host's "how parents see you" preview) so the two always render
// identically.

// Color palette for playgroup cards without photos
export const CARD_COLORS = [
  "#7A8F6D",
  "#E8C4B0",
  "#F0EBE3",
  "#C08B6E",
  "#DAE4D0",
  "#5C6B52",
  "#D4A574",
  "#B8C9A3",
];

/**
 * @param {object} pg        raw Supabase playgroups row (may include
 *                           a `profiles` join for the host and
 *                           `memberships` array for member count)
 * @param {number} index     index used to pick a fallback photoColor
 * @param {object} [overrides]  optional fields to override — used when
 *                              the caller already knows the host name,
 *                              member count, etc. from another query
 */
export function transformPlaygroup(pg, index = 0, overrides = {}) {
  const host = pg.profiles || overrides.hostProfile || null;
  const hostFirst = overrides.hostFirstName ?? host?.first_name ?? "Host";
  const hostLast = overrides.hostLastName ?? host?.last_name ?? "";
  const hostInitials =
    (hostFirst[0] || "H").toUpperCase() + (hostLast[0] || "").toUpperCase();

  // Member count: prefer explicit override, then memberships join, then 0
  let memberCount = 0;
  if (typeof overrides.memberCount === "number") {
    memberCount = overrides.memberCount;
  } else if (Array.isArray(pg.memberships)) {
    memberCount = pg.memberships.filter((m) => m.role === "member").length;
  }

  return {
    id: pg.id,
    creatorId: pg.creator_id || null,
    name: pg.name,
    location: pg.location_name || "Location TBD",
    tags: pg.vibe_tags || [],
    familyCount: memberCount,
    maxFamilies: pg.max_families || 8,
    ageRange: pg.age_range || "All ages",
    nextSession: pg.frequency || "TBD",
    rating: Number(pg.trust_score) || 0,
    reviewCount: pg.review_count || 0,
    accessType: pg.access_type || "request",
    setting: pg.environment?.setting || "Indoor",
    hostName: `${hostFirst} ${hostLast}`.trim(),
    hostInitials,
    verified: host?.is_verified || false,
    photoColor: CARD_COLORS[index % CARD_COLORS.length],
    photos: pg.photos || [],
    latitude: pg.latitude || null,
    longitude: pg.longitude || null,
    createdAt: pg.created_at || null,
  };
}
