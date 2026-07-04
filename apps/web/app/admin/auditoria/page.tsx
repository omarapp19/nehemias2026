"use client";

import { useEffect, useState } from "react";
import { Card, formatDate, IconShield, IconArrowRight } from "@nehemias/ui";
import type { PaginationMeta } from "@nehemias/core";
import { apiAuditoria, type AuditLogRow } from "@/lib/admin-api";

const PAGE_SIZE = 20;
const ENTITY_TYPES = ["Donation", "Expense", "Supply", "GalleryPhoto", "PaymentInfo", "SystemSetting"];

export default function AdminAuditoriaPage() {
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>("");
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    apiAuditoria({ page, limit: PAGE_SIZE, entityType: entityType || undefined })
      .then((r) => {
        setItems(r.entradas);
        setMeta(r.meta);
      })
      .catch(() => setItems([]));
  }, [page, entityType]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Trazabilidad</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Auditoría de Acciones</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Quién verificó, editó, eliminó o sincronizó cada registro, y cuándo.
          </p>
        </div>
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Todas las entidades</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <section className="space-y-4">
        <div className="space-y-3">
          {items.map((entry) => (
            <Card key={entry.id} className="p-4 bg-white border border-border/80">
              <div
                className="flex items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconShield size={16} className="text-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {entry.action} · {entry.entityType}
                      {entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ""}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {formatDate(entry.createdAt)} · actor: {entry.actorId ?? "sistema"}
                    </p>
                  </div>
                </div>
              </div>
              {expandedId === entry.id && entry.payload != null && (
                <pre className="mt-3 text-xs bg-surface-sunken rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              )}
            </Card>
          ))}
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
              <h3 className="font-serif text-lg font-bold text-ink">Sin entradas</h3>
              <p className="text-sm text-ink-subtle mt-1">Aún no hay acciones registradas para este filtro.</p>
            </div>
          )}
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-border/50 pt-4">
            <button
              className="text-sm font-semibold text-ink-muted disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <IconArrowRight size={16} className="rotate-180 inline" /> Atrás
            </button>
            <p className="text-sm text-ink-muted">
              Página <span className="font-semibold text-ink">{meta.page}</span> de {meta.totalPages}
            </p>
            <button
              className="text-sm font-semibold text-ink-muted disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              Adelante <IconArrowRight size={16} className="inline" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
