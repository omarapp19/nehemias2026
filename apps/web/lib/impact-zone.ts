/**
 * Traza de ejemplo de la zona de mayor impacto (Higuerote–Tucacas), usada
 * como respaldo mientras el admin no haya guardado una traza real.
 */
export const DEFAULT_ZONE_COORDS: [number, number][] = [
  [10.8206, -68.324], // Tucacas
  [10.7419, -68.2415], // Chichiriviche
  [10.4756, -68.0102], // Puerto Cabello
  [10.6017, -66.9308], // La Guaira / Maiquetía
  [10.52, -66.6],
  [10.4806, -66.1004], // Higuerote
];

/** Parsea el valor guardado en SystemSetting `impact_zone_coords`. Null si falta o es inválido. */
export function parseZoneCoords(raw: string | undefined): [number, number][] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const coords = parsed.filter(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number",
    );
    return coords.length > 1 ? coords : null;
  } catch {
    return null;
  }
}
