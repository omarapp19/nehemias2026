"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Stat, buttonClasses, IconClock, IconAlert, IconArrowRight, IconReceipt, IconCamera, IconHeart } from "@nehemias/ui";
import type { CurrencyBalance, PublicSupply } from "@nehemias/core";
import { BalancePanel } from "@/components/balance";
import { apiDonaciones, apiGet, apiSyncSheets } from "@/lib/admin-api";

export default function AdminDashboard() {
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [urgentes, setUrgentes] = useState<PublicSupply[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await apiSyncSheets();
      setSyncMessage({
        type: "success",
        text: `¡Sincronización masiva exitosa! Se importaron ${result.donationsCount} donaciones y ${result.expensesCount} egresos.`,
      });
      // Recargar datos
      apiDonaciones({ status: "pending", limit: 1 })
        .then((r) => setPendientes(r.meta.total))
        .catch(() => {});
      apiGet("/public/balances")
        .then((r) => {
          setBalances(r.balances);
          setExchangeRate(r.exchangeRate);
        })
        .catch(() => {});
      apiGet("/public/necesidades")
        .then((r) => setUrgentes(r.necesidades))
        .catch(() => {});
    } catch (err: any) {
      console.error(err);
      setSyncMessage({
        type: "error",
        text: err?.message || "Ocurrió un error inesperado al intentar sincronizar con Google Sheets.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    apiDonaciones({ status: "pending", limit: 1 })
      .then((r) => setPendientes(r.meta.total))
      .catch(() => setPendientes(0));
    apiGet("/public/balances")
      .then((r) => {
        setBalances(r.balances);
        setExchangeRate(r.exchangeRate);
      })
      .catch(() => {});
    apiGet("/public/necesidades")
      .then((r) => setUrgentes(r.necesidades))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative subtle background shape */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-brand/10 to-transparent pointer-events-none rounded-r-2xl" />
        <span className="text-xs font-bold uppercase tracking-wider text-brand-soft/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          Resumen General
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-extrabold tracking-tight mt-3">
          Panel de Control
        </h1>
        <p className="mt-2 text-sm md:text-base text-emerald-100/70 max-w-xl">
          Supervisa las donaciones entrantes, el inventario de suministros de ayuda humanitaria y la transparencia financiera del proyecto.
        </p>
      </div>

      {/* Sincronización Google Sheets */}
      <Card className="p-6 bg-white border border-border/80 relative overflow-hidden shadow-sm transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-1.5 h-5 bg-emerald-600 rounded-full"></span>
              Sincronización con Google Sheets
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
              Carga masivamente las donaciones y egresos directamente desde tu hoja de cálculo compartida en la nube. Reemplazará los egresos y aportes financieros actuales.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`${buttonClasses(isSyncing ? "secondary" : "primary", "md")} flex items-center gap-2 shadow-sm font-semibold shrink-0`}
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sincronizando...
              </>
            ) : (
              "Sincronizar ahora"
            )}
          </button>
        </div>
        {syncMessage && (
          <div className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300 ${
            syncMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-200/80 text-emerald-900" 
              : "bg-danger-soft/10 border-danger/15 text-danger-strong"
          }`}>
            {syncMessage.type === "success" ? (
              <span className="text-emerald-600">✔</span>
            ) : (
              <span className="text-danger">✖</span>
            )}
            <div>{syncMessage.text}</div>
          </div>
        )}
      </Card>

      {/* Tarjetas de atención */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className={`flex items-center justify-between p-6 border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
          pendientes && pendientes > 0 ? "border-l-warning bg-warning-soft/10 hover:border-l-warning-strong" : "border-l-border bg-white"
        }`}>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-warning border border-warning/15 shadow-sm">
              <IconClock size={22} />
            </span>
            <Stat
              label="Donaciones por verificar"
              value={pendientes ?? "—"}
              tone={pendientes && pendientes > 0 ? "danger" : "ink"}
            />
          </div>
          <Link href="/admin/donaciones" className={buttonClasses("primary", "sm")}>
            Revisar
          </Link>
        </Card>

        <Card className={`flex items-center justify-between p-6 border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
          urgentes.length > 0 ? "border-l-danger bg-danger-soft/10 hover:border-l-danger-strong" : "border-l-border bg-white"
        }`}>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-soft text-danger border border-danger/15 shadow-sm">
              <IconAlert size={22} />
            </span>
            <Stat
              label="Insumos urgentes"
              value={urgentes.length}
              tone={urgentes.length > 0 ? "danger" : "ink"}
            />
          </div>
          <Link href="/admin/inventario" className={buttonClasses("secondary", "sm")}>
            Ver stock
          </Link>
        </Card>
      </div>

      {/* Balance interno */}
      <section className="bg-white rounded-2xl border border-border/80 p-6 md:p-8 shadow-sm">
        <h2 className="mb-6 font-serif text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <span className="w-1.5 h-6 bg-brand rounded-full"></span>
          Resumen Contable (Finanzas)
        </h2>
        <BalancePanel balances={balances} exchangeRate={exchangeRate} />
      </section>

      {/* Acciones rápidas */}
      <section>
        <h2 className="mb-6 font-serif text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <span className="w-1.5 h-6 bg-brand rounded-full"></span>
          Acciones de campo rápidas
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Link
            href="/admin/egresos"
            className="flex flex-col items-start p-6 rounded-2xl border border-border/80 bg-white hover:border-brand/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-4 border border-border/40 shadow-inner">
              <IconReceipt size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors flex items-center gap-1.5">
              Registrar una compra
              <IconArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
            <span className="text-xs text-ink-subtle mt-2 leading-relaxed">Registra gastos con facturas para actualizar el balance de caja.</span>
          </Link>
          
          <Link
            href="/admin/galeria"
            className="flex flex-col items-start p-6 rounded-2xl border border-border/80 bg-white hover:border-brand/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-4 border border-border/40 shadow-inner">
              <IconCamera size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors flex items-center gap-1.5">
              Galería de fotos
              <IconArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
            <span className="text-xs text-ink-subtle mt-2 leading-relaxed">Sube y administra imágenes de las jornadas en la galería pública.</span>
          </Link>

          <Link
            href="/admin/donaciones"
            className="flex flex-col items-start p-6 rounded-2xl border border-border/80 bg-white hover:border-brand/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-4 border border-border/40 shadow-inner">
              <IconHeart size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors flex items-center gap-1.5">
              Registrar una donación
              <IconArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
            <span className="text-xs text-ink-subtle mt-2 leading-relaxed">Declara o ingresa de forma manual un aporte financiero o de insumos en especie.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
