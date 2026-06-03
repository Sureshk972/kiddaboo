import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { formatProfileName } from "../../lib/profileName";

// Center of the contiguous US — only used if geolocation is denied/unavailable
// AND no nanny in the current result set has coordinates.
const US_FALLBACK = [39.5, -98.35];
const US_FALLBACK_ZOOM = 4;
const CITY_ZOOM = 11;

// Leaflet caches the container size on mount. If the container starts
// hidden, undersized, or is revealed via a tab toggle, the initial tile
// math is wrong and tiles render misaligned (the classic "torn map"
// glitch). Invalidate when the center settles and once after mount so
// Leaflet recomputes against the actual rendered size.
function FixContainerSize({ center }) {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, center[0], center[1]]);
  return null;
}

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom, map]);
  return null;
}

export default function MapView({ slots }) {
  const withCoords = slots.filter(
    (s) => s.nanny.service_area_lat && s.nanny.service_area_lng
  );
  const totalNannies = new Set(slots.map((s) => s.nanny.id)).size;
  const pinnedNannies = new Set(withCoords.map((s) => s.nanny.id)).size;
  const [userCenter, setUserCenter] = useState(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60_000 }
    );
  }, []);

  let center;
  let zoom;
  if (withCoords.length) {
    center = [withCoords[0].nanny.service_area_lat, withCoords[0].nanny.service_area_lng];
    zoom = CITY_ZOOM;
  } else if (userCenter) {
    center = userCenter;
    zoom = CITY_ZOOM;
  } else {
    center = US_FALLBACK;
    zoom = US_FALLBACK_ZOOM;
  }

  return (
    <div className="flex flex-col gap-2">
      {totalNannies > 0 && pinnedNannies < totalNannies && (
        <p className="text-xs text-taupe">
          {totalNannies - pinnedNannies} of {totalNannies} nann
          {totalNannies === 1 ? "y hasn't" : "ies haven't"} set a service area
          yet — they won't appear on the map. Switch to <strong>List</strong> to
          see everyone.
        </p>
      )}
      <div className="border border-cream-dark overflow-hidden">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "60vh", minHeight: 320, width: "100%" }}
        >
          <FixContainerSize center={center} />
          <Recenter center={center} zoom={zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {withCoords.map((s) => (
            <Marker
              key={s.id}
              position={[s.nanny.service_area_lat, s.nanny.service_area_lng]}
            >
              <Popup>
                <Link
                  to={`/book/${s.id}`}
                  className="text-sage-dark font-medium"
                >
                  {formatProfileName(s.nanny)} — ${(s.rate_cents / 100).toFixed(0)}/hr
                </Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
