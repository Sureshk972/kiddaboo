import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";

export default function MapView({ slots }) {
  const withCoords = slots.filter(s => s.nanny.service_area_lat && s.nanny.service_area_lng);
  const center = withCoords.length
    ? [withCoords[0].nanny.service_area_lat, withCoords[0].nanny.service_area_lng]
    : [40.7, -74];
  return (
    <div className="border border-cream-dark overflow-hidden">
      <MapContainer center={center} zoom={11} style={{ height: "60vh", minHeight: 320, width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {withCoords.map(s => (
          <Marker key={s.id} position={[s.nanny.service_area_lat, s.nanny.service_area_lng]}>
            <Popup>
              <Link to={`/book/${s.id}`} className="text-sage-dark font-medium">
                {s.nanny.full_name} — ${(s.rate_cents/100).toFixed(0)}/hr
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
