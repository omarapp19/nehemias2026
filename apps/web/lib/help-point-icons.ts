import L from "leaflet";

/**
 * Iconos de marcador por tipo de punto de ayuda. Este módulo solo se importa
 * desde componentes cargados vía next/dynamic({ ssr: false }), así que nunca
 * se ejecuta en el servidor (Leaflet no soporta SSR).
 */
export const personIcon = L.divIcon({
  className: "help-point-icon",
  html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const organizationIcon = L.divIcon({
  className: "help-point-icon",
  html: `<div style="background:#b45309;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18M6 21V7l6-4 6 4v14M9 9h1M9 13h1M14 9h1M14 13h1"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function iconFor(type: "person" | "organization"): L.DivIcon {
  return type === "person" ? personIcon : organizationIcon;
}
