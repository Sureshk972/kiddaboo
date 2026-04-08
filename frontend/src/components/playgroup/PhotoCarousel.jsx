import { useState } from "react";

function PlaceholderHero() {
  return (
    <div className="w-full h-56 rounded-2xl overflow-hidden relative bg-gradient-to-br from-sage-light via-cream-dark to-terracotta-light">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.12]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaves" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="8" fill="#5C6B52" />
              <circle cx="45" cy="45" r="6" fill="#5C6B52" />
              <circle cx="45" cy="10" r="4" fill="#5C6B52" />
              <circle cx="10" cy="48" r="5" fill="#5C6B52" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaves)" />
        </svg>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5" />
            <path
              d="M23 21V19C23 17.14 21.73 15.57 20 15.13"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M16 3.13C17.73 3.57 19 5.14 19 7C19 8.86 17.73 10.43 16 10.87"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-white/70 text-sm font-medium tracking-wide">
          Playgroup photos coming soon
        </p>
      </div>
    </div>
  );
}

export default function PhotoCarousel({ photos = [] }) {
  const [active, setActive] = useState(0);

  // Show branded placeholder when no photos
  if (!photos.length) return <PlaceholderHero />;

  // Check if photos have actual image URLs
  const hasRealImages = photos.some((p) => p.url || p.src);

  if (!hasRealImages) {
    return <PlaceholderHero />;
  }

  return (
    <div className="relative">
      {/* Photo display */}
      <div className="w-full h-56 rounded-2xl overflow-hidden relative">
        {photos[active]?.url || photos[active]?.src ? (
          <img
            src={photos[active].url || photos[active].src}
            alt={photos[active].label || "Playgroup photo"}
            className="w-full h-full object-cover"
          />
        ) : (
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
        )}
      </div>

      {/* Dots */}
      {photos.length > 1 && (
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
      )}
    </div>
  );
}
