import { theme } from "./theme.config.js";

/** Convierte "#14533B" → "20 83 59" (canales RGB para usar con opacidad en Tailwind). */
function hexToRgbChannels(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Nombre de variable CSS para un color del tema: brand → --color-brand */
export function colorVar(name: string): string {
  return `--color-${name.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}`;
}

/**
 * Genera el bloque de variables CSS para inyectar en :root.
 * Es la pieza que hace que editar un hex en theme.config.ts re-tematice todo.
 */
export function themeToCssVars(): string {
  const lines: string[] = [];

  for (const [name, hex] of Object.entries(theme.colors)) {
    lines.push(`  ${colorVar(name)}: ${hexToRgbChannels(hex)};`);
  }
  for (const [name, value] of Object.entries(theme.radii)) {
    lines.push(`  --radius-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(theme.shadows)) {
    lines.push(`  --shadow-${name}: ${value};`);
  }

  return `:root {\n${lines.join("\n")}\n}`;
}
