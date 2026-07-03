import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AdminTokenPayload {
  sub: string; // id del admin
  role: "admin" | "coordinator";
  name: string;
}

export interface VerifiedAdminToken extends AdminTokenPayload {
  iat: number;
  sessionStart: number;
}

export const ABSOLUTE_SESSION_MAX_SECONDS = 12 * 60 * 60;

/** Parsea strings tipo "2h", "12h", "7d", "3600s" (o segundos puros) a segundos. */
export function parseDurationSeconds(value: string | number): number {
  if (typeof value === "number") return value;
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Formato de duración inválido: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multiplier: number = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 }[unit as "s" | "m" | "h" | "d"];
  return amount * multiplier;
}

/**
 * Firma un token admin. `sessionStart` se preserva en refresh (mismo valor desde el login
 * original); si no se pasa, arranca una sesión nueva (`now`).
 */
export function signAdminToken(payload: AdminTokenPayload, sessionStart?: number): string {
  const start = sessionStart ?? Math.floor(Date.now() / 1000);
  return jwt.sign({ ...payload, sessionStart: start }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

function decodeWithSecret(token: string, secret: string): VerifiedAdminToken | null {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string") return null;
  const { sub, role, name, iat, sessionStart } = decoded as jwt.JwtPayload &
    Partial<AdminTokenPayload> & { sessionStart?: number };
  if (!sub || !role || !name || !iat || !sessionStart) return null;
  return { sub, role: role as AdminTokenPayload["role"], name, iat, sessionStart };
}

/** Verifica con el secreto actual; si falla y hay `JWT_SECRET_PREVIOUS`, reintenta con ese. */
export function verifyAdminToken(token: string): VerifiedAdminToken | null {
  try {
    return decodeWithSecret(token, env.jwtSecret);
  } catch {
    if (!env.jwtSecretPrevious) return null;
    try {
      return decodeWithSecret(token, env.jwtSecretPrevious);
    } catch {
      return null;
    }
  }
}
