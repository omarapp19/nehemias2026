/** Monedas soportadas. Doble balance: USD y VES se contabilizan por separado. */
export const CURRENCIES = ["USD", "VES"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABEL: Record<Currency, string> = {
  USD: "Dólares",
  VES: "Bolívares",
};
