export default function Input({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  error = "",
  maxLength,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-taupe">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`
          bg-white border rounded-xl px-4 py-3.5 text-charcoal
          font-body text-base outline-none transition-all duration-150
          placeholder:text-taupe/40
          focus:ring-2 focus:ring-sage-light focus:border-sage
          ${error ? "border-terracotta" : "border-cream-dark"}
        `}
      />
      {error && <p className="text-sm text-terracotta">{error}</p>}
    </div>
  );
}
