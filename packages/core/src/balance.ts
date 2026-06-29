import { CURRENCIES, type Currency } from "./currency.js";
import { money, type DecimalLike } from "./num.js";

export interface MontoConMoneda {
  currency: Currency;
  amount: DecimalLike;
}

export interface CurrencyBalance {
  currency: Currency;
  recaudado: number; // Σ donaciones financieras verificadas de esta moneda
  invertido: number; // Σ egresos de esta moneda
  disponible: number; // recaudado − invertido
}

/**
 * Balance derivado por moneda. NUNCA mezcla USD con VES.
 *
 * El balance público SIEMPRE se calcula con esta función a partir de
 * transacciones verificadas; jamás se guarda una cifra a mano.
 *
 * @param donacionesVerificadas SOLO donaciones financieras con estado `verified`.
 * @param egresos               Todos los egresos.
 */
export function computeBalances(
  donacionesVerificadas: MontoConMoneda[],
  egresos: MontoConMoneda[],
): CurrencyBalance[] {
  return CURRENCIES.map((currency) => {
    const recaudado = donacionesVerificadas
      .filter((d) => d.currency === currency)
      .reduce((acc, d) => acc + money(d.amount), 0);
    const invertido = egresos
      .filter((e) => e.currency === currency)
      .reduce((acc, e) => acc + money(e.amount), 0);
    return {
      currency,
      recaudado: money(recaudado),
      invertido: money(invertido),
      disponible: money(recaudado - invertido),
    };
  });
}

/** Nivel de stock derivado (debe coincidir con el badge de la UI). */
export type NivelStock = "normal" | "bajo" | "agotado";

export function nivelStock(currentStock: DecimalLike, minThreshold: DecimalLike): NivelStock {
  const stock = money(currentStock);
  const min = money(minThreshold);
  if (stock <= 0) return "agotado";
  if (stock < min) return "bajo";
  return "normal";
}

/** ¿Está urgente un insumo? (derivado, no se escribe a mano). */
export function esUrgente(currentStock: DecimalLike, minThreshold: DecimalLike): boolean {
  return money(currentStock) < money(minThreshold);
}
