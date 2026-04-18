export default function VerifiedBadge({ verified }) {
  if (!verified) return null;
  return (
    <span
      role="img"
      aria-label="Verified"
      className="bg-sage-dark w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px]"
    >
      ✓
    </span>
  );
}
