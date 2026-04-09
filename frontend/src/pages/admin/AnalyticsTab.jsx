function BarChart({ title, data, color }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-cream-dark p-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-3">{title}</h3>
        <p className="text-taupe text-sm">No data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-5">
      <h3 className="font-heading text-base font-semibold text-charcoal mb-4">{title}</h3>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {data.map((item) => {
          const heightPct = (item.count / maxCount) * 100;
          const label = item.month?.slice(5) || item.month; // show "01", "02", etc.
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-taupe font-medium">{item.count}</span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: color,
                  minHeight: 4,
                }}
              />
              <span className="text-[10px] text-taupe">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsTab({ adminStats, playgroups }) {
  const usersByMonth = adminStats?.users_by_month || [];
  const playgroupsByMonth = adminStats?.playgroups_by_month || [];
  const topPlaygroups = adminStats?.top_playgroups || [];
  const locationCounts = {};

  playgroups.forEach((pg) => {
    const loc = pg.location_name || "Unknown";
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });

  const sortedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <BarChart
        title="User Growth (Signups per Month)"
        data={usersByMonth}
        color="#5C6B52"
      />

      <BarChart
        title="Playgroup Growth (New per Month)"
        data={playgroupsByMonth}
        color="#B07A5B"
      />

      {/* Top Playgroups */}
      <div className="bg-white rounded-2xl border border-cream-dark p-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-3">
          Top Playgroups by Members
        </h3>
        {topPlaygroups.length === 0 ? (
          <p className="text-taupe text-sm">No data available</p>
        ) : (
          <div className="space-y-2.5">
            {topPlaygroups.slice(0, 5).map((pg, i) => (
              <div key={pg.id || i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-taupe font-medium w-4 shrink-0">
                    {i + 1}.
                  </span>
                  <p className="text-sm text-charcoal truncate">{pg.name}</p>
                </div>
                <span className="text-xs text-sage-dark font-medium shrink-0">
                  {pg.member_count} members
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Geographic Distribution */}
      <div className="bg-white rounded-2xl border border-cream-dark p-5">
        <h3 className="font-heading text-base font-semibold text-charcoal mb-3">
          Geographic Distribution
        </h3>
        {sortedLocations.length === 0 ? (
          <p className="text-taupe text-sm">No location data available</p>
        ) : (
          <div className="space-y-2">
            {sortedLocations.map(([loc, count]) => {
              const maxLoc = sortedLocations[0][1];
              const widthPct = (count / maxLoc) * 100;
              return (
                <div key={loc} className="flex items-center gap-3">
                  <p className="text-xs text-charcoal truncate w-28 shrink-0">{loc}</p>
                  <div className="flex-1 h-4 bg-cream-dark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: "#6B5E54",
                        minWidth: 8,
                      }}
                    />
                  </div>
                  <span className="text-xs text-taupe font-medium w-6 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
