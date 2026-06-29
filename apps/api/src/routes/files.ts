import { Router } from "express";
import { asyncHandler, ApiError } from "../http.js";
import { SESSION_COOKIE } from "../auth/cookies.js";
import { verifyAdminToken } from "../auth/jwt.js";
import {
  isPublicCategory,
  resolveStoredPath,
  fileExists,
} from "../uploads/storage.js";

export const filesRouter = Router();

/**
 * Sirve archivos con control de acceso por CATEGORÍA:
 *  - invoices / deliveries → PÚBLICOS (prueba de auditoría / bitácora).
 *  - proofs (comprobantes de donación) → PRIVADOS: solo con sesión admin.
 */
filesRouter.get(
  "/:category/:filename",
  asyncHandler(async (req, res) => {
    const { category, filename } = req.params;

    if (!isPublicCategory(category)) {
      const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? undefined;
      const admin = token ? verifyAdminToken(token) : null;
      if (!admin) {
        throw new ApiError(403, "Este archivo es privado.");
      }
    }

    const abs = resolveStoredPath(category, filename);
    if (!abs || !(await fileExists(abs))) {
      throw new ApiError(404, "Archivo no encontrado.");
    }

    res.sendFile(abs, {
      headers: {
        "Cache-Control": isPublicCategory(category)
          ? "public, max-age=86400"
          : "private, no-store",
      },
    });
  }),
);
