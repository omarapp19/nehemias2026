import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

// Carga el .env de la raíz del monorepo (por si se ejecuta directamente desde packages/db).
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Sembrando base de datos limpia (todo en 0)...");

  // ── Admin inicial ──
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nehemias.org";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "cambia_esta_clave_admin";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Coordinación Nehemías";
  const passwordHash = await argon2.hash(adminPass, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, isActive: true },
    create: { email: adminEmail, name: adminName, passwordHash, role: "admin" },
  });
  console.log(`👤 Admin: ${adminEmail}`);

  // ── Limpieza completa para dejar todo en 0 ──
  await prisma.stockMovement.deleteMany();
  await prisma.deliveryPhoto.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.inKindItem.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.supply.deleteMany();
  await prisma.frente.deleteMany();
  await prisma.paymentInfo.deleteMany();

  console.log("✅ Base de datos inicializada limpia (todo en 0).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
