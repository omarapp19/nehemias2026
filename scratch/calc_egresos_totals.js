import fs from "node:fs";
import path from "node:path";

const csvPath = path.resolve(process.cwd(), "apps/web/public/egresos.csv");
const content = fs.readFileSync(csvPath, "utf-8");

function parseCSV(content) {
  const result = [];
  let row = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        cell += '"';
        i++;
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

const allRows = parseCSV(content);
const rows = allRows.slice(1);

let totalVES = 0;
let totalUSD = 0;
let rowCount = 0;

for (let i = 0; i < rows.length; i++) {
  const parts = rows[i];
  if (!parts || parts.length < 4 || (parts.length === 1 && !parts[0].trim())) {
    continue;
  }
  const dateStr = parts[0]?.trim();
  const descStr = parts[2]?.trim();
  const montoStr = parts[3]?.trim();
  const tasaStr = parts[4]?.trim();

  if (!dateStr || !montoStr) continue;

  let rawMonto = montoStr;
  if (rawMonto.includes(",")) {
    rawMonto = rawMonto.replace(/\./g, "").replace(",", ".");
  }
  const amount = parseFloat(rawMonto);

  let rawTasa = tasaStr || "";
  if (rawTasa.includes(",")) {
    rawTasa = rawTasa.replace(/\./g, "").replace(",", ".");
  }
  const tasa = parseFloat(rawTasa);

  totalVES += amount;
  if (tasa > 0) {
    totalUSD += amount / tasa;
  } else {
    // If no individual rate, we would need to check what the rate is.
    console.log(`Row ${i + 2} has no rate! Description: ${descStr}, Amount: ${amount}`);
  }
  rowCount++;
}

console.log(`📊 Egresos CSV Totales:`);
console.log(`- Total registros: ${rowCount}`);
console.log(`- Total VES: ${totalVES}`);
console.log(`- Total USD (usando tasas del CSV): ${totalUSD}`);
