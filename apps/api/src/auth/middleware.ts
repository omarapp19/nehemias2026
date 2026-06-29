import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../http.js";
import { SESSION_COOKIE } from "./cookies.js";
import { verifyAdminToken } from "./jwt.js";

/** Exige una sesión admin válida; si no, responde 401. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? bearer(req);
  const admin = token ? verifyAdminToken(token) : null;
  if (!admin) {
    throw new ApiError(401, "Necesitas iniciar sesión.");
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
