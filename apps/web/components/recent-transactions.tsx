"use client";

import { useState } from "react";
import { Button } from "@nehemias/ui";
import { TransaccionCard } from "@/components/cards";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";
import type { PublicDonation, PublicExpense } from "@nehemias/core";

export function RecentDonations({ donations, exchangeRate }: { donations: PublicDonation[]; exchangeRate: number }) {
  const [expanded, setExpanded] = useState(false);

  const displayed = expanded ? donations : donations.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3">
        {displayed.map((d) => (
          <TransaccionCard
            key={d.id}
            direccion="ingreso"
            titulo={d.donorDisplay}
            subtitulo={d.type === "in_kind" ? "Donación en especie" : metodoLabel(d.method)}
            amount={d.amount ?? 0}
            currency={d.currency}
            fecha={d.donatedAt}
            exchangeRate={exchangeRate}
          />
        ))}
      </div>
      {donations.length > 3 && (
        <div className="flex justify-center mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Mostrar menos" : "Desplegar más"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function RecentExpenses({ expenses, exchangeRate }: { expenses: PublicExpense[]; exchangeRate: number }) {
  const [expanded, setExpanded] = useState(false);

  const displayed = expanded ? expenses : expenses.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3">
        {displayed.map((e) => (
          <TransaccionCard
            key={e.id}
            direccion="egreso"
            titulo={e.description}
            subtitulo={e.supplier ?? e.category}
            amount={e.amount}
            currency={e.currency}
            fecha={e.spentAt}
            comprobanteUrl={fileUrl(e.invoiceUrl)}
            exchangeRate={exchangeRate}
          />
        ))}
      </div>
      {expenses.length > 3 && (
        <div className="flex justify-center mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Mostrar menos" : "Desplegar más"}
          </Button>
        </div>
      )}
    </div>
  );
}
