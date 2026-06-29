import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AdminTokenPayload {
  sub: string; // id del admin
  role: "admin" | "coordinator";
  name: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string") return null;
    const { sub, role, name } = decoded as jwt.JwtPayload & Partial<AdminTokenPayload>;
    if (!sub || !role || !name) return null;
    return { sub, role: role as AdminTokenPayload["role"], name };
  } catch {
    return null;
  }
}
