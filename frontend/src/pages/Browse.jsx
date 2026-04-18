import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { haversineDistance } from "../lib/distance";
import { useUserLocation } from "../hooks/useUserLocation";
import { useAuth } from "../context/AuthContext";
import FilterSheet from "../components/browse/FilterSheet";
import PlaygroupCard from "../components/browse/PlaygroupCard";
import { transformPlaygroup } from "../lib/playgroupTransform";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const SORT_OPTIONS = [
  { value: "distance", label: "Nearest" },
  { value: "rating", label: "Rated" },
  { value: "spots", label: "Spots" },
];

export default function Browse() {
  // #50: per-route document title
  useDocumentTitle("Browse");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isHost, setIsHost] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vibeTags: [],
    ageRange: [],
    setting: [],
    accessType: [],
  });

  const { userLocation, loading: locationLoading, error: locationError, requestLocation } = useUserLocation();

  // Request location on mount for default distance sort
  useEffect(() => {
    requestLocation();
  }, []);

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
  const [fetchError, setFetchError] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    const fetchPlaygroups = async () => {
      setFetchError(false);
      setLoadingReal(true);
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

      if (pgResult.error) {
        console.error("Failed to fetch playgroups:", pgResult.error);
        setFetchError(true);
      } else if (pgResult.data) {
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
  }, [refetchKey]);

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
      // #22: strict distance sort. We used to bucket Open groups above
      // Request-only groups and then sort by distance within each
      // bucket, but that made an 828-mi Open group rank above a 0.7-mi
      // Request group, which is the opposite of what "Nearest" means.
      // Users who only want Open groups can use the access-type filter
      // in FilterSheet — sort should honor its label and nothing more.
      // Request-only groups are not second-class; hosts use that
      // access type to vet families before sharing kid info, which is
      // a kid-safety feature we actively want to reward, not bury.
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

    // Float premium hosts to the top, except when sorting by distance
    if (sortBy !== "distance") {
      list.sort((a, b) => {
        if (a.isHostPremium && !b.isHostPremium) return -1;
        if (!a.isHostPremium && b.isHostPremium) return 1;
        return 0;
      });
    }

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
          {/* Title row */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
                Kiddaboo
              </h1>
              {profile?.first_name && (
                <span className="text-sm font-medium text-taupe truncate">
                  Hi, {profile.first_name}{isHost ? " (Organizer)" : ""}
                </span>
              )}
            </div>
            {profile && (
              <div
                className="w-9 h-9 rounded-full bg-sage-light flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer border-2 border-sage/30"
                onClick={() => navigate("/my-profile")}
                role="button"
                aria-label="Go to profile"
              >
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={`${profile.first_name}'s photo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-heading font-bold text-sage-dark">
                    {(profile.first_name?.[0] || "").toUpperCase()}
                    {(profile.last_name?.[0] || "").toUpperCase()}
                  </span>
                )}
              </div>
            )}
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
          <div className="flex items-center gap-3">
            {/* Filter button — visually distinct */}
            <button
              onClick={() => setShowFilters(true)}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                transition-all duration-150 cursor-pointer border-2 active:scale-95 shrink-0
                ${
                  activeFilterCount > 0
                    ? "bg-sage text-white border-sage shadow-sm"
                    : "bg-white text-charcoal border-charcoal/20 hover:border-charcoal/40"
                }
              `}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 6H21M7 12H17M10 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-sage text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-cream-dark shrink-0" />

            {/* Sort chips — with "Sort:" label */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] text-taupe/60 uppercase tracking-wider font-medium shrink-0">Sort</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    opt.value === "distance" ? handleNearestSort() : setSortBy(opt.value)
                  }
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
                    transition-all duration-150 cursor-pointer flex items-center gap-1.5
                    active:scale-95
                    ${
                      sortBy === opt.value
                        ? "bg-sage-light text-sage-dark font-bold"
                        : "text-taupe hover:text-charcoal hover:bg-cream-dark/50"
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
        {/* Fetch error banner — shown instead of the skeleton/grid
            when the initial playgroup query fails. Gives the user a
            retry path instead of a silent empty state. */}
        {!loadingReal && fetchError && (
          <div className="bg-terracotta-light/40 border border-terracotta/30 rounded-2xl p-5 text-center">
            <p className="font-heading font-bold text-charcoal text-sm mb-1">
              Couldn't load playgroups
            </p>
            <p className="text-xs text-taupe mb-4">
              Check your connection and try again.
            </p>
            <button
              onClick={() => setRefetchKey((k) => k + 1)}
              className="bg-sage hover:bg-sage-dark text-white text-sm font-medium rounded-xl px-5 py-2 cursor-pointer border-none transition-colors"
            >
              Retry
            </button>
          </div>
        )}

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

        {/* Result count */}
        {!loadingReal && !fetchError && (
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs text-taupe">
                {results.length} playgroup{results.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        )}

        {/* Playgroup grid */}
        {!loadingReal && !fetchError && results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((group, i) => (
                <PlaygroupCard
                  key={group.id}
                  group={{ ...group, isOwnGroup: group.creatorId === user?.id }}
                  featured={i === 0 && results.length > 1 && group.isHostPremium}
                  premium={group.isHostPremium}
                  onClick={() => navigate(`/playgroup/${group.id}`)}
                />
              ))}
            </div>

            {/* Host CTA — hide for users who are already hosts */}
            {!search && activeFilterCount === 0 && !isHost && (
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
        ) : !loadingReal && !fetchError ? (
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
                  Organize a Playgroup
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
