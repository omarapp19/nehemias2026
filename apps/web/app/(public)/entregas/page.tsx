import type { Metadata } from "next";
import { getEntregas } from "@/lib/api";
import { EntregasExplorer } from "@/components/entregas-explorer";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const { entregas } = await getEntregas();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-16 sm:py-24">
      <header className="border-b border-border/50 pb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Bitácora</p>
        <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Entregas en el terreno</h1>
        <p className="mt-4 max-w-prose text-base text-ink-muted leading-relaxed">
          Registro detallado de cada jornada de ayuda en las comunidades, acompañado de comprobantes fotográficos y el frente beneficiado.
        </p>
      </header>

      <EntregasExplorer entregas={entregas} />
    </div>
  );
}
