"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Stat, buttonClasses, IconClock, IconAlert, IconArrowRight, IconReceipt, IconCamera, IconHeart } from "@nehemias/ui";
import type { CurrencyBalance, PublicSupply } from "@nehemias/core";
import { BalancePanel } from "@/components/balance";
import { apiDonaciones, apiGet } from "@/lib/admin-api";

export default function AdminDashboard() {
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [urgentes, setUrgentes] = useState<PublicSupply[]>([]);

  useEffect(() => {
    apiDonaciones("pending")
      .then((r) => setPendientes(r.donaciones.length))
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
            href="/admin/entregas"
            className="flex flex-col items-start p-6 rounded-2xl border border-border/80 bg-white hover:border-brand/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group text-left relative overflow-hidden"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-4 border border-border/40 shadow-inner">
              <IconCamera size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors flex items-center gap-1.5">
              Registrar una entrega
              <IconArrowRight size={14} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
            <span className="text-xs text-ink-subtle mt-2 leading-relaxed">Registra entregas de insumos con evidencia fotográfica en los frentes de ayuda.</span>
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
