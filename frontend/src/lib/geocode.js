const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;

  try {
    const trimmed = query.trim();
    const isZip = /^\d{5}(-\d{4})?$/.test(trimmed);

    const params = new URLSearchParams({
      format: "json",
      limit: "1",
      countrycodes: "us",
    });

    if (isZip) {
      params.set("postalcode", trimmed);
    } else {
      params.set("q", trimmed);
    }

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
