import { prisma } from "@nehemias/db";
import { toPublicPaymentInfo, type PaymentInfoInput } from "@nehemias/core";

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

export function createPaymentInfo(input: PaymentInfoInput) {
  return prisma.paymentInfo.create({
    data: {
      label: input.label,
      details: input.details,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      defaultCurrency: input.defaultCurrency,
    },
  });
}

export function updatePaymentInfo(id: string, input: PaymentInfoInput) {
  return prisma.paymentInfo.update({
    where: { id },
    data: {
      label: input.label,
      details: input.details,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      defaultCurrency: input.defaultCurrency,
    },
  });
}

export function deletePaymentInfo(id: string) {
  return prisma.paymentInfo.delete({ where: { id } });
}
