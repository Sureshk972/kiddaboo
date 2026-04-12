import { useState, useRef, useCallback } from "react";

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
          No photos yet
        </p>
      </div>
    </div>
  );
}

export default function PhotoCarousel({ photos = [] }) {
  const [active, setActive] = useState(0);
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  // Normalize photos: support both plain URL strings and {url/src} objects
  const normalized = photos
    .map((p) => (typeof p === "string" ? { url: p } : p))
    .filter((p) => p.url || p.src);

  // Show branded placeholder when no usable photos
  if (!normalized.length) return <PlaceholderHero />;

  const current = normalized[active] || normalized[0];

  // Minimum swipe distance (px) to trigger navigation
  const minSwipe = 40;

  const handleTouchStart = useCallback((e) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (Math.abs(distance) >= minSwipe) {
      if (distance > 0) {
        // Swiped left → next photo
        setActive((prev) => Math.min(prev + 1, normalized.length - 1));
      } else {
        // Swiped right → previous photo
        setActive((prev) => Math.max(prev - 1, 0));
      }
    }
    touchStart.current = null;
    touchEnd.current = null;
  }, [normalized.length]);

  return (
    <div className="relative">
      {/* Photo display — swipeable */}
      <div
        className="w-full h-56 rounded-2xl overflow-hidden relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={current.url || current.src}
          alt={current.label || "Playgroup photo"}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>

      {/* Dots */}
      {normalized.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {normalized.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              className={`
                h-2 rounded-full transition-all duration-200 cursor-pointer border-none p-0
                ${i === active ? "bg-sage w-5" : "bg-cream-dark w-2"}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}
