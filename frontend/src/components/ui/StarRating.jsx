export default function StarRating({
  value = 0,
  onChange,
  size = 20,
  readOnly = false,
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`p-0.5 bg-transparent border-none ${
            readOnly ? "cursor-default" : "cursor-pointer"
          }`}
          style={{ minWidth: size + 4, minHeight: size + 4 }}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 14 14"
            fill={star <= value ? "#A3B18A" : "#F0EBE3"}
          >
            <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
