const variants = {
  primary:
    "bg-sage text-white hover:bg-sage-dark active:scale-[0.98] shadow-sm",
  secondary:
    "bg-cream-dark text-taupe-dark border border-cream-dark hover:border-sage-light",
  ghost:
    "bg-transparent text-sage hover:text-sage-dark underline underline-offset-4",
};

const sizes = {
  sm: "text-sm rounded-xl px-4 py-2.5",
  md: "text-base rounded-2xl px-6 py-4",
  lg: "text-lg rounded-2xl px-8 py-4",
};

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  loading = false,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        font-body font-medium
        transition-all duration-150 ease-out cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size] || sizes.md}
        ${fullWidth ? "w-full" : ""}
        ${variants[variant] || variants.primary}
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
