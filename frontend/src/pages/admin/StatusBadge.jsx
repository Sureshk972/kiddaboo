export default function StatusBadge({ status }) {
  const styles = {
    pending: "bg-terracotta-light text-charcoal",
    member: "bg-sage-light text-charcoal",
    declined: "bg-cream-dark text-taupe-dark",
    waitlisted: "bg-terracotta-light/30 text-charcoal",
    host: "bg-sage text-white",
    reviewed: "bg-sage-light text-sage-dark",
    dismissed: "bg-cream-dark text-taupe",
    suspended: "bg-red-100 text-red-700",
    active: "bg-sage-light text-sage-dark",
    cancelled: "bg-cream-dark text-taupe",
    expired: "bg-red-50 text-red-500",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] || "bg-cream-dark text-taupe"
      }`}
    >
      {status}
    </span>
  );
}
