import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), "../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Limpiando datos de prueba...\n");

  const dp = await prisma.deliveryPhoto.deleteMany();
  console.log(`  DeliveryPhoto  → ${dp.count} eliminados`);

  const di = await prisma.deliveryItem.deleteMany();
  console.log(`  DeliveryItem   → ${di.count} eliminados`);

  const de = await prisma.delivery.deleteMany();
  console.log(`  Delivery       → ${de.count} eliminados`);

  const fr = await prisma.frente.deleteMany();
  console.log(`  Frente         → ${fr.count} eliminados`);

  const sm = await prisma.stockMovement.deleteMany();
  console.log(`  StockMovement  → ${sm.count} eliminados`);

  const su = await prisma.supply.deleteMany();
  console.log(`  Supply         → ${su.count} eliminados`);

  const ik = await prisma.inKindItem.deleteMany();
  console.log(`  InKindItem     → ${ik.count} eliminados`);

  const don = await prisma.donation.deleteMany();
  console.log(`  Donation       → ${don.count} eliminados`);

  const exp = await prisma.expense.deleteMany();
  console.log(`  Expense        → ${exp.count} eliminados`);

  console.log("\n✅ Listo. AdminUsers y PaymentInfo intactos.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
