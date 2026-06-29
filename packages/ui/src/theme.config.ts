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
    // — Superficies (la base es blanca; `surface` añade calidez de papel) —
    background: "#FFFFFF", // fondo de página
    surface: "#F7F4EE", // tarjetas y secciones suaves (papel cálido)
    surfaceSunken: "#EEEAE1", // fondos hundidos / cabeceras de tabla

    // — Texto (tinta cálida, no negro frío) —
    ink: "#1B211D", // texto principal
    inkMuted: "#586159", // texto secundario
    inkSubtle: "#8A9189", // etiquetas, ayudas, placeholders

    // — Marca: verde profundo (Nehemías reconstruye) —
    brand: "#14533B", // acento institucional principal
    brandStrong: "#0F4030", // hover / énfasis
    brandSoft: "#E7EFE9", // fondos teñidos de marca
    brandContrast: "#FFFFFF", // texto sobre fondo de marca

    // — Bordes (líneas finas cálidas) —
    border: "#E4DFD4",
    borderStrong: "#D2CBBC",

    // — Estados (reservados, no decorativos) —
    success: "#1E7A4D",
    successSoft: "#E4F0E8",
    warning: "#B45309", // ámbar: stock bajo / pendiente
    warningSoft: "#FBEEDD",
    danger: "#B42318", // rojo: rechazada / agotado
    dangerSoft: "#FBE9E7",

    // — Foco accesible —
    focus: "#14533B",
  },

  /** Tipografía. Las familias se cargan en apps/web vía next/font. */
  fonts: {
    sans: "var(--font-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    serif: "var(--font-serif), ui-serif, Georgia, Cambria, serif",
  },

  /** Radios sobrios (nada de pastilla salvo puntos/avatares). */
  radii: {
    xs: "0.25rem", // 4px
    sm: "0.375rem", // 6px
    md: "0.625rem", // 10px
    lg: "0.875rem", // 14px
    xl: "1.25rem", // 20px
    full: "9999px",
  },

  /** Sombras suaves y cálidas (tinte de tinta, no gris frío de plantilla). */
  shadows: {
    sm: "0 1px 2px rgba(27,33,29,0.05)",
    md: "0 2px 8px -2px rgba(27,33,29,0.08), 0 1px 2px rgba(27,33,29,0.04)",
    lg: "0 14px 36px -12px rgba(27,33,29,0.14)",
  },
} as const;

export type Theme = typeof theme;
export type ThemeColorName = keyof Theme["colors"];
