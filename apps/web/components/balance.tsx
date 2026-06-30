"use client";

import { useState } from "react";
import { type CurrencyBalance } from "@nehemias/core";
import { Card, Money, ProgressBar } from "@nehemias/ui";

/** Panel de balance único consolidado (USD / VES unificados). */
export function BalancePanel({
  balances,
  exchangeRate,
}: {
  balances: CurrencyBalance[];
  exchangeRate?: number;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<"USD" | "VES">("USD");

  const activeBalance =
    balances?.find((b) => b.currency === selectedCurrency) ||
    balances?.[0] || {
      currency: selectedCurrency,
      disponible: 0,
      recaudado: 0,
      invertido: 0,
    };

  const pct =
    activeBalance.recaudado > 0
      ? Math.round((activeBalance.invertido / activeBalance.recaudado) * 100)
      : 0;

  return (
    <Card className="p-6 border border-border/80 hover:border-brand/30 bg-gradient-to-br from-background via-background to-brand-soft/10 transition-all duration-300 max-w-2xl mx-auto w-full">
      {/* Cabecera con selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold tracking-tight text-ink">
            Fondo Único Consolidado
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Dólares y bolívares unificados a la tasa oficial
          </p>
        </div>

        {/* Selector de Moneda */}
        <div className="inline-flex rounded-lg border border-border bg-surface p-1 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setSelectedCurrency("USD")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedCurrency === "USD"
                ? "bg-brand text-brand-contrast shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Dólares (USD)
          </button>
          <button
            onClick={() => setSelectedCurrency("VES")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedCurrency === "VES"
                ? "bg-brand text-brand-contrast shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Bolívares (VES)
          </button>
        </div>
      </div>

      {/* Disponible Principal */}
      <div className="mt-6 rounded-xl bg-brand-soft/30 p-5 border border-brand/5 relative overflow-hidden">
        <p className="text-xs font-bold uppercase tracking-wider text-brand/80">
          Disponible para ayuda (Total consolidado)
        </p>
        <p className="mt-1 font-serif text-4xl font-extrabold tracking-tight tabular-nums text-brand sm:text-5xl">
          <Money amount={activeBalance.disponible} currency={selectedCurrency} />
        </p>
        {/* Adorno sutil */}
        <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none select-none text-brand">
          <span className="font-serif text-8xl font-black">{selectedCurrency}</span>
        </div>
      </div>

      {/* Recaudado / Invertido */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Recaudado Total
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">
            <Money amount={activeBalance.recaudado} currency={selectedCurrency} />
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Invertido en Frentes
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">
            <Money amount={activeBalance.invertido} currency={selectedCurrency} />
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-5">
        <ProgressBar
          value={activeBalance.invertido}
          max={Math.max(activeBalance.recaudado, activeBalance.invertido, 1)}
          tone="brand"
          label={`${pct}% de fondos aplicados en las comunidades`}
        />
      </div>

      {/* Tasa del día */}
      {exchangeRate && (
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-medium text-ink-subtle">
          <span>Tasa oficial BCV: 1 USD = {exchangeRate.toFixed(2)} VES</span>
          <span>Actualizado automáticamente</span>
        </div>
      )}
    </Card>
  );
}
