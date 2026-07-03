"use client";

import { useEffect, useState } from "react";
import type { PublicDonation, PublicExpense, PaginationMeta } from "@nehemias/core";
import { Button, IconArrowRight } from "@nehemias/ui";
import { TransaccionCard } from "./cards";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";
import { fetchDonacionesPublicas, fetchEgresosPublicos } from "@/lib/public-api";

type Tab = "ingresos" | "egresos";

const PAGE_SIZE = 10;

export function TransparenciaExplorer({
  donaciones,
  donacionesMeta,
  egresos,
  egresosMeta,
  exchangeRate,
}: {
  donaciones: PublicDonation[];
  donacionesMeta: PaginationMeta;
  egresos: PublicExpense[];
  egresosMeta: PaginationMeta;
  exchangeRate: number;
}) {
  const [tab, setTab] = useState<Tab>("ingresos");
  const [categoria, setCategoria] = useState<string>("todas");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [donacionesActuales, setDonacionesActuales] = useState(donaciones);
  const [donacionesMetaActual, setDonacionesMetaActual] = useState(donacionesMeta);
  const [egresosActuales, setEgresosActuales] = useState(egresos);
  const [egresosMetaActual, setEgresosMetaActual] = useState(egresosMeta);

  // Las categorías se descubren progresivamente con cada página de egresos cargada.
  const [categorias, setCategorias] = useState<string[]>(() => {
    const set = new Set<string>();
    for (const e of egresos) if (e.category) set.add(e.category);
    return ["todas", ...Array.from(set).sort()];
  });

  function agregarCategorias(lista: PublicExpense[]) {
    setCategorias((prev) => {
      const set = new Set(prev);
      for (const e of lista) if (e.category) set.add(e.category);
      return Array.from(set).sort((a, b) => (a === "todas" ? -1 : b === "todas" ? 1 : a.localeCompare(b)));
    });
  }

  // Evita refetch en el primer render (ya llegó por props desde el servidor).
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    if (!montado) {
      setMontado(true);
      return;
    }
    let cancelado = false;
    setLoading(true);

    async function cargar() {
      try {
        if (tab === "ingresos") {
          const { donaciones: data, meta } = await fetchDonacionesPublicas({ page, limit: PAGE_SIZE });
          if (cancelado) return;
          setDonacionesActuales(data);
          setDonacionesMetaActual(meta);
        } else {
          const { egresos: data, meta } = await fetchEgresosPublicos({
            page,
            limit: PAGE_SIZE,
            category: categoria === "todas" ? undefined : categoria,
          });
          if (cancelado) return;
          setEgresosActuales(data);
          setEgresosMetaActual(meta);
          agregarCategorias(data);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, categoria, page]);

  function cambiarTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  function cambiarCategoria(c: string) {
    setCategoria(c);
    setPage(1);
  }

  const metaActual = tab === "ingresos" ? donacionesMetaActual : egresosMetaActual;
  const totalPaginas = Math.max(1, metaActual.totalPages);
  const paginaActual = Math.min(page, totalPaginas);

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
          onClick={() => cambiarTab("ingresos")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            tab === "ingresos" ? "bg-background text-brand shadow-sm border border-border/50" : "text-ink-muted hover:text-ink"
          }`}
        >
          Ingresos ({donacionesMetaActual.total})
        </button>
        <button
          role="tab"
          aria-selected={tab === "egresos"}
          onClick={() => cambiarTab("egresos")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            tab === "egresos" ? "bg-background text-brand shadow-sm border border-border/50" : "text-ink-muted hover:text-ink"
          }`}
        >
          Egresos ({egresosMetaActual.total})
        </button>
      </div>

      {tab === "egresos" && categorias.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => cambiarCategoria(c)}
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

      <div className={`mt-6 space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
        {tab === "ingresos" &&
          donacionesActuales.map((d) => (
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
          egresosActuales.map((e) => (
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

        {tab === "ingresos" && donacionesActuales.length === 0 && (
          <p className="text-ink-muted">Aún no hay ingresos verificados.</p>
        )}
        {tab === "egresos" && egresosActuales.length === 0 && (
          <p className="text-ink-muted">No hay egresos en esta categoría.</p>
        )}
      </div>

      {metaActual.total > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3 border-t border-border/50 pt-4">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={paginaActual <= 1 || loading}
          >
            <IconArrowRight size={16} className="rotate-180" />
            Atrás
          </Button>
          <p className="text-sm text-ink-muted">
            Página <span className="font-semibold text-ink">{paginaActual}</span> de {totalPaginas}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual >= totalPaginas || loading}
          >
            Adelante
            <IconArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
