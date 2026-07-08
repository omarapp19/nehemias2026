import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./http.js";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { filesRouter } from "./routes/files.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // detrás de Nginx en el VPS

  app.use(
    helmet({
      // Permite que el sitio web (otro origen) incruste las imágenes servidas aquí.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // Esta API solo sirve JSON y archivos estáticos (/files); nunca HTML ni scripts propios.
      // CSP a medida: bloquea todo por defecto, sin necesidad de listas de origenes externos.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
        },
      },
      // No hay documentos que renderizar en esta API; evita que se abra dentro de un frame.
      frameguard: { action: "deny" },
    }),
  );
  app.use(
    cors({
      origin: env.webOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Salud
  app.get("/health", (_req, res) => res.json({ ok: true, service: "nehemias-api" }));

  // Rutas
  app.use("/auth", authRouter);
  app.use("/public", publicRouter);
  app.use("/admin", adminRouter);
  app.use("/files", filesRouter);

  app.use(errorHandler);
  return app;
}
