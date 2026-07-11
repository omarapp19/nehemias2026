"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicHelpPoint } from "@nehemias/core";
import { DEFAULT_ZONE_COORDS } from "@/lib/impact-zone";
import { iconFor } from "@/lib/help-point-icons";

interface ImpactMapProps {
  points: PublicHelpPoint[];
  zoneCoords: [number, number][] | null;
}

export default function ImpactMap({ points, zoneCoords }: ImpactMapProps) {
  const zone = zoneCoords && zoneCoords.length > 1 ? zoneCoords : DEFAULT_ZONE_COORDS;

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer center={[10.55, -67.4]} zoom={9} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={zone} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.75 }} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={iconFor(p.type)}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="text-xs uppercase tracking-wide text-ink-subtle">
                  {p.type === "person" ? "Persona particular" : "Organización"}
                </p>
                <p className="text-ink-muted">{p.description}</p>
                {p.contactPhone && (
                  <p>
                    <a href={`tel:${p.contactPhone}`} className="font-medium text-brand">
                      {p.contactPhone}
                    </a>
                  </p>
                )}
                {p.contactEmail && (
                  <p>
                    <a href={`mailto:${p.contactEmail}`} className="font-medium text-brand">
                      {p.contactEmail}
                    </a>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
