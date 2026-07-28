// 8 weekly bars rendered as SVG. Bar height encodes earnings; color
// ramps from pale warm tint (oldest) to terracotta (this week) so the
// trend reads even before the eye lands on the numbers.
const PALETTE = ["#F0DDD0", "#F0DDD0", "#E4C0AA", "#E4C0AA", "#D69E7F", "#CB8058", "#CB8058", "#C2673C"];

export default function EarningsTrendBars({ weeks }) {
  const maxCents = Math.max(...weeks.map((w) => w.earningsCents), 1);
  const barW = 26;
  const gap = 8;
  const totalW = weeks.length * barW + (weeks.length - 1) * gap;
  const h = 80;

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${totalW} ${h}`} preserveAspectRatio="none">
        {weeks.map((w, i) => {
          const barH = Math.max(6, (w.earningsCents / maxCents) * (h - 4));
          const x = i * (barW + gap);
          const y = h - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              fill={PALETTE[PALETTE.length - weeks.length + i] || PALETTE[i] || "#F0DDD0"}
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-1.5 text-[9px] text-taupe px-1">
        {weeks.map((w, i) => (
          <span key={i}>{w.label}</span>
        ))}
      </div>
    </div>
  );
}
