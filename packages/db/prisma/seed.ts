import path from "node:path";
import fs from "node:fs";
import { config } from "dotenv";
import { PrismaClient, Currency, DonationType, DonationStatus } from "@prisma/client";
import argon2 from "argon2";
import sharp from "sharp";
import crypto from "node:crypto";

// Carga el .env de la raíz del monorepo
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++; // saltar el siguiente quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ';' && !insideQuote) {
      row.push(cell);
      cell = "";
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell);
      result.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (row.length > 0 || cell !== "") {
    row.push(cell);
    result.push(row);
  }

  return result;
}

async function main() {
  console.log("⏳ Sembrando base de datos limpia con configuraciones y datos históricos...");

  // 1. Admin inicial
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nehemias.org";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "cambia_esta_clave_admin";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Coordinación Nehemías";
  const passwordHash = await argon2.hash(adminPass, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, isActive: true },
    create: { email: adminEmail, name: adminName, passwordHash, role: "admin" },
  });
  console.log(`👤 Admin registrado: ${adminEmail}`);

  // 2. Limpieza completa de datos anteriores
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
  await prisma.galleryPhoto.deleteMany();

  // 3. Crear frente de distribución único
  await prisma.frente.create({
    data: {
      name: "Distribución Única",
      type: "comunidad",
      location: "Sede Central",
      description: "Sitio único de distribución",
    },
  });
  console.log("🏢 Frente de distribución único registrado.");

  // 4. Importar Donaciones desde Libro1.csv
  const donationsCsvPath = path.resolve(process.cwd(), "../../apps/web/public/Libro1.csv");
  if (fs.existsSync(donationsCsvPath)) {
    console.log(`📥 Importando donaciones desde ${donationsCsvPath}...`);
    const content = fs.readFileSync(donationsCsvPath, "utf-8");
    const rows = parseCSV(content).slice(1);
    let importedDonations = 0;

    for (let i = 0; i < rows.length; i++) {
      const parts = rows[i];
      if (!parts || parts.length < 5 || (parts.length === 1 && (!parts[0] || !parts[0].trim()))) {
        continue;
      }

      const fechaStr = parts[0]?.trim();
      const refStr = parts[1]?.trim();
      const metodoStr = parts[2]?.trim();
      const montoStr = parts[3]?.trim();
      const tasaStr = parts[4]?.trim();
      const soporteStr = parts[5]?.trim();

      if (!fechaStr || !refStr || !metodoStr || !montoStr || !tasaStr) {
        continue;
      }

      // Parsear fecha (D/M/YYYY o DD/MM/YYYY)
      const dateParts = fechaStr.split("/");
      if (dateParts.length !== 3) continue;
      const day = parseInt(dateParts[0] || "", 10);
      const month = parseInt(dateParts[1] || "", 10);
      const year = parseInt(dateParts[2] || "", 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      const donatedAt = new Date(year, month - 1, day, 12, 0, 0);

      // Parsear monto
      let rawMonto = montoStr;
      if (rawMonto.includes(",")) {
        rawMonto = rawMonto.replace(/\./g, "").replace(",", ".");
      }
      const amount = parseFloat(rawMonto);
      if (isNaN(amount) || amount <= 0) continue;

      // Parsear tasa
      let rawTasa = tasaStr;
      if (rawTasa.includes(",")) {
        rawTasa = rawTasa.replace(/\./g, "").replace(",", ".");
      }
      const rate = parseFloat(rawTasa);
      if (isNaN(rate) || rate <= 0) continue;

      let currency: Currency = Currency.USD;
      let exchangeRate: number | null = null;
      if (rate > 1) {
        currency = Currency.VES;
        exchangeRate = rate;
      }

      const referenceNumber = refStr.replace("#", "").trim();

      await prisma.donation.create({
        data: {
          type: DonationType.financial,
          status: DonationStatus.verified,
          amount,
          currency,
          method: metodoStr,
          referenceNumber,
          proofUrl: soporteStr || null,
          donorName: "Anónimo",
          isAnonymous: true,
          declaredByPublic: false,
          donatedAt,
          verifiedAt: new Date(),
          exchangeRate,
        },
      });
      importedDonations++;
    }
    console.log(`✅ ${importedDonations} donaciones importadas con éxito.`);
  } else {
    console.warn(`⚠️ Archivo de donaciones no encontrado en: ${donationsCsvPath}`);
  }

  // 5. Importar Egresos desde egresos.csv
  const expensesCsvPath = path.resolve(process.cwd(), "../../apps/web/public/egresos.csv");
  if (fs.existsSync(expensesCsvPath)) {
    console.log(`📥 Importando egresos desde ${expensesCsvPath}...`);
    const content = fs.readFileSync(expensesCsvPath, "utf-8");
    const rows = parseCSV(content).slice(1);
    let importedExpenses = 0;

    for (let i = 0; i < rows.length; i++) {
      const parts = rows[i];
      if (!parts || parts.length < 4 || (parts.length === 1 && (!parts[0] || !parts[0].trim()))) {
        continue;
      }

      const fechaStr = parts[0]?.trim();
      const facturaStr = parts[1]?.trim();
      const descripcionStr = parts[2]?.trim();
      const montoStr = parts[3]?.trim();
      const tasaStr = parts[4]?.trim();
      const soporteStr = parts[5]?.trim();

      if (!fechaStr || !facturaStr || !descripcionStr || !montoStr) {
        continue;
      }

      // Parsear fecha
      const dateParts = fechaStr.split("/");
      if (dateParts.length !== 3) continue;
      const day = parseInt(dateParts[0] || "", 10);
      const month = parseInt(dateParts[1] || "", 10);
      const year = parseInt(dateParts[2] || "", 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      const spentAt = new Date(year, month - 1, day, 12, 0, 0);

      // Parsear monto
      let rawMonto = montoStr;
      if (rawMonto.includes(",")) {
        rawMonto = rawMonto.replace(/\./g, "").replace(",", ".");
      }
      const amount = parseFloat(rawMonto);
      if (isNaN(amount) || amount <= 0) continue;

      // Parsear tasa
      let exchangeRate = null;
      if (tasaStr) {
        let rawTasa = tasaStr;
        if (rawTasa.includes(",")) {
          rawTasa = rawTasa.replace(/\./g, "").replace(",", ".");
        }
        const parsedTasa = parseFloat(rawTasa);
        if (!isNaN(parsedTasa) && parsedTasa > 0) {
          exchangeRate = parsedTasa;
        }
      }

      await prisma.expense.create({
        data: {
          description: descripcionStr,
          amount,
          currency: Currency.VES,
          invoiceNumber: facturaStr,
          invoiceUrl: soporteStr || null,
          spentAt,
          createsStock: false,
          exchangeRate,
        },
      });
      importedExpenses++;
    }
    console.log(`✅ ${importedExpenses} egresos importados con éxito.`);
  } else {
    console.warn(`⚠️ Archivo de egresos no encontrado en: ${expensesCsvPath}`);
  }

  // 6. Importar y comprimir Galería de fotos desde public/fotos o public/FOTOS
  let fotosSourceDir = path.resolve(process.cwd(), "../../apps/web/public/fotos");
  if (!fs.existsSync(fotosSourceDir)) {
    fotosSourceDir = path.resolve(process.cwd(), "../../apps/web/public/FOTOS");
  }
  const galleryDestDir = path.resolve(process.cwd(), "../../apps/api/uploads/gallery");

  if (fs.existsSync(fotosSourceDir)) {
    console.log(`📥 Procesando y comprimiendo fotos de la galería desde ${fotosSourceDir}...`);
    if (!fs.existsSync(galleryDestDir)) {
      fs.mkdirSync(galleryDestDir, { recursive: true });
    }

    const files = fs.readdirSync(fotosSourceDir);
    let importedPhotos = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
        continue;
      }

      const filePath = path.join(fotosSourceDir, file);
      const uniqueId = crypto.randomUUID();
      const destFileName = `${uniqueId}.webp`;
      const destFilePath = path.join(galleryDestDir, destFileName);

      const title = file
        .replace(/\.[^/.]+$/, "")
        .replace(/^#/, "")
        .replace(/\s+/g, " ")
        .trim();

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const compressedBuffer = await sharp(fileBuffer)
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 60, effort: 6 })
          .toBuffer();

        fs.writeFileSync(destFilePath, compressedBuffer);

        await prisma.galleryPhoto.create({
          data: {
            id: uniqueId,
            url: `gallery/${destFileName}`,
            title: title || null,
          },
        });
        importedPhotos++;
      } catch (e) {
        console.error(`❌ Error procesando foto ${file}:`, e);
      }
    }
    console.log(`✅ ${importedPhotos} fotos de galería comprimidas e importadas con éxito.`);
  } else {
    console.warn(`⚠️ Directorio de fotos no encontrado en: ${fotosSourceDir}`);
  }

  console.log("🏁 Proceso de siembra finalizado. Base de datos 100% configurada y lista.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el sembrado:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
