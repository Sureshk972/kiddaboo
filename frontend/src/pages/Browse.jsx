import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_PLAYGROUPS, VIBE_TAGS, AGE_RANGES } from "../data/mockData";
import { supabase } from "../lib/supabase";
import FilterSheet from "../components/browse/FilterSheet";

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "reviews", label: "Most Reviewed" },
  { value: "spots", label: "Spots Open" },
];

const ACCESS_ICONS = {
  open: "Open",
  request: "Request",
  invite: "Invite Only",
};

// Color palette for playgroup cards without photos
const CARD_COLORS = [
  "#A3B18A", "#E8C4B0", "#F0EBE3", "#C08B6E",
  "#DAE4D0", "#7A8F6D", "#D4A574", "#B8C9A3",
];

// Transform a Supabase playgroup row into the shape Browse expects
function transformPlaygroup(pg, index) {
  const host = pg.profiles;
  const hostFirst = host?.first_name || "Host";
  const hostLast = host?.last_name || "";
  const hostInitials =
    (hostFirst[0] || "H").toUpperCase() + (hostLast[0] || "").toUpperCase();

  // Count members (creator excluded) from the memberships join
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
    rating: 0,
    reviewCount: 0,
    accessType: pg.access_type || "request",
    setting: pg.environment?.setting || "Indoor",
    hostName: `${hostFirst} ${hostLast}`.trim(),
    hostInitials,
    verified: host?.is_verified || false,
    photoColor: CARD_COLORS[index % CARD_COLORS.length],
    photos: pg.photos || [],
    isReal: true, // flag to distinguish from mock data
  };
}

export default function Browse() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vibeTags: [],
    ageRange: [],
    setting: [],
    accessType: [],
  });

  // Real playgroups from Supabase
  const [realPlaygroups, setRealPlaygroups] = useState([]);
  const [loadingReal, setLoadingReal] = useState(true);

  useEffect(() => {
    const fetchPlaygroups = async () => {
      const { data, error } = await supabase
        .from("playgroups")
        .select(`
          *,
          profiles:creator_id ( first_name, last_name, is_verified ),
          memberships ( role )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRealPlaygroups(data.map((pg, i) => transformPlaygroup(pg, i)));
      }
      setLoadingReal(false);
    };
    fetchPlaygroups();
  }, []);

  // Combine real + mock (real first, mock fills out the page)
  const allPlaygroups = useMemo(() => {
    if (loadingReal) return MOCK_PLAYGROUPS;
    return [...realPlaygroups, ...MOCK_PLAYGROUPS];
  }, [realPlaygroups, loadingReal]);

  // Count active filters
  const activeFilterCount = Object.values(filters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  // Filter and sort playgroups
  const results = useMemo(() => {
    let list = [...allPlaygroups];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
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

    // Sort
    if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "reviews") {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (sortBy === "spots") {
      list.sort(
        (a, b) =>
          b.maxFamilies - b.familyCount - (a.maxFamilies - a.familyCount)
      );
    }

    return list;
  }, [search, filters, sortBy, allPlaygroups]);

  return (
    <div className="bg-cream">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 pt-4 pb-3">
          {/* Title row */}
          <div className="mb-3">
            <h1 className="text-xl font-heading font-bold text-charcoal">
              Discover
            </h1>
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
                transition-all duration-150 cursor-pointer border
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
                  onClick={() => setSortBy(opt.value)}
                  className={`
                    px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap
                    transition-all duration-150 cursor-pointer border
                    ${
                      sortBy === opt.value
                        ? "bg-sage-light text-sage-dark border-sage"
                        : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-md mx-auto px-5 py-4">
        {/* Result count */}
        <p className="text-xs text-taupe mb-3">
          {results.length} playgroup{results.length !== 1 ? "s" : ""} found
        </p>

        {/* Playgroup cards */}
        {results.length > 0 ? (
          <div className="flex flex-col gap-3">
            {results.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/playgroup/${group.id}`)}
                className="bg-white rounded-2xl border border-cream-dark overflow-hidden hover:border-sage-light transition-all duration-150 cursor-pointer hover:shadow-sm"
              >
                {/* Photo strip */}
                <div
                  className="h-28 flex items-end p-3 relative overflow-hidden"
                  style={{ backgroundColor: group.photoColor + "40" }}
                >
                  {group.photos?.length > 0 && (
                    <img
                      src={group.photos[0]}
                      alt={group.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="flex items-center gap-1.5 relative z-10">
                    {group.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-white/80 backdrop-blur-sm text-sage-dark px-2 py-0.5 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-heading font-bold text-charcoal text-base leading-tight">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#7A8F6D">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                      <span className="text-sm font-medium text-charcoal">
                        {group.rating}
                      </span>
                      <span className="text-xs text-taupe">
                        ({group.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-xs text-taupe mb-3 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    {group.location}
                  </p>

                  {/* Info row */}
                  <div className="flex items-center justify-between">
                    {/* Host info */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-sage-light flex items-center justify-center">
                        <span className="text-[9px] font-bold text-sage-dark">
                          {group.hostInitials}
                        </span>
                      </div>
                      <span className="text-xs text-taupe-dark">
                        {group.hostName}
                      </span>
                      {group.verified && (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill="#A3B18A" />
                          <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 text-[11px] text-taupe">
                      <span>Ages {group.ageRange}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-taupe/40" />
                      <span>
                        {group.maxFamilies - group.familyCount > 0
                          ? `${group.maxFamilies - group.familyCount} spots`
                          : "Full"}
                      </span>
                    </div>
                  </div>

                  {/* Next session */}
                  <div className="mt-3 pt-3 border-t border-cream-dark flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-taupe">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Next: {group.nextSession}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        group.accessType === "open"
                          ? "bg-sage-light/50 text-sage-dark"
                          : group.accessType === "request"
                          ? "bg-terracotta-light/50 text-taupe-dark"
                          : "bg-cream-dark text-taupe"
                      }`}
                    >
                      {ACCESS_ICONS[group.accessType]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-cream-dark rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-taupe/30">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
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
          </div>
        )}
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
