import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { ApiError } from "../http.js";
import { setSessionCookie, SESSION_COOKIE } from "./cookies.js";
import { ABSOLUTE_SESSION_MAX_SECONDS, parseDurationSeconds, signAdminToken, verifyAdminToken } from "./jwt.js";

/** Exige una sesión admin válida; refresca el token a mitad de su vida útil. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? bearer(req);
  const admin = token ? verifyAdminToken(token) : null;
  if (!admin) {
    throw new ApiError(401, "Necesitas iniciar sesión.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - admin.sessionStart > ABSOLUTE_SESSION_MAX_SECONDS) {
    throw new ApiError(401, "Necesitas iniciar sesión.");
  }

  const halfLife = parseDurationSeconds(env.jwtExpiresIn) / 2;
  if (now - admin.iat > halfLife) {
    const refreshed = signAdminToken(
      { sub: admin.sub, role: admin.role, name: admin.name },
      admin.sessionStart,
    );
    setSessionCookie(res, refreshed);
  }

  req.admin = admin;
  next();
}

/** Exige además un rol concreto (p. ej. solo 'admin'). */
export function requireRole(role: "admin" | "coordinator") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.admin) throw new ApiError(401, "Necesitas iniciar sesión.");
    if (req.admin.role !== role && req.admin.role !== "admin") {
      throw new ApiError(403, "No tienes permiso para esta acción.");
    }
    next();
  };
}

function bearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}
