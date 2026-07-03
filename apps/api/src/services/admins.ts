import { prisma } from "@nehemias/db";
import type { CreateAdminInput } from "@nehemias/core";
import { ApiError } from "../http.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

export interface AdminSummary {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator";
  isActive: boolean;
  createdAt: Date;
}

const SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export function listAdmins(): Promise<AdminSummary[]> {
  return prisma.adminUser.findMany({
    select: SUMMARY_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

export async function createAdmin(input: CreateAdminInput): Promise<AdminSummary> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.adminUser.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash,
      },
      select: SUMMARY_SELECT,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new ApiError(400, "Ya existe un administrador con ese correo.");
    }
    throw err;
  }
}

export async function deactivateAdmin(
  targetId: string,
  actingAdminId: string,
): Promise<AdminSummary> {
  if (targetId === actingAdminId) {
    throw new ApiError(400, "No puedes desactivar tu propia cuenta.");
  }
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) throw new ApiError(404, "Administrador no encontrado.");
  if (target.isActive) {
    const activeCount = await prisma.adminUser.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      throw new ApiError(400, "No puedes desactivar al último administrador activo.");
    }
  }
  return prisma.adminUser.update({
    where: { id: targetId },
    data: { isActive: false },
    select: SUMMARY_SELECT,
  });
}

export function reactivateAdmin(targetId: string): Promise<AdminSummary> {
  return prisma.adminUser.update({
    where: { id: targetId },
    data: { isActive: true },
    select: SUMMARY_SELECT,
  });
}

export async function resetAdminPassword(targetId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: targetId }, data: { passwordHash } });
}

export async function changeOwnPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(404, "Administrador no encontrado.");
  const ok = await verifyPassword(admin.passwordHash, currentPassword);
  if (!ok) throw new ApiError(400, "Contraseña actual incorrecta.");
  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}
