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
    <div className="mx-auto max-w-6xl space-y-16 px-5 py-16 sm:py-24">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border/50 pb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            Matriz de prioridades
          </p>
          <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Necesidades</h1>
          <p className="mt-4 max-w-prose text-base text-ink-muted leading-relaxed">
            Catálogo de insumos requeridos en terreno. Las urgencias se calculan automáticamente cuando se registran compras, donaciones o entregas.
          </p>
        </div>
        <Link href="/donar" className={buttonClasses("primary", "md", "shadow-sm shrink-0")}>
          Donar un insumo
        </Link>
      </header>

      {urgentes.length > 0 && (
        <section className="rounded-xl border border-warning/20 bg-warning-soft/30 p-6 shadow-[0_4px_12px_-2px_rgba(180,83,9,0.04)]">
          <div className="flex items-center gap-2 text-warning">
            <IconAlert size={20} className="stroke-[2.5]" />
            <h2 className="font-serif text-xl font-bold tracking-tight">Atención urgente — stock crítico</h2>
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
