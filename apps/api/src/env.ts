import path from "node:path";
import { config } from "dotenv";

// Carga variables: primero el .env de la raíz del monorepo (dev), luego uno local.
// En Docker las variables llegan por el entorno del contenedor y esto no estorba.
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", isProd ? undefined : "dev-secret-no-usar-en-produccion"),
  jwtSecretPrevious: process.env.JWT_SECRET_PREVIOUS || undefined,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "2h",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  get webOrigins(): string[] {
    return this.webOrigin.split(",").map((o) => o.trim());
  },
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "uploads")),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 8),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
};

export type Env = typeof env;
