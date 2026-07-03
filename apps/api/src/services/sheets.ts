import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env.js";
import { prisma } from "@nehemias/db";
import { Currency, DonationType, DonationStatus } from "@prisma/client";

/**
 * Descarga el contenido de una URL pública de forma asíncrona, siguiendo redirecciones (3xx).
 */
function downloadCSV(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    function get(currentUrl: string) {
      try {
        const parsedUrl = new URL(currentUrl);
        const client = parsedUrl.protocol === "https:" ? https : http;

        const options = {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        };

        client.get(currentUrl, options, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const redirectUrl = new URL(res.headers.location, currentUrl).toString();
            return get(redirectUrl);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Error descargando Google Sheet: HTTP ${res.statusCode}`));
          }

          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve(data);
          });
        }).on("error", (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    }

    get(targetUrl);
  });
}

/**
 * Parsea el CSV considerando comas como delimitadores y celdas entrecomilladas.
 */
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
        i++; // saltar la siguiente comilla
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
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

/**
 * Convierte un string con formato de número (ej. "61.619,51" o "785122.98") a float.
 */
function parseAmount(str: string): number {
  if (!str) return 0;
  let clean = str.replace(/"/g, "").trim();
  
  const lastComma = clean.lastIndexOf(",");
  const lastPeriod = clean.lastIndexOf(".");
  
  if (lastComma > lastPeriod) {
    // Coma es el separador decimal (formato ES/VE: 1.500,00 o 621,52)
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else {
    // Punto es el separador decimal (formato EN: 1,500.00 o 1425)
    clean = clean.replace(/,/g, "");
  }

  const value = parseFloat(clean);
  return isNaN(value) ? 0 : value;
}

/**
 * Parsea la fecha D/M/YY o D/M/YYYY y devuelve un objeto Date a mediodía UTC.
 */
function parseDate(fechaStr: string): Date | null {
  if (!fechaStr) return null;
  const dateParts = fechaStr.trim().split("/");
  if (dateParts.length !== 3) return null;

  const day = parseInt(dateParts[0] || "", 10);
  const month = parseInt(dateParts[1] || "", 10);
  let year = parseInt(dateParts[2] || "", 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  if (year < 100) {
    year += 2000; // 26 -> 2026
  }

  return new Date(year, month - 1, day, 12, 0, 0);
}

function loadLocalDonationsMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    let csvPath = path.resolve(env.uploadsDir, "Libro1.csv");
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(process.cwd(), "../../apps/web/public/Libro1.csv");
    }
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(process.cwd(), "../web/public/Libro1.csv");
    }

    if (fs.existsSync(csvPath)) {
      console.log(`[Sync] Cargando lookup de donaciones desde: ${csvPath}`);
      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(";");
        if (parts.length >= 6) {
          const ref = parts[1]?.replace("#", "").trim();
          const link = parts[5]?.trim();
          if (ref && link && link.startsWith("http")) {
            map.set(ref.toLowerCase(), link);
          }
        }
      }
    } else {
      console.warn("[Sync] No se encontró Libro1.csv local para lookup.");
    }
  } catch (e) {
    console.error("Error cargando Libro1.csv local:", e);
  }
  return map;
}

function loadLocalExpensesMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    let csvPath = path.resolve(env.uploadsDir, "egresos.csv");
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(process.cwd(), "../../apps/web/public/egresos.csv");
    }
    if (!fs.existsSync(csvPath)) {
      csvPath = path.resolve(process.cwd(), "../web/public/egresos.csv");
    }

    if (fs.existsSync(csvPath)) {
      console.log(`[Sync] Cargando lookup de egresos desde: ${csvPath}`);
      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split(";");
        if (parts.length >= 6) {
          const ref = parts[1]?.trim();
          const link = parts[5]?.trim();
          if (ref && link && link.startsWith("http")) {
            map.set(ref.toLowerCase(), link);
          }
        }
      }
    } else {
      console.warn("[Sync] No se encontró egresos.csv local para lookup.");
    }
  } catch (e) {
    console.error("Error cargando egresos.csv local:", e);
  }
  return map;
}

/**
 * Sincroniza las donaciones financieras y egresos de Google Sheets hacia PostgreSQL de manera atómica.
 */
export async function syncGoogleSheets(
  sheetId: string,
  donationsGid: string,
  expensesGid: string
): Promise<{ donationsCount: number; expensesCount: number }> {
  if (!sheetId) throw new Error("ID de Google Sheet no configurado.");

  const cleanSheetId = sheetId.trim();
  const cleanDonationsGid = donationsGid.trim();
  const cleanExpensesGid = expensesGid.trim();

  const donationsUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv&gid=${cleanDonationsGid}`;
  const expensesUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv&gid=${cleanExpensesGid}`;

  console.log(`[Sync] Descargando donaciones desde GID ${cleanDonationsGid}...`);
  const donationsRaw = await downloadCSV(donationsUrl);
  console.log(`[Sync] Descargando egresos desde GID ${cleanExpensesGid}...`);
  const expensesRaw = await downloadCSV(expensesUrl);

  const donationsRows = parseCSV(donationsRaw);
  const expensesRows = parseCSV(expensesRaw);

  const localDonationsMap = loadLocalDonationsMap();
  const localExpensesMap = loadLocalExpensesMap();

  // Mapeo e importación atómica
  return prisma.$transaction(async (tx) => {
    // 1. Limpieza de donaciones financieras y todos los egresos
    await tx.donation.deleteMany({ where: { type: DonationType.financial } });
    await tx.expense.deleteMany();

    let donationsCount = 0;
    let expensesCount = 0;

    // 2. Importar Donaciones
    // La primera fila suele ser título del control (ej: CONTROL DE APORTES), la segunda fila son cabeceras.
    // Buscamos la fila de cabeceras para empezar a importar desde la siguiente.
    let donHeaderIdx = -1;
    for (let i = 0; i < donationsRows.length; i++) {
      const row = donationsRows[i];
      if (row && row.includes("Fecha") && row.includes("Monto Original")) {
        donHeaderIdx = i;
        break;
      }
    }

    if (donHeaderIdx !== -1) {
      const dataRows = donationsRows.slice(donHeaderIdx + 1);
      for (const row of dataRows) {
        if (!row || row.length < 5 || !row[1]?.trim()) continue;

        // Estructura esperada (con columna # índice en 0):
        // 0: #, 1: Fecha, 2: # Referencia, 3: Tipo de Aporte (Zelle, etc), 4: Monto Original, 5: Moneda, 6: Tipo de cambio, 8: Soporte, 9: Estatus
        const fechaStr = row[1]?.trim();
        const refStr = row[2]?.trim();
        const metodoStr = row[3]?.trim();
        const montoStr = row[4]?.trim();
        const monedaStr = row[5]?.trim();
        const tasaStr = row[6]?.trim();
        const soporteStr = row[8]?.trim();

        const donatedAt = parseDate(fechaStr);
        if (!donatedAt) continue;

        const amount = parseAmount(montoStr);
        if (amount <= 0) continue;

        const rate = parseAmount(tasaStr) || 1;
        
        let currency: Currency = Currency.USD;
        let exchangeRate: number | null = null;

        if (monedaStr === "VES" || rate > 1) {
          currency = Currency.VES;
          exchangeRate = rate;
        }

        const referenceNumber = refStr ? refStr.replace("#", "").trim() : null;
        let finalSoporte = soporteStr || null;
        if (finalSoporte === "Ver" || finalSoporte === "ver") {
          const lookupKey = referenceNumber?.toLowerCase();
          if (lookupKey && localDonationsMap.has(lookupKey)) {
            finalSoporte = localDonationsMap.get(lookupKey)!;
          }
        }

        await tx.donation.create({
          data: {
            type: DonationType.financial,
            status: DonationStatus.verified,
            amount,
            currency,
            method: metodoStr || "Otros",
            referenceNumber,
            proofUrl: finalSoporte,
            donorName: "Anónimo",
            isAnonymous: true,
            declaredByPublic: false,
            donatedAt,
            verifiedAt: new Date(),
            exchangeRate,
          },
        });
        donationsCount++;
      }
    }

    // 3. Importar Egresos
    let expHeaderIdx = -1;
    for (let i = 0; i < expensesRows.length; i++) {
      const row = expensesRows[i];
      if (row && row.includes("Fecha") && row.includes("Monto en Bs")) {
        expHeaderIdx = i;
        break;
      }
    }

    if (expHeaderIdx !== -1) {
      const dataRows = expensesRows.slice(expHeaderIdx + 1);
      for (const row of dataRows) {
        if (!row || row.length < 5 || !row[1]?.trim()) continue;

        // Estructura esperada (con columna # índice en 0):
        // 0: #, 1: Fecha, 2: # Factura, 3: Descripcion / Rubro, 4: Monto en Bs, 5: Monto en $, 6: Tasa BCV, 7: Soporte
        const fechaStr = row[1]?.trim();
        const facturaStr = row[2]?.trim();
        const descripcionStr = row[3]?.trim();
        const montoBsStr = row[4]?.trim();
        const montoUsdStr = row[5]?.trim();
        const tasaStr = row[6]?.trim();
        const soporteStr = row[7]?.trim();

        const spentAt = parseDate(fechaStr);
        if (!spentAt) continue;

        const montoBs = parseAmount(montoBsStr);
        const montoUsd = parseAmount(montoUsdStr);
        const rate = parseAmount(tasaStr) || null;

        let amount = 0;
        let currency: Currency = Currency.VES;

        if (montoUsd > 0) {
          amount = montoUsd;
          currency = Currency.USD;
        } else if (montoBs > 0) {
          amount = montoBs;
          currency = Currency.VES;
        } else {
          continue; // No hay monto válido
        }

        let finalSoporte = soporteStr || null;
        if (finalSoporte === "Ver" || finalSoporte === "ver") {
          const lookupKey = facturaStr?.toLowerCase();
          if (lookupKey && localExpensesMap.has(lookupKey)) {
            finalSoporte = localExpensesMap.get(lookupKey)!;
          }
        }

        await tx.expense.create({
          data: {
            description: descripcionStr || "Egreso sin descripción",
            amount,
            currency,
            invoiceNumber: facturaStr || "S/N",
            invoiceUrl: finalSoporte,
            spentAt,
            createsStock: false,
            exchangeRate: currency === Currency.VES ? rate : null,
          },
        });
        expensesCount++;
      }
    }

    return { donationsCount, expensesCount };
  });
}
