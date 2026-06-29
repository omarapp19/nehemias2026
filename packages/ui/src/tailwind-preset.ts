import type { Config } from "tailwindcss";

/**
 * Preset de Tailwind de Nehemías.
 *
 * Los colores apuntan a variables CSS (definidas desde theme.config.ts vía
 * `themeToCssVars()`), por lo que editar un hex en theme.config.ts re-tematiza
 * toda la app sin tocar este archivo. Usamos canales RGB para soportar opacidad
 * (p. ej. `bg-brand/10`).
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        background: c("--color-background"),
        surface: {
          DEFAULT: c("--color-surface"),
          sunken: c("--color-surface-sunken"),
        },
        ink: {
          DEFAULT: c("--color-ink"),
          muted: c("--color-ink-muted"),
          subtle: c("--color-ink-subtle"),
        },
        brand: {
          DEFAULT: c("--color-brand"),
          strong: c("--color-brand-strong"),
          soft: c("--color-brand-soft"),
          contrast: c("--color-brand-contrast"),
        },
        border: {
          DEFAULT: c("--color-border"),
          strong: c("--color-border-strong"),
        },
        success: {
          DEFAULT: c("--color-success"),
          soft: c("--color-success-soft"),
        },
        warning: {
          DEFAULT: c("--color-warning"),
          soft: c("--color-warning-soft"),
        },
        danger: {
          DEFAULT: c("--color-danger"),
          soft: c("--color-danger-soft"),
        },
        focus: c("--color-focus"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};

export default preset;
