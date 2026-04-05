import { useState, useCallback } from "react";

const CACHE_KEY = "kiddaboo_user_location";

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setLoading(false);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(loc));
        } catch {}
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Enable it in your browser settings."
            : "Unable to get your location. Please try again."
        );
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { userLocation, loading, error, requestLocation };
}
