// Garmin-style activity ring. Stroke is brand violet, track is pale
// lavender. `pct` is clamped to [0, 1].
export default function EarningsRing({
  size = 200,
  stroke = 14,
  pct = 0,
  centerTop,
  centerBottom,
  centerSubtitle,
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = circumference * clamped;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ECE3FB" strokeWidth={stroke} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#8B3FE0"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {centerTop && (
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontFamily="Fraunces, serif"
          fontSize={Math.round(size * 0.21)}
          fontWeight="500"
          fill="#2F2F2F"
          letterSpacing="-1"
        >
          {centerTop}
        </text>
      )}
      {centerBottom && (
        <text
          x={cx}
          y={cy + Math.round(size * 0.09)}
          textAnchor="middle"
          fontFamily="DM Sans, sans-serif"
          fontSize={Math.round(size * 0.055)}
          fontWeight="500"
          fill="#8B3FE0"
          letterSpacing="1.2"
        >
          {centerBottom}
        </text>
      )}
      {centerSubtitle && (
        <text
          x={cx}
          y={cy + Math.round(size * 0.18)}
          textAnchor="middle"
          fontFamily="DM Sans, sans-serif"
          fontSize={Math.round(size * 0.05)}
          fill="#6B5E54"
        >
          {centerSubtitle}
        </text>
      )}
    </svg>
  );
}
