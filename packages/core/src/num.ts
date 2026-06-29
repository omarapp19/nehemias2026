/**
 * Conversión segura de valores Decimal de Prisma (o número/cadena) a number.
 * Las cifras del MVP son moderadas; redondeamos a 2 decimales para evitar
 * arrastre de coma flotante en sumas de dinero.
 */
export type DecimalLike = { toString(): string } | number | string | null | undefined;

export function num(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Redondeo a 2 decimales para montos de dinero. */
export function money(value: DecimalLike): number {
  return Math.round(num(value) * 100) / 100;
}
