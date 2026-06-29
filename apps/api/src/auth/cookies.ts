import type { Response } from "express";
import { env } from "../env.js";

export const SESSION_COOKIE = "nh_session";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Coloca la cookie de sesión admin (httpOnly, no accesible por JS). */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd, // solo HTTPS en producción
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/",
  });
}
