import type { Config } from "tailwindcss";
import preset from "@nehemias/ui/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // Incluimos los componentes del design system para que sus clases se generen.
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
