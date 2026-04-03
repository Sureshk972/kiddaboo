import { useState } from "react";

export default function TagSelector({
  label,
  options,
  selected = [],
  onChange,
  maxSelections,
}) {
  const [shakeTag, setShakeTag] = useState(null);

  const toggle = (tag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      if (maxSelections && selected.length >= maxSelections) {
        setShakeTag(tag);
        setTimeout(() => setShakeTag(null), 300);
        return;
      }
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-taupe">
          {label}
          {maxSelections && (
            <span className="text-taupe/50 font-normal ml-1">
              (pick up to {maxSelections})
            </span>
          )}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const isSelected = selected.includes(tag);
          const isShaking = shakeTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-all duration-150 cursor-pointer
                ${isShaking ? "shake" : ""}
                ${
                  isSelected
                    ? "bg-sage-light text-sage-dark border border-sage"
                    : "bg-cream-dark text-taupe border border-transparent hover:border-sage-light"
                }
              `}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
