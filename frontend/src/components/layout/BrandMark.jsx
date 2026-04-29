/**
 * 5-box logo + "Kiddaboo" wordmark, used as the top-left brand
 * mark on Browse, Host Dashboard, Host Insights, etc. The mode
 * label ("PARENT" / "ORGANIZER") sits above this in the layout.
 */
export default function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-sage-light flex flex-col items-center justify-center gap-1 p-1.5 w-9 h-9">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5" style={{ background: '#F4C9A8' }} />
          <div className="w-1.5 h-1.5" style={{ background: '#D9A441' }} />
          <div className="w-1.5 h-1.5" style={{ background: '#B07A8B' }} />
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5" style={{ background: '#B7A5E5' }} />
          <div className="w-1.5 h-1.5" style={{ background: '#5C8C7E' }} />
        </div>
      </div>
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ fontFamily: "'Inter', sans-serif", color: '#8B3FE0' }}
      >
        Kiddaboo
      </h1>
    </div>
  );
}
