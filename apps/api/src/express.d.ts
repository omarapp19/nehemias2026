import type { AdminTokenPayload } from "./auth/jwt.js";

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export {};
