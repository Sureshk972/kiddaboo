import StatusBadge from "./StatusBadge";

export default function UsersTab({
  profiles,
  reports,
  childrenCounts,
  searchQuery,
  setSearchQuery,
  getUserRole,
  setConfirmAction,
  suspendUser,
  unsuspendUser,
}) {
  const filteredProfiles = searchQuery
    ? profiles.filter((p) => {
        const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        const id = p.id.toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || id.includes(q);
      })
    : profiles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-lg font-semibold text-charcoal">
          All Users
        </h2>
        <span className="text-xs text-taupe bg-cream-dark px-2.5 py-1 rounded-full">
          {filteredProfiles.length} total
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A3A08C"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search users by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-cream-dark rounded-xl py-2.5 pl-9 pr-4 text-sm text-charcoal placeholder:text-taupe/50 outline-none focus:border-sage-light"
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-dark p-8 text-center">
          <p className="text-taupe text-sm">No users found</p>
        </div>
      ) : (
        filteredProfiles.map((profile) => {
          const role = getUserRole(profile.id);
          const kidCount = childrenCounts[profile.id] || 0;
          const hasBio = profile.bio && profile.bio.trim().length > 0;
          const isSuspended = false; // is_suspended not available via PostgREST yet
          const reportCount = reports.filter(
            (r) => r.reported_user_id === profile.id
          ).length;
          return (
            <div
              key={profile.id}
              className={`bg-white rounded-2xl border p-4 ${
                isSuspended ? "border-red-200" : "border-cream-dark"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isSuspended ? "bg-red-100" : "bg-sage-light"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      isSuspended ? "text-red-600" : "text-sage-dark"
                    }`}
                  >
                    {(profile.first_name?.[0] || "?").toUpperCase()}
                    {(profile.last_name?.[0] || "").toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-charcoal text-sm truncate">
                      {profile.first_name || "—"} {profile.last_name || ""}
                    </p>
                    {role !== "none" && <StatusBadge status={role} />}
                  </div>
                  <p className="text-xs text-taupe mt-0.5 truncate">
                    ID: {profile.id.slice(0, 8)}...
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-taupe flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        hasBio ? "text-sage-dark" : "text-taupe"
                      }`}
                    >
                      {hasBio ? "✓" : "✗"} Bio
                    </span>
                    <span>
                      {kidCount} {kidCount === 1 ? "child" : "children"}
                    </span>
                    {reportCount > 0 && (
                      <span className="text-red-500 font-medium">
                        {reportCount} {reportCount === 1 ? "report" : "reports"}
                      </span>
                    )}
                    <span>
                      Joined{" "}
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isSuspended) {
                      setConfirmAction({
                        type: "unsuspend",
                        title: "Unsuspend User",
                        message: `Restore access for ${profile.first_name || "this user"}? They will be able to use the app again.`,
                        confirmLabel: "Unsuspend",
                        confirmColor: "bg-sage hover:bg-sage-dark",
                        onConfirm: () => unsuspendUser(profile.id),
                      });
                    } else {
                      setConfirmAction({
                        type: "suspend",
                        title: "Suspend User",
                        message: `Suspend ${profile.first_name || "this user"}? This will remove all their memberships and deactivate their playgroups.`,
                        confirmLabel: "Suspend",
                        onConfirm: () => suspendUser(profile.id),
                      });
                    }
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    isSuspended
                      ? "border-sage bg-sage-light text-sage-dark hover:bg-sage hover:text-white"
                      : "border-cream-dark text-taupe hover:text-red-600 hover:border-red-200"
                  }`}
                >
                  {isSuspended ? "Unsuspend" : "Suspend"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
