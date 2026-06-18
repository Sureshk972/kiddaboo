export default function StatCard({ label, value, hint }) {
  return (
    <div className="border border-cream-dark rounded-md bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-taupe-dark">{label}</div>
      <div className="font-heading font-bold text-charcoal text-2xl mt-1">{value}</div>
      {hint && <div className="text-xs text-taupe-dark mt-1">{hint}</div>}
    </div>
  );
}
