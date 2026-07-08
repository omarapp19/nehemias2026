import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

config({ path: path.resolve(process.cwd(), "../../.env.test") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@test.local";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "test-admin-password-123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Test Admin";
  const passwordHash = await argon2.hash(adminPass, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, isActive: true },
    create: { email: adminEmail, name: adminName, passwordHash, role: "admin" },
  });
  console.log(`Test admin ready: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
