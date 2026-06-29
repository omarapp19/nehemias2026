import * as React from "react";
import { cn } from "../lib/cn.js";
import { formatMoney, type Currency } from "../lib/format.js";

/** Cifra monetaria con números tabulares para que alineen verticalmente. */
export function Money({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: Currency;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>{formatMoney(amount, currency)}</span>
  );
}
