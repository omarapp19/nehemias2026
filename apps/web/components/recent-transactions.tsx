"use client";

import { TransaccionCard } from "@/components/cards";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";
import type { PublicDonation, PublicExpense } from "@nehemias/core";

export function RecentDonations({ donations, exchangeRate }: { donations: PublicDonation[]; exchangeRate: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1.5">
        {donations.map((d) => (
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
      </div>
    </div>
  );
}

export function RecentExpenses({ expenses, exchangeRate }: { expenses: PublicExpense[]; exchangeRate: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1.5">
        {expenses.map((e) => (
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
      </div>
    </div>
  );
}
