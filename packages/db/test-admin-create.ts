import { adminCreateDonation } from "../../apps/api/src/services/donations.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("Calling adminCreateDonation...");
  try {
    // We get the first admin user in the database to get a valid adminId
    const admin = await prisma.adminUser.findFirst();
    if (!admin) {
      console.error("No admin user found in database!");
      return;
    }
    console.log("Using admin user:", admin.email, "id:", admin.id);

    const result = await adminCreateDonation(
      {
        type: "financial",
        markVerified: true,
        amount: 10,
        currency: "USD",
        method: "Pago Móvil",
        referenceNumber: "12345",
        exchangeRate: 36.00,
        donorName: "Test",
        isAnonymous: false,
        donorContact: "test@test.com",
        message: "test message",
        donatedAt: new Date("2026-07-01"),
      },
      admin.id
    );
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("CALL ERROR:", err);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
