export default function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-5 flex flex-col gap-1">
      <span className="text-2xl">{icon}</span>
      <p className="text-3xl font-heading font-semibold text-charcoal">
        {value === null ? (
          <span className="inline-block w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-taupe">{label}</p>
    </div>
  );
}
