"use client";

import { useState } from "react";
import { Button, IconArrowRight } from "@nehemias/ui";
import { TransaccionCard } from "@/components/cards";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";
import type { PublicDonation, PublicExpense } from "@nehemias/core";

const PAGE_SIZE = 5;

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-auto flex items-center justify-center gap-3 border-t border-border/50 pt-4">
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        <IconArrowRight size={16} className="rotate-180" />
        Atrás
      </Button>
      <p className="text-sm text-ink-muted">
        Página <span className="font-semibold text-ink">{page}</span> de {totalPages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        Adelante
        <IconArrowRight size={16} />
      </Button>
    </div>
  );
}

export function RecentDonations({ donations, exchangeRate }: { donations: PublicDonation[]; exchangeRate: number }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE));
  const paginadas = donations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex-1 space-y-3">
        {paginadas.map((d) => (
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
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export function RecentExpenses({ expenses, exchangeRate }: { expenses: PublicExpense[]; exchangeRate: number }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const paginadas = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex-1 space-y-3">
        {paginadas.map((e) => (
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
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
