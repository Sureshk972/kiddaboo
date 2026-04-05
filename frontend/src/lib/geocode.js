const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: "json",
      limit: "1",
    });

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) return null;

    const results = await res.json();
    if (results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };
  } catch (err) {
    console.warn("Geocoding failed:", err);
    return null;
  }
}
