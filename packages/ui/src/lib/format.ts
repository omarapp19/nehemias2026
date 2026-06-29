/** Utilidades de formato de cifras y fechas (lado presentación). */

export type Currency = "USD" | "VES";

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  // Dólares: 1,234.56
  USD: new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  // Bolívares: 1.234,56 (separador de miles "." y decimal ",")
  VES: new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

const SYMBOL: Record<Currency, string> = {
  USD: "$",
  VES: "Bs.",
};

/** formatMoney(1234.5, "USD") -> "$ 1,234.50" · formatMoney(1234.5,"VES") -> "Bs. 1.234,50" */
export function formatMoney(amount: number, currency: Currency): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const body = FORMATTERS[currency].format(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  return `${sign}${SYMBOL[currency]} ${body}`;
}

/** Solo el número con separadores de miles (sin símbolo). */
export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat("es-VE", {
    maximumFractionDigits: maxDecimals,
  }).format(Number.isFinite(value) ? value : 0);
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "14 jun 2026" — fecha corta y humana en español. */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
