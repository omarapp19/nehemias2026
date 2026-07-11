"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { iconFor } from "@/lib/help-point-icons";

interface AdminHelpPoint {
  id: string;
  name: string;
  type: "person" | "organization";
  lat: number;
  lng: number;
  isActive: boolean;
}

interface AdminHelpMapProps {
  points: AdminHelpPoint[];
  zoneCoords: [number, number][];
  mode: "puntos" | "traza";
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AdminHelpMap({ points, zoneCoords, mode, onMapClick }: AdminHelpMapProps) {
  return (
    <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer center={[10.55, -67.4]} zoom={9} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        {zoneCoords.length > 1 && (
          <Polyline positions={zoneCoords} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.75 }} />
        )}
        {mode === "puntos" &&
          points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconFor(p.type)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.name}</p>
                  {!p.isActive && <p className="text-xs text-danger">Inactivo</p>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
