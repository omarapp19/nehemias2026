import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";
import { ApiError } from "../http.js";
import { setSessionCookie, SESSION_COOKIE } from "./cookies.js";
import { ABSOLUTE_SESSION_MAX_SECONDS, parseDurationSeconds, signAdminToken, verifyAdminToken } from "./jwt.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Exige una sesión admin válida; refresca el token a mitad de su vida útil.
 *
 * Cuando la sesión llega por cookie (enviada automáticamente por el navegador,
 * incluso en peticiones cross-site) y el método muta estado, exige además que
 * `Origin`/`Referer` coincida con `WEB_ORIGIN` — si no, es un intento de CSRF.
 * Los clientes que se autentican con `Authorization: Bearer` no dependen de
 * que el navegador adjunte credenciales, así que no están expuestos a CSRF.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const token = cookieToken ?? bearer(req);
  const admin = token ? verifyAdminToken(token) : null;
  if (!admin) {
    throw new ApiError(401, "Necesitas iniciar sesión.");
  }
  if (cookieToken && !SAFE_METHODS.has(req.method) && !hasTrustedOrigin(req)) {
    throw new ApiError(403, "Origen no permitido.");
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

function hasTrustedOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (origin) return env.webOrigins.includes(origin);
  const referer = req.headers.referer;
  if (referer) {
    try {
      return env.webOrigins.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
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
