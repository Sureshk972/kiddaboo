const variants = {
  primary:
    "bg-sage text-white hover:bg-sage-dark active:scale-[0.98] shadow-sm",
  secondary:
    "bg-cream-dark text-taupe-dark border border-cream-dark hover:border-sage-light",
  ghost:
    "bg-transparent text-sage hover:text-sage-dark underline underline-offset-4",
};

export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-body font-medium text-base rounded-2xl px-6 py-4
        transition-all duration-150 ease-out cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${variants[variant] || variants.primary}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
