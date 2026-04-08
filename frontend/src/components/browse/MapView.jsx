import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PlaygroupCardMini from "./PlaygroupCardMini";

// Sage green pin marker
function createPinIcon() {
  return L.divIcon({
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#5C6B52"/>
      <circle cx="14" cy="13" r="5.5" fill="white"/>
    </svg>`,
  });
}

// Blue dot for user location
function createUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#4A90D9;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
  });
}

// Component to fit map bounds when data changes
function FitBounds({ playgroups, userLocation }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    const points = playgroups
      .filter((g) => g.latitude && g.longitude)
      .map((g) => [g.latitude, g.longitude]);

    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    } else if (points.length === 1) {
      map.setView(points[0], 13);
      fitted.current = true;
    }
  }, [map, playgroups, userLocation]);

  return null;
}

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco

export default function MapView({ playgroups, onSelectPlaygroup, userLocation }) {
  const pinIcon = useMemo(() => createPinIcon(), []);
  const userIcon = useMemo(() => createUserIcon(), []);

  const geoPlaygroups = playgroups.filter((g) => g.latitude && g.longitude);

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : geoPlaygroups.length > 0
    ? [geoPlaygroups[0].latitude, geoPlaygroups[0].longitude]
    : DEFAULT_CENTER;

  return (
    <div className="rounded-2xl overflow-hidden border border-cream-dark" style={{ height: "calc(100vh - 240px)" }}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds playgroups={geoPlaygroups} userLocation={userLocation} />

        {geoPlaygroups.map((group) => (
          <Marker
            key={group.id}
            position={[group.latitude, group.longitude]}
            icon={pinIcon}
          >
            <Popup closeButton={false} maxWidth={240} minWidth={224}>
              <PlaygroupCardMini
                group={group}
                onClick={() => onSelectPlaygroup(group.id)}
              />
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          />
        )}
      </MapContainer>

      {geoPlaygroups.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream/80 rounded-2xl pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-taupe font-medium">No map pins yet</p>
            <p className="text-xs text-taupe/60 mt-1">
              Playgroups will appear here once hosts add locations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
