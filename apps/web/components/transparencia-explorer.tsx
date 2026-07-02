"use client";

import { useMemo, useState } from "react";
import type { PublicDonation, PublicExpense } from "@nehemias/core";
import { TransaccionCard } from "./cards";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";

type Tab = "ingresos" | "egresos";

export function TransparenciaExplorer({
  donaciones,
  egresos,
  exchangeRate,
}: {
  donaciones: PublicDonation[];
  egresos: PublicExpense[];
  exchangeRate: number;
}) {
  const [tab, setTab] = useState<Tab>("ingresos");
  const [categoria, setCategoria] = useState<string>("todas");

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const e of egresos) if (e.category) set.add(e.category);
    return ["todas", ...Array.from(set).sort()];
  }, [egresos]);

  const egresosFiltrados =
    categoria === "todas" ? egresos : egresos.filter((e) => e.category === categoria);

  return (
    <div>
      {/* Pestañas */}
      <div
        className="inline-flex rounded-lg border border-border/70 bg-surface-sunken/40 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        role="tablist"
        aria-label="Tipo de movimiento"
      >
        <button
          role="tab"
          aria-selected={tab === "ingresos"}
          onClick={() => setTab("ingresos")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            tab === "ingresos" ? "bg-background text-brand shadow-sm border border-border/50" : "text-ink-muted hover:text-ink"
          }`}
        >
          Ingresos ({donaciones.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === "egresos"}
          onClick={() => setTab("egresos")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            tab === "egresos" ? "bg-background text-brand shadow-sm border border-border/50" : "text-ink-muted hover:text-ink"
          }`}
        >
          Egresos ({egresos.length})
        </button>
      </div>

      {tab === "egresos" && categorias.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                categoria === c
                  ? "border-brand bg-brand-soft text-brand shadow-sm"
                  : "border-border text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {c === "todas" ? "Todas" : c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {tab === "ingresos" &&
          donaciones.map((d) => (
            <TransaccionCard
              key={d.id}
              direccion="ingreso"
              titulo={d.donorDisplay}
              subtitulo={d.type === "in_kind" ? "Donación en especie" : metodoLabel(d.method)}
              amount={d.amount ?? 0}
              currency={d.currency}
              fecha={d.donatedAt}
              comprobanteUrl={fileUrl(d.proofUrl)}
              comprobanteLabel="Ver soporte"
              exchangeRate={exchangeRate}
            />
          ))}

        {tab === "egresos" &&
          egresosFiltrados.map((e) => (
            <TransaccionCard
              key={e.id}
              direccion="egreso"
              titulo={e.description}
              subtitulo={e.supplier ?? e.category}
              amount={e.amount}
              currency={e.currency}
              fecha={e.spentAt}
              comprobanteUrl={fileUrl(e.invoiceUrl)}
              exchangeRate={e.exchangeRate ?? exchangeRate}
            />
          ))}

        {tab === "ingresos" && donaciones.length === 0 && (
          <p className="text-ink-muted">Aún no hay ingresos verificados.</p>
        )}
        {tab === "egresos" && egresosFiltrados.length === 0 && (
          <p className="text-ink-muted">No hay egresos en esta categoría.</p>
        )}
      </div>
    </div>
  );
}
