import { computeBalances, type CurrencyBalance } from "@nehemias/core";
import { getVerifiedFinancialForBalance } from "./donations.js";
import { getExpensesForBalance } from "./expenses.js";

/**
 * Balance público derivado: SIEMPRE se calcula desde las donaciones
 * financieras verificadas menos los egresos, agrupado por moneda (USD/VES).
 */
export async function getBalances(): Promise<CurrencyBalance[]> {
  const [donaciones, egresos] = await Promise.all([
    getVerifiedFinancialForBalance(),
    getExpensesForBalance(),
  ]);
  return computeBalances(donaciones, egresos);
}
