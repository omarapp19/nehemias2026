import { getVerifiedFinancialForBalance } from "./donations.js";
import { getExpensesForBalance } from "./expenses.js";
import { getExchangeRate } from "./exchangeRate.js";
import type { CurrencyBalance } from "@nehemias/core";

export interface ConsolidatedBalancesResult {
  exchangeRate: number;
  balances: CurrencyBalance[];
}

/**
 * Balance público consolidado y convertido a la tasa del día:
 * Suma todos los bolívares y dólares en una sola visualización unificada en USD y en VES.
 */
export async function getBalances(): Promise<ConsolidatedBalancesResult> {
  const [donaciones, egresos, exchangeRate] = await Promise.all([
    getVerifiedFinancialForBalance(),
    getExpensesForBalance(),
    getExchangeRate(),
  ]);

  // Calcular USD consolidado (las entradas en VES se convierten a USD dividiendo entre la tasa)
  const usdRecaudado = donaciones.reduce((acc, d) => {
    const val = Number(d.amount ?? 0);
    const rate = d.exchangeRate && Number(d.exchangeRate) > 0 ? Number(d.exchangeRate) : exchangeRate;
    return acc + (d.currency === "USD" ? val : val / rate);
  }, 0);

  const usdInvertido = egresos.reduce((acc, e) => {
    const val = Number(e.amount ?? 0);
    const rate = e.exchangeRate && Number(e.exchangeRate) > 0 ? Number(e.exchangeRate) : exchangeRate;
    return acc + (e.currency === "USD" ? val : val / rate);
  }, 0);

  // Calcular VES consolidado (las entradas en USD se convierten a VES multiplicando por la tasa)
  const vesRecaudado = donaciones.reduce((acc, d) => {
    const val = Number(d.amount ?? 0);
    const rate = d.exchangeRate && Number(d.exchangeRate) > 0 ? Number(d.exchangeRate) : exchangeRate;
    return acc + (d.currency === "VES" ? val : val * rate);
  }, 0);

  const vesInvertido = egresos.reduce((acc, e) => {
    const val = Number(e.amount ?? 0);
    const rate = e.exchangeRate && Number(e.exchangeRate) > 0 ? Number(e.exchangeRate) : exchangeRate;
    return acc + (e.currency === "VES" ? val : val * rate);
  }, 0);

  const round = (num: number) => Math.round(num * 100) / 100;

  const usdBalance: CurrencyBalance = {
    currency: "USD",
    recaudado: round(usdRecaudado),
    invertido: round(usdInvertido),
    disponible: round(usdRecaudado - usdInvertido),
  };

  const vesBalance: CurrencyBalance = {
    currency: "VES",
    recaudado: round(vesRecaudado),
    invertido: round(vesInvertido),
    disponible: round(vesRecaudado - vesInvertido),
  };

  return {
    exchangeRate,
    balances: [usdBalance, vesBalance],
  };
}
