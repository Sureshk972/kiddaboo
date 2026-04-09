import { useState } from "react";

export default function PlaygroupsTab({
  playgroups,
  togglingId,
  togglePlaygroupActive,
  flagPlaygroup,
  unflagPlaygroup,
  bulkDeactivatePlaygroups,
  bulkFlagPlaygroups,
  setConfirmAction,
}) {
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkFlagReason, setBulkFlagReason] = useState("");

  const filters = ["all", "active", "inactive", "flagged"];

  const filteredPlaygroups = playgroups.filter((pg) => {
    if (filter === "active") return pg.is_active;
    if (filter === "inactive") return !pg.is_active;
    if (filter === "flagged") return pg.is_flagged;
    return true;
  });

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredPlaygroups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlaygroups.map((pg) => pg.id)));
    }
  }

  function handleBulkDeactivate() {
    const ids = Array.from(selectedIds);
    setConfirmAction({
      type: "bulk-deactivate",
      title: "Deactivate Selected Playgroups",
      message: `Deactivate ${ids.length} playgroup${ids.length > 1 ? "s" : ""}? They will no longer appear in search results.`,
      confirmLabel: "Deactivate All",
      confirmColor: "bg-terracotta hover:bg-terracotta/80",
      onConfirm: async () => {
        await bulkDeactivatePlaygroups(ids);
        setSelectedIds(new Set());
      },
    });
  }

  function handleBulkFlag() {
    const ids = Array.from(selectedIds);
    const reason = bulkFlagReason.trim() || "Flagged by admin";
    setConfirmAction({
      type: "bulk-flag",
      title: "Flag Selected Playgroups",
      message: `Flag ${ids.length} playgroup${ids.length > 1 ? "s" : ""} with reason: "${reason}"?`,
      confirmLabel: "Flag All",
      confirmColor: "bg-amber-600 hover:bg-amber-700",
      onConfirm: async () => {
        await bulkFlagPlaygroups(ids, reason);
        setSelectedIds(new Set());
        setBulkFlagReason("");
      },
    });
  }

  function handleBulkUnflag() {
    const ids = Array.from(selectedIds);
    setConfirmAction({
      type: "bulk-unflag",
      title: "Unflag Selected Playgroups",
      message: `Remove flags from ${ids.length} playgroup${ids.length > 1 ? "s" : ""}?`,
      confirmLabel: "Unflag All",
      confirmColor: "bg-sage hover:bg-sage-dark",
      onConfirm: async () => {
        for (const id of ids) {
          await unflagPlaygroup(id);
        }
        setSelectedIds(new Set());
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-lg font-semibold text-charcoal">
          All Playgroups
        </h2>
        <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
          {filteredPlaygroups.length} shown
        </span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelectedIds(new Set()); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border-none capitalize ${
              filter === f
                ? "bg-charcoal text-white"
                : "bg-white border border-cream-dark text-taupe hover:text-charcoal"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-white rounded-2xl border border-cream-dark p-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-charcoal font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDeactivate}
            className="px-3 py-1.5 rounded-lg bg-cream-dark text-taupe-dark text-xs font-medium hover:bg-terracotta-light transition-colors cursor-pointer border-none"
          >
            Deactivate
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Flag reason..."
              value={bulkFlagReason}
              onChange={(e) => setBulkFlagReason(e.target.value)}
              className="bg-cream border border-cream-dark rounded-lg px-2 py-1.5 text-xs text-charcoal placeholder:text-taupe/50 outline-none w-28"
            />
            <button
              onClick={handleBulkFlag}
              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-colors cursor-pointer border-none"
            >
              Flag
            </button>
          </div>
          <button
            onClick={handleBulkUnflag}
            className="px-3 py-1.5 rounded-lg bg-sage-light text-sage-dark text-xs font-medium hover:bg-sage hover:text-white transition-colors cursor-pointer border-none"
          >
            Unflag
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto px-2 py-1 text-xs text-taupe hover:text-charcoal cursor-pointer bg-transparent border-none"
          >
            Clear
          </button>
        </div>
      )}

      {/* Select all */}
      {filteredPlaygroups.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-taupe">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredPlaygroups.length && filteredPlaygroups.length > 0}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 rounded border-cream-dark accent-sage cursor-pointer"
            />
            Select all
          </label>
        </div>
      )}

      {filteredPlaygroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No playgroups found</p>
        </div>
      ) : (
        filteredPlaygroups.map((pg) => {
          const host = pg.profiles;
          const hostName = host
            ? `${host.first_name || ""} ${host.last_name || ""}`.trim()
            : "Unknown";
          const memberCount = pg.memberships
            ? pg.memberships.filter((m) => m.role === "member").length
            : 0;
          const pendingCount = pg.memberships
            ? pg.memberships.filter((m) => m.role === "pending").length
            : 0;
          return (
            <div
              key={pg.id}
              className={`bg-white rounded-2xl border p-4 ${
                pg.is_flagged ? "border-amber-300" : "border-cream-dark"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(pg.id)}
                  onChange={() => toggleSelect(pg.id)}
                  className="mt-1 w-3.5 h-3.5 rounded border-cream-dark accent-sage cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-charcoal text-sm truncate">
                      {pg.name}
                    </h3>
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        pg.is_active ? "bg-sage" : "bg-cream-dark"
                      }`}
                    />
                    {pg.is_flagged && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-taupe mt-0.5">
                    Hosted by {hostName}
                  </p>
                  <p className="text-xs text-taupe mt-0.5">
                    {pg.location_name || "No location"}
                  </p>
                  {pg.is_flagged && pg.flag_reason && (
                    <p className="text-xs text-amber-600 mt-1">
                      Flag: {pg.flag_reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePlaygroupActive(pg.id, pg.is_active)}
                    disabled={togglingId === pg.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer border-none ${
                      pg.is_active
                        ? "bg-cream-dark text-taupe-dark hover:bg-terracotta-light"
                        : "bg-sage-light text-sage-dark hover:bg-sage"
                    }`}
                  >
                    {togglingId === pg.id
                      ? "..."
                      : pg.is_active
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                  {pg.is_flagged ? (
                    <button
                      onClick={() => unflagPlaygroup(pg.id)}
                      className="px-3 py-1.5 rounded-lg bg-sage-light text-sage-dark text-xs font-medium hover:bg-sage hover:text-white transition-colors cursor-pointer border-none"
                    >
                      Unflag
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmAction({
                          type: "flag-playgroup",
                          title: "Flag Playgroup",
                          message: `Flag "${pg.name}"? This marks it for review.`,
                          confirmLabel: "Flag",
                          confirmColor: "bg-amber-600 hover:bg-amber-700",
                          onConfirm: () => flagPlaygroup(pg.id, "Flagged by admin"),
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer border-none"
                    >
                      Flag
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-taupe flex-wrap ml-6">
                <span className="inline-flex items-center gap-1">
                  <span className="text-sage-dark font-medium">
                    {memberCount}
                  </span>{" "}
                  members
                </span>
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-terracotta font-medium">
                      {pendingCount}
                    </span>{" "}
                    pending
                  </span>
                )}
                <span className="capitalize">
                  {pg.access_type || "request"} access
                </span>
                <span>Max {pg.max_families || "—"} families</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
