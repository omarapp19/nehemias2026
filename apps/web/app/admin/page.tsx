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
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Panel de Control</h1>
        <p className="mt-1 text-sm text-ink-muted">Esto es lo que requiere tu atención y supervisión hoy.</p>
      </div>

      {/* Tarjetas de atención */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={`flex items-center justify-between p-5 border-l-4 transition-all duration-300 ${
          pendientes && pendientes > 0 ? "border-l-warning bg-warning-soft/20 hover:border-l-warning-strong" : "border-l-border"
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning border border-warning/10">
              <IconClock size={20} />
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

        <Card className={`flex items-center justify-between p-5 border-l-4 transition-all duration-300 ${
          urgentes.length > 0 ? "border-l-danger bg-danger-soft/20 hover:border-l-danger-strong" : "border-l-border"
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger border border-danger/10">
              <IconAlert size={20} />
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
      <section>
        <h2 className="mb-4 font-serif text-lg font-bold tracking-tight text-ink">Resumen Contable (Finanzas)</h2>
        <BalancePanel balances={balances} exchangeRate={exchangeRate} />
      </section>

      {/* Acciones rápidas */}
      <section>
        <h2 className="mb-4 font-serif text-lg font-bold tracking-tight text-ink">Acciones de campo rápidas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/admin/egresos"
            className="flex flex-col items-start p-5 rounded-lg border border-border bg-background hover:border-brand/40 hover:shadow-sm transition-all duration-300 group text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-3">
              <IconReceipt size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors">Registrar una compra</span>
            <span className="text-xs text-ink-subtle mt-1">Registra gastos con facturas para actualizar el balance.</span>
          </Link>
          
          <Link
            href="/admin/entregas"
            className="flex flex-col items-start p-5 rounded-lg border border-border bg-background hover:border-brand/40 hover:shadow-sm transition-all duration-300 group text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-3">
              <IconCamera size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors">Registrar una entrega</span>
            <span className="text-xs text-ink-subtle mt-1">Registra entregas de insumos en los frentes de ayuda.</span>
          </Link>

          <Link
            href="/admin/donaciones"
            className="flex flex-col items-start p-5 rounded-lg border border-border bg-background hover:border-brand/40 hover:shadow-sm transition-all duration-300 group text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors mb-3">
              <IconHeart size={20} />
            </span>
            <span className="font-bold text-sm text-ink group-hover:text-brand transition-colors">Registrar una donación</span>
            <span className="text-xs text-ink-subtle mt-1">Declara o ingresa un aporte financiero o en especie.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
