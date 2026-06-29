import { prisma } from "@nehemias/db";
import { hashPassword } from "./auth/password.js";

/**
 * Crea el administrador inicial si la base no tiene ninguno.
 * Idempotente: en cada arranque solo actúa cuando no hay admins.
 * Así la iglesia puede entrar al panel tras el primer despliegue sin correr el seed.
 */
export async function ensureInitialAdmin(): Promise<void> {
  try {
    const count = await prisma.adminUser.count();
    if (count > 0) return;

    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME ?? "Administrador";

    if (!email || !password) {
      console.warn(
        "[api] No hay administradores y faltan SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD. " +
          "Define esas variables y reinicia para crear el primer acceso.",
      );
      return;
    }

    const passwordHash = await hashPassword(password);
    await prisma.adminUser.create({ data: { email, name, passwordHash, role: "admin" } });
    console.log(`[api] Administrador inicial creado: ${email}`);
  } catch (err) {
    console.error("[api] No se pudo verificar/crear el administrador inicial:", err);
  }
}
