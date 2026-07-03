import type { NextFunction, Request, Response } from "express";
import { prisma } from "@nehemias/db";
import { ApiError } from "../http.js";
import { SESSION_COOKIE } from "./cookies.js";
import { verifyAdminToken } from "./jwt.js";

/** Exige una sesión admin válida y activa; si no, responde 401. */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? bearer(req);
    const payload = token ? verifyAdminToken(token) : null;
    if (!payload) {
      throw new ApiError(401, "Necesitas iniciar sesión.");
    }
    // Re-verifica contra la BD en cada request: un JWT puede seguir siendo
    // válido hasta 7 días después de que la cuenta se desactive o se le
    // resetee la contraseña. Mismo mensaje genérico para no filtrar el motivo.
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new ApiError(401, "Necesitas iniciar sesión.");
    }
    req.admin = payload;
    next();
  } catch (err) {
    next(err);
  }
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
