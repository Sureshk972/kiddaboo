import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { haversineDistance } from "../lib/distance";
import { useUserLocation } from "../hooks/useUserLocation";
import { useAuth } from "../context/AuthContext";
import FilterSheet from "../components/browse/FilterSheet";
import PlaygroupCard from "../components/browse/PlaygroupCard";
import MapView from "../components/browse/MapView";

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "reviews", label: "Most Reviewed" },
  { value: "spots", label: "Spots Open" },
  { value: "distance", label: "Nearest" },
];

// Color palette for playgroup cards without photos
const CARD_COLORS = [
  "#7A8F6D", "#E8C4B0", "#F0EBE3", "#C08B6E",
  "#DAE4D0", "#5C6B52", "#D4A574", "#B8C9A3",
];

// Transform a Supabase playgroup row into the shape Browse expects
function transformPlaygroup(pg, index) {
  const host = pg.profiles;
  const hostFirst = host?.first_name || "Host";
  const hostLast = host?.last_name || "";
  const hostInitials =
    (hostFirst[0] || "H").toUpperCase() + (hostLast[0] || "").toUpperCase();

  const memberCount = pg.memberships
    ? pg.memberships.filter((m) => m.role === "member").length
    : 0;

  return {
    id: pg.id,
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
  };
}

export default function Browse() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isHost, setIsHost] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState("list");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vibeTags: [],
    ageRange: [],
    setting: [],
    accessType: [],
  });

  const { userLocation, loading: locationLoading, error: locationError, requestLocation } = useUserLocation();

  // Check if user is a host
  useEffect(() => {
    if (!user) return;
    supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "creator")
      .limit(1)
      .then(({ data }) => {
        if (data?.length > 0) setIsHost(true);
      });
  }, [user]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Real playgroups from Supabase
  const [realPlaygroups, setRealPlaygroups] = useState([]);
  const [loadingReal, setLoadingReal] = useState(true);

  useEffect(() => {
    const fetchPlaygroups = async () => {
      // Fetch playgroups and premium host IDs in parallel
      const [pgResult, premiumResult] = await Promise.all([
        supabase
          .from("playgroups")
          .select(`
            *,
            profiles:creator_id ( first_name, last_name, is_verified ),
            memberships ( role )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("user_id")
          .eq("type", "host_premium")
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString()),
      ]);

      const premiumHostIds = new Set(
        (premiumResult.data || []).map((s) => s.user_id)
      );

      if (!pgResult.error && pgResult.data) {
        setRealPlaygroups(
          pgResult.data.map((pg, i) => ({
            ...transformPlaygroup(pg, i),
            isHostPremium: premiumHostIds.has(pg.creator_id),
          }))
        );
      }
      setLoadingReal(false);
    };
    fetchPlaygroups();
  }, []);

  const allPlaygroups = useMemo(() => realPlaygroups, [realPlaygroups]);

  // Count active filters
  const activeFilterCount = Object.values(filters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Filter and sort playgroups
  const results = useMemo(() => {
    let list = [...allPlaygroups];

    // Search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.location.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Vibe tag filter
    if (filters.vibeTags.length > 0) {
      list = list.filter((g) =>
        filters.vibeTags.some((tag) => g.tags.includes(tag))
      );
    }

    // Age range filter
    if (filters.ageRange.length > 0) {
      list = list.filter((g) => filters.ageRange.includes(g.ageRange));
    }

    // Setting filter
    if (filters.setting.length > 0) {
      list = list.filter((g) => filters.setting.includes(g.setting));
    }

    // Access type filter
    if (filters.accessType.length > 0) {
      list = list.filter((g) => filters.accessType.includes(g.accessType));
    }

    // Compute distance if user location is available
    if (userLocation) {
      list = list.map((g) => ({
        ...g,
        distance:
          g.latitude && g.longitude
            ? haversineDistance(userLocation.lat, userLocation.lng, g.latitude, g.longitude)
            : null,
      }));
    }

    // Sort
    if (sortBy === "distance" && userLocation) {
      list.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "reviews") {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (sortBy === "spots") {
      list.sort(
        (a, b) =>
          b.maxFamilies - b.familyCount - (a.maxFamilies - a.familyCount)
      );
    }

    // Float premium hosts to the top (stable sort preserves order within groups)
    list.sort((a, b) => {
      if (a.isHostPremium && !b.isHostPremium) return -1;
      if (!a.isHostPremium && b.isHostPremium) return 1;
      return 0;
    });

    return list;
  }, [debouncedSearch, filters, sortBy, allPlaygroups, userLocation]);

  // When user taps "Nearest", request location and switch sort
  const handleNearestSort = () => {
    if (!userLocation && !locationLoading) {
      requestLocation();
    }
    setSortBy("distance");
  };

  return (
    <div className="bg-cream">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-6xl mx-auto px-5 pt-4 pb-3">
          {/* Title row with view toggle */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
                Kiddaboo
              </h1>
              {profile?.first_name && (
                <span className="text-sm font-medium text-taupe">
                  Hi, {profile.first_name}{isHost ? " (Host)" : ""}
                </span>
              )}
            </div>

            {/* List / Map toggle */}
            <div className="flex items-center bg-white border border-cream-dark rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 border-none cursor-pointer transition-colors ${
                  viewMode === "list"
                    ? "bg-sage-light text-sage-dark"
                    : "bg-transparent text-taupe hover:text-sage-dark"
                }`}
                aria-label="List view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 6H21M8 12H21M8 18H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`p-2 border-none cursor-pointer transition-colors ${
                  viewMode === "map"
                    ? "bg-sage-light text-sage-dark"
                    : "bg-transparent text-taupe hover:text-sage-dark"
                }`}
                aria-label="Map view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe/40"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, location, or vibe..."
              className="
                w-full bg-white border border-cream-dark rounded-xl pl-10 pr-4 py-3
                text-charcoal font-body text-sm outline-none transition-all duration-150
                placeholder:text-taupe/40
                focus:ring-2 focus:ring-sage-light focus:border-sage
              "
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-taupe/40 hover:text-taupe cursor-pointer bg-transparent border-none"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter & Sort row */}
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(true)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium
                transition-all duration-150 cursor-pointer border active:scale-95
                ${
                  activeFilterCount > 0
                    ? "bg-sage-light text-sage-dark border-sage"
                    : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                }
              `}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6H21M7 12H17M10 18H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-sage text-white text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    opt.value === "distance" ? handleNearestSort() : setSortBy(opt.value)
                  }
                  className={`
                    px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap
                    transition-all duration-150 cursor-pointer border flex items-center gap-1.5
                    active:scale-95
                    ${
                      sortBy === opt.value
                        ? "bg-sage-light text-sage-dark border-sage"
                        : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                    }
                  `}
                >
                  {opt.value === "distance" && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                  {opt.label}
                  {opt.value === "distance" && locationLoading && (
                    <div className="w-3 h-3 border border-sage border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Location error */}
          {locationError && sortBy === "distance" && (
            <p className="text-xs text-terracotta mt-2">{locationError}</p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-5 py-4">
        {/* Loading skeleton */}
        {loadingReal && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`bg-white rounded-2xl border border-cream-dark overflow-hidden animate-pulse ${i === 0 ? "md:col-span-2" : ""}`}>
                <div className={`bg-cream-dark/60 ${i === 0 ? "h-56" : "h-44"}`} />
                <div className="p-5">
                  <div className="flex gap-2 mb-3">
                    <div className="h-4 bg-cream-dark/60 rounded-full w-16" />
                    <div className="h-4 bg-cream-dark/60 rounded-full w-12" />
                  </div>
                  <div className="h-5 bg-cream-dark rounded-full w-3/5 mb-2" />
                  <div className="h-3 bg-cream-dark/60 rounded-full w-2/5 mb-4" />
                  <div className="h-10 bg-sage-light/20 rounded-xl mb-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-cream-dark" />
                      <div className="h-3 bg-cream-dark/60 rounded-full w-20" />
                    </div>
                    <div className="h-3 bg-cream-dark/60 rounded-full w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result count & sort (list view only) */}
        {!loadingReal && viewMode === "list" && (
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs text-taupe">
                {results.length} playgroup{results.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        )}

        {/* Map view */}
        {!loadingReal && viewMode === "map" && (
          <MapView
            playgroups={results}
            onSelectPlaygroup={(id) => navigate(`/playgroup/${id}`)}
            userLocation={userLocation}
          />
        )}

        {/* List view — Bento grid */}
        {!loadingReal && viewMode === "list" && results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((group, i) => (
                <PlaygroupCard
                  key={group.id}
                  group={group}
                  featured={i === 0 && results.length > 1 && group.isHostPremium}
                  premium={group.isHostPremium}
                  onClick={() => navigate(`/playgroup/${group.id}`)}
                />
              ))}
            </div>

            {/* Host CTA */}
            {!search && activeFilterCount === 0 && (
              <div className="mt-12 relative overflow-hidden rounded-2xl bg-sage-light/15 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 group">
                <div className="relative z-10 md:w-3/5">
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-sage-dark mb-3 leading-tight">
                    Share Your Space,<br />Grow Your Community.
                  </h2>
                  <p className="text-taupe text-sm mb-6 leading-relaxed max-w-md">
                    Join our circle of hosts and create meaningful play experiences in your neighborhood. We provide the tools, you provide the magic.
                  </p>
                  <button
                    onClick={() => navigate("/host/create")}
                    className="bg-sage hover:bg-sage-dark text-white px-8 py-3 rounded-full font-bold text-sm transition-all cursor-pointer border-none hover:shadow-lg active:scale-95"
                  >
                    Become a Host
                  </button>
                </div>
                <div className="hidden md:flex relative md:w-2/5 justify-center">
                  <div className="w-40 h-40 rounded-2xl bg-sage-light/40 flex items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-sage-dark/50">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-sage/5 rounded-full blur-3xl" />
              </div>
            )}
          </>
        ) : !loadingReal && viewMode === "list" ? (
          /* Empty state */
          <div className="text-center py-16 min-h-[60vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-cream-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-taupe/30">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {search || activeFilterCount > 0 ? (
              <>
                <h3 className="font-heading font-bold text-charcoal mb-1">
                  No playgroups found
                </h3>
                <p className="text-sm text-taupe mb-4">
                  Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setFilters({ vibeTags: [], ageRange: [], setting: [], accessType: [] });
                  }}
                  className="text-sm text-sage font-medium hover:text-sage-dark cursor-pointer bg-transparent border-none underline underline-offset-4"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="font-heading font-bold text-charcoal mb-1">
                  No playgroups yet
                </h3>
                <p className="text-sm text-taupe mb-4">
                  Be the first to create one in your area!
                </p>
                <button
                  onClick={() => navigate("/host/create")}
                  className="bg-sage text-white font-medium text-sm rounded-2xl px-6 py-3 cursor-pointer border-none hover:bg-sage-dark transition-colors"
                >
                  Host a Playgroup
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Filter bottom sheet */}
      <FilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}
