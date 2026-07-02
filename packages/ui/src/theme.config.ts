/**
 * ──────────────────────────────────────────────────────────────────────────
 *  TEMA — ÚNICA FUENTE DE VERDAD DEL COLOR
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  👉 Para cambiar los colores de TODA la plataforma, edita SOLO los valores
 *     hex de `theme.colors` aquí abajo. No hace falta tocar nada más:
 *     estos hex alimentan a la vez las variables CSS (:root) y Tailwind.
 *
 *  Reglas de uso del color (no negociables para mantener la sobriedad):
 *   - `brand`  = acento institucional único (verde de reconstrucción). Botones
 *               primarios, enlaces, cifras destacadas.
 *   - `warning`/`danger` = SOLO para alertas de stock o donación rechazada.
 *               Nunca como decoración.
 *   - Base blanca, sin modo oscuro.
 */

export const theme = {
  colors: {
    // — Superficies —
    background: "#FFFFFF", // fondo de página (blanco puro)
    surface: "#F9FAFB", // tarjetas y superficies (gris muy suave)
    surfaceSunken: "#F3F4F6", // fondos hundidos / cabeceras de tabla

    // — Texto (tinta muy oscura y corporativa) —
    ink: "#111827", // texto principal (gris 900)
    inkMuted: "#4B5563", // texto secundario (gris 600)
    inkSubtle: "#9CA3AF", // etiquetas, ayudas, placeholders (gris 400)

    // — Marca: negro y gris oscuro minimalista —
    brand: "#111827", // acento institucional principal (negro mate)
    brandStrong: "#000000", // hover / énfasis (negro puro)
    brandSoft: "#F3F4F6", // fondos teñidos (gris suave)
    brandContrast: "#FFFFFF", // texto sobre fondo de marca

    // — Bordes (líneas finas limpias) —
    border: "#E5E7EB", // gris 200
    borderStrong: "#D1D5DB", // gris 300

    // — Estados (reservados, no decorativos) —
    success: "#10B981", // verde 500
    successSoft: "#D1FAE5",
    warning: "#F59E0B", // ámbar 500
    warningSoft: "#FEF3C7",
    danger: "#EF4444", // rojo 500
    dangerSoft: "#FEE2E2",

    // — Foco accesible —
    focus: "#111827",
  },

  /** Tipografía. Las familias se cargan en apps/web vía next/font. */
  fonts: {
    sans: "var(--font-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    serif: "var(--font-serif), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },

  /** Radios sobrios y modernos. */
  radii: {
    xs: "0.25rem", // 4px
    sm: "0.375rem", // 6px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
    full: "9999px",
  },

  /** Sombras suaves y profesionales (tinte de tinta, no gris frío de plantilla). */
  shadows: {
    sm: "0 1px 2px rgba(17, 24, 39, 0.04)",
    md: "0 4px 12px -2px rgba(17, 24, 39, 0.05), 0 2px 4px -1px rgba(17, 24, 39, 0.02)",
    lg: "0 12px 28px -4px rgba(17, 24, 39, 0.06), 0 4px 12px -2px rgba(17, 24, 39, 0.03)",
  },
} as const;

export type Theme = typeof theme;
export type ThemeColorName = keyof Theme["colors"];

