import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, SectionHeader, IconAlert } from "@nehemias/ui";
import type { PublicSupply } from "@nehemias/core";
import { getInsumos } from "@/lib/api";
import { InsumoCard } from "@/components/cards";

export const metadata: Metadata = { title: "Necesidades" };
export const dynamic = "force-dynamic";

function agruparPorCategoria(insumos: PublicSupply[]) {
  const grupos = new Map<string, PublicSupply[]>();
  for (const s of insumos) {
    const cat = s.category ?? "Otros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat)!.push(s);
  }
  return Array.from(grupos.entries());
}

export default async function NecesidadesPage() {
  const { insumos } = await getInsumos();
  const urgentes = insumos.filter((s) => s.isUrgent);
  const grupos = agruparPorCategoria(insumos);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-5 py-12">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Matriz de prioridades
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">Necesidades</h1>
          <p className="mt-2 max-w-prose text-ink-muted">
            Lo que falta para seguir ayudando. Las urgencias se actualizan solas cuando
            entran compras y donaciones, y salen entregas.
          </p>
        </div>
        <Link href="/donar" className={buttonClasses("primary", "md")}>
          Donar un insumo
        </Link>
      </header>

      {urgentes.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-warning-soft/50 p-6">
          <div className="flex items-center gap-2 text-warning">
            <IconAlert size={20} />
            <h2 className="font-serif text-xl font-semibold">Urgente — por debajo del mínimo</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {urgentes.map((s) => (
              <InsumoCard
                key={s.id}
                name={s.name}
                category={s.category}
                unit={s.unit}
                currentStock={s.currentStock}
                minThreshold={s.minThreshold}
              />
            ))}
          </div>
        </section>
      )}

      {grupos.map(([categoria, items]) => (
        <section key={categoria}>
          <SectionHeader title={categoria} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <InsumoCard
                key={s.id}
                name={s.name}
                category={s.category}
                unit={s.unit}
                currentStock={s.currentStock}
                minThreshold={s.minThreshold}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
