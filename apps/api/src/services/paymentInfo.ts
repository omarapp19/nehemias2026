import { prisma } from "@nehemias/db";
import { toPublicPaymentInfo, type PaymentInfoInput } from "@nehemias/core";
import { recordAudit } from "../audit/auditLog.js";

export async function listActivePaymentInfo() {
  const rows = await prisma.paymentInfo.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPublicPaymentInfo);
}

export function listAllPaymentInfo() {
  return prisma.paymentInfo.findMany({ orderBy: { sortOrder: "asc" } });
}

export function createPaymentInfo(input: PaymentInfoInput, adminId: string | null) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.paymentInfo.create({
      data: {
        label: input.label,
        details: input.details,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        defaultCurrency: input.defaultCurrency,
      },
    });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "CREATE",
      entityType: "PaymentInfo",
      entityId: created.id,
      payload: null,
    });
    return created;
  });
}

export function updatePaymentInfo(id: string, input: PaymentInfoInput, adminId: string | null) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.paymentInfo.update({
      where: { id },
      data: {
        label: input.label,
        details: input.details,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        defaultCurrency: input.defaultCurrency,
      },
    });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "UPDATE",
      entityType: "PaymentInfo",
      entityId: id,
      payload: null,
    });
    return updated;
  });
}

export function deletePaymentInfo(id: string, adminId: string | null) {
  return prisma.$transaction(async (tx) => {
    await tx.paymentInfo.delete({ where: { id } });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "DELETE",
      entityType: "PaymentInfo",
      entityId: id,
      payload: null,
    });
  });
}
