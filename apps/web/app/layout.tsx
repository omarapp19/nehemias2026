import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { themeToCssVars } from "@nehemias/ui/css-vars";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const titleFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Proyecto Nehemías — Transparencia en la ayuda",
    template: "%s · Proyecto Nehemías",
  },
  description:
    "Plataforma de transparencia: mira a dónde va cada aporte para asistir a las comunidades olvidadas tras los terremotos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${titleFont.variable}`}>
      <head>
        {/* Variables de color generadas desde theme.config.ts (única fuente). */}
        <style dangerouslySetInnerHTML={{ __html: themeToCssVars() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
