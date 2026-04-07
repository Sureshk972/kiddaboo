function formatHostSince(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function HostCard({ host }) {
  if (!host) return null;

  const hostSince = formatHostSince(host.memberSince);

  return (
    <div className="bg-white rounded-2xl p-5 border border-cream-dark">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
          <span className="text-sage-dark font-heading font-bold text-lg">
            {host.initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-heading font-bold text-charcoal">
              {host.name}
            </h4>
            {host.verified && (
              <span className="inline-flex items-center gap-0.5 bg-sage-light text-sage-dark text-[11px] font-medium px-2 py-0.5 rounded-full">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Verified
              </span>
            )}
          </div>
          <p className="text-xs text-taupe mb-2">
            {hostSince ? `Host since ${hostSince}` : "Host"}
            {" "}&middot; Trust score{" "}
            <span className="text-sage-dark font-medium">{host.trustScore}</span>
          </p>
          <p className="text-sm text-taupe-dark leading-relaxed">{host.bio}</p>

          {/* Philosophy tags */}
          {host.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {host.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] bg-cream-dark text-taupe px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
