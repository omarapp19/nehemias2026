/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
let apiHost = "localhost";
try {
  apiHost = new URL(apiUrl).hostname;
} catch {
  // valor por defecto
}

const nextConfig = {
  output: "standalone", // imagen Docker liviana
  reactStrictMode: true,
  // El lint lo corremos con turbo (eslint flat config propio), no dentro del build.
  eslint: { ignoreDuringBuilds: true },
  // Transpila los paquetes del monorepo (vienen como TypeScript).
  transpilePackages: ["@nehemias/ui", "@nehemias/core"],
  images: {
    // Permite mostrar las imágenes servidas por el API (facturas, fotos de entregas).
    remotePatterns: [
      { protocol: "http", hostname: apiHost },
      { protocol: "https", hostname: apiHost },
    ],
  },
  webpack: (config) => {
    // Los paquetes del monorepo usan imports con ".js" (estilo ESM NodeNext);
    // hacemos que resuelvan a sus fuentes ".ts"/".tsx".
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
