export default function RoleBadge({ role }) {
  if (role === "organizer") {
    return (
      <span className="bg-terracotta text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
        Organizer
      </span>
    );
  }
  if (role === "parent") {
    return <span className="text-sage-dark text-[10px] font-medium">Parent</span>;
  }
  return null;
}
