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
    <Card className="p-8 border border-white/60 hover:border-black/10 bg-gradient-to-br from-white/80 via-white/50 to-black/[0.01] transition-all duration-300 max-w-4xl mx-auto w-full shadow-[0_16px_48px_rgba(0,0,0,0.04)]">
      {/* Cabecera con selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-6 border-b border-black/[0.05]">
        <div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-ink">
            Fondo Único Consolidado
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            Dólares y bolívares unificados a la tasa oficial de forma automatizada
          </p>
        </div>

        {/* Selector de Moneda */}
        <div className="inline-flex rounded-lg border border-border bg-white/40 backdrop-blur-sm p-1 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setSelectedCurrency("USD")}
            className={`rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedCurrency === "USD"
                ? "bg-brand text-brand-contrast shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Dólares (USD)
          </button>
          <button
            onClick={() => setSelectedCurrency("VES")}
            className={`rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
              selectedCurrency === "VES"
                ? "bg-brand text-brand-contrast shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Bolívares (VES)
          </button>
        </div>
      </div>

      {/* Grid del Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
        {/* Disponible Principal (Columna Izquierda - Destacada) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 rounded-2xl bg-neutral-900 border border-neutral-800 text-white p-6 shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[200px] transition-transform hover:scale-[1.01] duration-300">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Disponible para ayuda (Total consolidado)
            </p>
            <p className="mt-2.5 font-serif text-5xl font-extrabold tracking-tight tabular-nums text-white sm:text-6xl">
              <Money amount={activeBalance.disponible} currency={selectedCurrency} />
            </p>
            {/* Adorno sutil */}
            <div className="absolute right-6 bottom-4 opacity-[0.02] pointer-events-none select-none text-white">
              <span className="font-serif text-[10rem] font-black leading-none">{selectedCurrency}</span>
            </div>
          </div>
        </div>

        {/* Desglose Secundario (Columna Derecha) */}
        <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
          {/* Recaudado Card */}
          <div className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-black/5 transition-all duration-300 flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Recaudado Total
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink">
              <Money amount={activeBalance.recaudado} currency={selectedCurrency} />
            </p>
          </div>

          {/* Invertido Card */}
          <div className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-black/5 transition-all duration-300 flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Invertido en Frentes
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink">
              <Money amount={activeBalance.invertido} currency={selectedCurrency} />
            </p>
          </div>
        </div>
      </div>

      {/* Barra de progreso e inversión */}
      <div className="mt-8 pt-6 border-t border-black/[0.05]">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">
            Avance de inversión en frentes de reconstrucción
          </span>
          <span className="text-sm font-extrabold text-ink">{pct}%</span>
        </div>
        <ProgressBar
          value={activeBalance.invertido}
          max={Math.max(activeBalance.recaudado, activeBalance.invertido, 1)}
          tone="brand"
        />
      </div>

      {/* Tasa del día */}
      {exchangeRate && (
        <div className="mt-5 pt-4 border-t border-black/[0.03] flex items-center justify-between text-[11px] font-medium text-ink-subtle">
          <span>Tasa oficial BCV: 1 USD = {exchangeRate.toFixed(2)} VES</span>
          <span>Actualizado automáticamente</span>
        </div>
      )}
    </Card>
  );
}
