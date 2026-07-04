import { prisma } from "@nehemias/db";
import { createApp } from "../src/app.js";

const TABLES = [
  "StockMovement",
  "DeliveryPhoto",
  "DeliveryItem",
  "Delivery",
  "InKindItem",
  "Donation",
  "Expense",
  "Supply",
  "Frente",
  "PaymentInfo",
  "GalleryPhoto",
  "SystemSetting",
  "AdminUser",
] as const;

/** Vacía todas las tablas de la app entre tests, sin recrear el esquema. */
export async function resetDb(): Promise<void> {
  const quoted = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

export function createTestApp() {
  return createApp();
}
