import { useState } from "react";

export default function PhotoCarousel({ photos = [] }) {
  const [active, setActive] = useState(0);

  if (!photos.length) return null;

  return (
    <div className="relative">
      {/* Photo display */}
      <div className="w-full h-56 rounded-2xl overflow-hidden relative">
        <div
          className="w-full h-full flex items-center justify-center transition-colors duration-300"
          style={{ backgroundColor: photos[active]?.color }}
        >
          <div className="text-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-2 opacity-40"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="white"
                strokeWidth="1.5"
              />
              <circle cx="8.5" cy="8.5" r="1.5" fill="white" opacity="0.5" />
              <path
                d="M3 16L8 11L13 16"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M14 14L17 11L21 15"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-white/60 text-sm font-medium">
              {photos[active]?.label}
            </p>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`
              w-2 h-2 rounded-full transition-all duration-200 cursor-pointer
              ${i === active ? "bg-sage w-5" : "bg-cream-dark"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
