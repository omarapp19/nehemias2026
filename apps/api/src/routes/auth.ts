import { Router } from "express";
import { loginSchema, changePasswordSchema } from "@nehemias/core";
import { prisma } from "@nehemias/db";
import { ApiError, asyncHandler } from "../http.js";
import { verifyPassword } from "../auth/password.js";
import { signAdminToken } from "../auth/jwt.js";
import { setSessionCookie, clearSessionCookie } from "../auth/cookies.js";
import { requireAdmin } from "../auth/middleware.js";
import { changeOwnPassword } from "../services/admins.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    // Mismo mensaje para usuario inexistente o clave mala (no filtra cuáles existen).
    if (!admin || !admin.isActive) {
      throw new ApiError(401, "Correo o contraseña incorrectos.");
    }
    const ok = await verifyPassword(admin.passwordHash, password);
    if (!ok) throw new ApiError(401, "Correo o contraseña incorrectos.");

    const token = signAdminToken({ sub: admin.id, role: admin.role, name: admin.name });
    setSessionCookie(res, token);
    res.json({
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

authRouter.post(
  "/change-password",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changeOwnPassword(req.admin!.sub, currentPassword, newPassword);
    res.json({ ok: true });
  }),
);
