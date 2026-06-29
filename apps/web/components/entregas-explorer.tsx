"use client";

import { useMemo, useState } from "react";
import type { PublicDelivery } from "@nehemias/core";
import { DeliveryGallery } from "./delivery-gallery";

export function EntregasExplorer({ entregas }: { entregas: PublicDelivery[] }) {
  const [frenteId, setFrenteId] = useState<string>("todos");

  const frentes = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entregas) map.set(e.frente.id, e.frente.name);
    return Array.from(map.entries());
  }, [entregas]);

  const filtradas =
    frenteId === "todos" ? entregas : entregas.filter((e) => e.frente.id === frenteId);

  return (
    <div>
      {frentes.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFrenteId("todos")}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              frenteId === "todos"
                ? "border-brand bg-brand-soft font-medium text-brand-strong"
                : "border-border text-ink-muted hover:bg-surface"
            }`}
          >
            Todos los frentes
          </button>
          {frentes.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setFrenteId(id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                frenteId === id
                  ? "border-brand bg-brand-soft font-medium text-brand-strong"
                  : "border-border text-ink-muted hover:bg-surface"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <DeliveryGallery entregas={filtradas} />
    </div>
  );
}
