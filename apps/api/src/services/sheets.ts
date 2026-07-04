import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import ExcelJS from "exceljs";
import { prisma } from "@nehemias/db";
import { Currency, DonationType, DonationStatus } from "@prisma/client";

const APORTES_SHEET = "APORTES";
const FACTURAS_SHEET = "FACTURAS";

/** Prefijos de `externalRef` para distinguir registros importados de Sheets de los nativos. */
const DONATION_REF_PREFIX = "sheets:APORTES:";
const EXPENSE_REF_PREFIX = "sheets:FACTURAS:";

/**
 * Clave fija para el advisory lock de Postgres que serializa las ejecuciones de sync
 * (evita que dos sync concurrentes pisen los mismos registros). Cualquier bigint estable sirve;
 * se deriva de un hash simple del nombre para no colisionar con otros locks del sistema.
 */
const SYNC_LOCK_KEY = 727_402_931;

/**
 * Descarga un archivo binario de forma asíncrona, siguiendo redirecciones (3xx).
 */
function downloadBinary(targetUrl: string): Promise<Buffer> {
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

          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
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
 * Extrae el texto visible de una celda, sin importar si es texto plano, fórmula o rich text
 * (las celdas con hipervínculo en Sheets suelen traer un objeto { richText: [...] }).
 */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof (value as any).text === "string") return (value as any).text.trim();
    if ("richText" in value && Array.isArray((value as any).richText)) {
      return (value as any).richText.map((r: any) => r.text ?? "").join("").trim();
    }
    if ("result" in value) return cellText((value as any).result);
  }
  return "";
}

/** Extrae el valor numérico de una celda (soporta celdas de fórmula ya resueltas por Sheets). */
function cellNumber(value: ExcelJS.CellValue): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "result" in value && typeof (value as any).result === "number") {
    return (value as any).result;
  }
  return 0;
}

/** Extrae una fecha de celda (Sheets exporta fechas como objetos Date reales en XLSX). */
function cellDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0);
  return null;
}

/**
 * Extrae la URL real detrás del hipervínculo de una celda (ej. el link de Drive detrás del texto
 * visible "Ver factura"). A diferencia del CSV, el XLSX sí conserva el hipervínculo real.
 */
function cellHyperlink(cell: ExcelJS.Cell): string | null {
  const direct = (cell as any).hyperlink;
  if (typeof direct === "string") return direct;
  const value = cell.value;
  if (value && typeof value === "object" && "hyperlink" in value && typeof (value as any).hyperlink === "string") {
    return (value as any).hyperlink;
  }
  return null;
}

/** Busca, dentro de las primeras `maxRows`, la fila de cabecera y devuelve el índice de cada columna por nombre. */
function findHeader(
  ws: ExcelJS.Worksheet,
  requiredColumns: string[],
  maxRows = 5,
): { rowIndex: number; columns: Map<string, number> } | null {
  for (let r = 1; r <= maxRows; r++) {
    const row = ws.getRow(r);
    const columns = new Map<string, number>();
    for (let c = 1; c <= row.cellCount; c++) {
      const text = cellText(row.getCell(c).value);
      if (text) columns.set(text, c);
    }
    if (requiredColumns.every((name) => columns.has(name))) {
      return { rowIndex: r, columns };
    }
  }
  return null;
}

/**
 * Sincroniza las donaciones financieras y egresos de Google Sheets hacia PostgreSQL de manera atómica.
 * Se descarga el libro completo como XLSX (en vez de CSV por pestaña) porque XLSX conserva el
 * hipervínculo real detrás del texto visible de cada celda (ej. "Ver factura" → link de Drive),
 * cosa que la exportación a CSV no permite.
 */
export async function syncGoogleSheets(
  sheetId: string,
): Promise<{ donationsCount: number; expensesCount: number }> {
  if (!sheetId) throw new Error("ID de Google Sheet no configurado.");

  const cleanSheetId = sheetId.trim();
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=xlsx`;

  console.log("[Sync] Descargando libro de Google Sheets (XLSX)...");
  const buffer = await downloadBinary(xlsxUrl);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const aportesSheet = workbook.getWorksheet(APORTES_SHEET);
  const facturasSheet = workbook.getWorksheet(FACTURAS_SHEET);

  if (!aportesSheet) throw new Error(`No se encontró la pestaña "${APORTES_SHEET}" en el Sheet.`);
  if (!facturasSheet) throw new Error(`No se encontró la pestaña "${FACTURAS_SHEET}" en el Sheet.`);

  return await prisma.$transaction(
    async (tx) => {
    // Serializa ejecuciones concurrentes de sync (ej. dos clicks del admin, o un cron solapado
    // con un click manual). pg_try_advisory_xact_lock no bloquea y se libera solo al terminar
    // la transacción (commit o rollback), sin riesgo de fugarse a otra conexión del pool.
    const [{ locked }] = await tx.$queryRaw<[{ locked: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${SYNC_LOCK_KEY}) AS locked
    `;
    if (!locked) {
      throw new Error("Ya hay una sincronización con Google Sheets en curso. Intenta de nuevo en unos minutos.");
    }

    let donationsCount = 0;
    let expensesCount = 0;
    const syncedDonationRefs: string[] = [];
    const syncedExpenseRefs: string[] = [];

    // 2. Importar Donaciones (pestaña APORTES)
    const donHeader = findHeader(aportesSheet, ["Fecha", "Monto Original", "# Referencia", "Soporte"]);
    if (donHeader) {
      const { rowIndex, columns } = donHeader;
      const colFecha = columns.get("Fecha")!;
      const colReferencia = columns.get("# Referencia")!;
      const colTipoAporte = columns.get("Tipo de Aporte")!;
      const colMonto = columns.get("Monto Original")!;
      const colMoneda = columns.get("Moneda")!;
      const colTasa = columns.get("Tipo de cambio (BCV)")!;
      const colSoporte = columns.get("Soporte")!;

      for (let r = rowIndex + 1; r <= aportesSheet.rowCount; r++) {
        const row = aportesSheet.getRow(r);
        const refStr = cellText(row.getCell(colReferencia).value);
        if (!refStr) continue;

        const donatedAt = cellDate(row.getCell(colFecha).value);
        if (!donatedAt) continue;

        const amount = cellNumber(row.getCell(colMonto).value);
        if (amount <= 0) continue;

        const rate = cellNumber(row.getCell(colTasa).value) || 1;
        const monedaStr = cellText(row.getCell(colMoneda).value);

        let currency: Currency = Currency.USD;
        let exchangeRate: number | null = null;
        if (monedaStr === "VES" || rate > 1) {
          currency = Currency.VES;
          exchangeRate = rate;
        }

        const referenceNumber = refStr.replace("#", "").trim();
        if (!referenceNumber) continue;
        const finalSoporte = cellHyperlink(row.getCell(colSoporte));
        const externalRef = `${DONATION_REF_PREFIX}row-${r}`;

        const data = {
          type: DonationType.financial,
          status: DonationStatus.verified,
          amount,
          currency,
          method: cellText(row.getCell(colTipoAporte).value) || "Otros",
          referenceNumber,
          proofUrl: finalSoporte,
          donorName: "Anónimo",
          isAnonymous: true,
          declaredByPublic: false,
          donatedAt,
          verifiedAt: new Date(),
          exchangeRate,
        };

        await tx.donation.upsert({
          where: { externalRef },
          create: { ...data, externalRef },
          update: data,
        });
        syncedDonationRefs.push(externalRef);
        donationsCount++;
      }
    } else {
      console.warn(`[Sync] No se encontró la fila de cabecera en "${APORTES_SHEET}".`);
    }

    // 3. Importar Egresos (pestaña FACTURAS)
    const expHeader = findHeader(facturasSheet, ["Fecha", "Monto en Bs", "# Factura", "Soporte"]);
    if (expHeader) {
      const { rowIndex, columns } = expHeader;
      const colFecha = columns.get("Fecha")!;
      const colFactura = columns.get("# Factura")!;
      const colDescripcion = columns.get("Descripcion / Rubro")!;
      const colMontoBs = columns.get("Monto en Bs")!;
      const colMontoUsd = columns.get("Monto en $")!;
      const colTasa = columns.get("Tasa BCV")!;
      const colSoporte = columns.get("Soporte")!;

      for (let r = rowIndex + 1; r <= facturasSheet.rowCount; r++) {
        const row = facturasSheet.getRow(r);
        const facturaStr = cellText(row.getCell(colFactura).value);
        if (!facturaStr) continue;

        const spentAt = cellDate(row.getCell(colFecha).value);
        if (!spentAt) continue;

        const montoBs = cellNumber(row.getCell(colMontoBs).value);
        const montoUsd = cellNumber(row.getCell(colMontoUsd).value);
        const rate = cellNumber(row.getCell(colTasa).value) || null;

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

        const finalSoporte = cellHyperlink(row.getCell(colSoporte));
        const externalRef = `${EXPENSE_REF_PREFIX}row-${r}`;

        const data = {
          description: cellText(row.getCell(colDescripcion).value) || "Egreso sin descripción",
          amount,
          currency,
          invoiceNumber: facturaStr || "S/N",
          invoiceUrl: finalSoporte,
          spentAt,
          createsStock: false,
          exchangeRate: currency === Currency.VES ? rate : null,
        };

        await tx.expense.upsert({
          where: { externalRef },
          create: { ...data, externalRef },
          update: data,
        });
        syncedExpenseRefs.push(externalRef);
        expensesCount++;
      }
    } else {
      console.warn(`[Sync] No se encontró la fila de cabecera en "${FACTURAS_SHEET}".`);
    }

    // 4. Elimina de la base solo lo que fue importado de Sheets y ya no aparece en la hoja
    // (nunca toca donaciones/egresos nativos, que tienen externalRef = null). Si no se pudo leer
    // la cabecera de una pestaña esta corrida, no se borra nada de esa pestaña: un error de
    // parseo no debe leerse como "se borraron todas las filas".
    if (donHeader) {
      await tx.donation.deleteMany({
        where: {
          type: DonationType.financial,
          externalRef: { startsWith: DONATION_REF_PREFIX, notIn: syncedDonationRefs },
        },
      });
    }
    if (expHeader) {
      await tx.expense.deleteMany({
        where: {
          externalRef: { startsWith: EXPENSE_REF_PREFIX, notIn: syncedExpenseRefs },
        },
      });
    }

      return { donationsCount, expensesCount };
    },
    { timeout: 60_000 },
  );
}
