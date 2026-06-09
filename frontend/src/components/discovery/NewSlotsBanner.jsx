export default function NewSlotsBanner({ count, onTap }) {
  if (!count) return null;
  const label =
    count === 1
      ? "New availability. Tap to update"
      : `${count >= 9 ? "9+" : count} updates. Tap to refresh`;
  return (
    <button
      type="button"
      onClick={onTap}
      className="sticky top-2 z-10 self-center text-xs font-medium bg-terracotta text-white px-4 py-2 shadow-md hover:bg-terracotta-dark"
    >
      {label}
    </button>
  );
}
