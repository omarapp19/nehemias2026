"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Stat, buttonClasses, IconClock, IconAlert, IconArrowRight } from "@nehemias/ui";
import type { CurrencyBalance, PublicSupply } from "@nehemias/core";
import { BalancePanel } from "@/components/balance";
import { apiDonaciones, apiGet } from "@/lib/admin-api";

export default function AdminDashboard() {
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [urgentes, setUrgentes] = useState<PublicSupply[]>([]);

  useEffect(() => {
    apiDonaciones("pending")
      .then((r) => setPendientes(r.donaciones.length))
      .catch(() => setPendientes(0));
    apiGet("/public/balances")
      .then((r) => setBalances(r.balances))
      .catch(() => {});
    apiGet("/public/necesidades")
      .then((r) => setUrgentes(r.necesidades))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Hola de nuevo</h1>
        <p className="mt-1 text-ink-muted">Esto es lo que necesita tu atención hoy.</p>
      </div>

      {/* Tarjetas de atención */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning">
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

        <Card className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
              <IconAlert size={22} />
            </span>
            <Stat label="Insumos urgentes" value={urgentes.length} />
          </div>
          <Link href="/admin/inventario" className={buttonClasses("secondary", "sm")}>
            Ver stock
          </Link>
        </Card>
      </div>

      {/* Balance interno */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Balance</h2>
        <BalancePanel balances={balances} />
      </section>

      {/* Acciones rápidas */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/egresos" className={buttonClasses("secondary", "md")}>
            Registrar una compra <IconArrowRight size={16} />
          </Link>
          <Link href="/admin/entregas" className={buttonClasses("secondary", "md")}>
            Registrar una entrega <IconArrowRight size={16} />
          </Link>
          <Link href="/admin/donaciones" className={buttonClasses("secondary", "md")}>
            Registrar una donación <IconArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
