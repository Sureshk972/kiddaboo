import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import OnboardingLayout from "../components/layout/OnboardingLayout";
import Button from "../components/ui/Button";
import { useOnboarding } from "../context/OnboardingContext";
import { supabase } from "../lib/supabase";

function createPinIcon() {
  return L.divIcon({
    className: "",
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    html: `<svg width="24" height="30" viewBox="0 0 28 36" fill="none"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="#7A8F6D"/><circle cx="14" cy="13" r="5.5" fill="white"/></svg>`,
  });
}

function MiniMap({ playgroups }) {
  const pinIcon = useMemo(() => createPinIcon(), []);
  const geoPlaygroups = playgroups.filter((g) => g.latitude && g.longitude);

  if (geoPlaygroups.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden h-48 bg-cream-dark border border-cream-dark flex flex-col items-center justify-center gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-taupe/40">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <p className="text-sm text-taupe/50">Playgroups near you</p>
      </div>
    );
  }

  const center = [geoPlaygroups[0].latitude, geoPlaygroups[0].longitude];

  return (
    <div className="rounded-2xl overflow-hidden h-48 border border-cream-dark">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {geoPlaygroups.map((g) => (
          <Marker key={g.id} position={[g.latitude, g.longitude]} icon={pinIcon} />
        ))}
      </MapContainer>
    </div>
  );
}

export default function BrowseSuccess() {
  const navigate = useNavigate();
  const { data } = useOnboarding();
  const [playgroups, setPlaygroups] = useState([]);

  useEffect(() => {
    const fetchPlaygroups = async () => {
      const { data: pgs } = await supabase
        .from("playgroups")
        .select("id, name, location_name, vibe_tags, max_families, latitude, longitude, memberships(role)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (pgs) {
        setPlaygroups(
          pgs.map((pg) => ({
            id: pg.id,
            name: pg.name,
            location: pg.location_name || "Location TBD",
            tags: pg.vibe_tags || [],
            familyCount: (pg.memberships || []).filter(
              (m) => m.role === "member" || m.role === "creator"
            ).length,
            latitude: pg.latitude || null,
            longitude: pg.longitude || null,
          }))
        );
      }
    };
    fetchPlaygroups();
  }, []);

  const confettiColors = ["#A3B18A", "#C08B6E", "#DAE4D0", "#E8C4B0", "#7A8F6D"];

  return (
    <OnboardingLayout currentStep={4} showBack={false}>
      <div className="flex flex-col gap-8 pt-4">
        {/* Success message with confetti */}
        <div className="text-center relative">
          <div className="absolute inset-0 flex justify-center pointer-events-none">
            {confettiColors.map((color, i) => (
              <div
                key={i}
                className="confetti-dot absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: color,
                  left: `${20 + i * 15}%`,
                  top: "20px",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="#7A8F6D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            You're all set{data.firstName ? `, ${data.firstName}` : ""}!
          </h1>
          <p className="text-taupe leading-relaxed">
            Start discovering playgroups curated for your family.
          </p>
        </div>

        {/* Mini map preview */}
        <MiniMap playgroups={playgroups} />

        {/* Playgroup previews */}
        {playgroups.length > 0 && (
          <div>
            <h3 className="text-lg font-heading font-bold text-charcoal mb-3">
              Nearby Playgroups
            </h3>
            <div className="flex flex-col gap-3">
              {playgroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/playgroup/${group.id}`)}
                  className="bg-white rounded-2xl p-4 border border-cream-dark flex items-center gap-4 hover:border-sage-light transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🌱</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-charcoal text-sm">
                      {group.name}
                    </h4>
                    <p className="text-xs text-taupe mt-0.5">
                      {group.location} &middot; {group.familyCount} {group.familyCount === 1 ? "family" : "families"}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      {group.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] bg-sage-light text-sage-dark px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-taupe/40 flex-shrink-0">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button fullWidth onClick={() => navigate("/browse")}>
          Start Browsing
        </Button>
      </div>
    </OnboardingLayout>
  );
}
