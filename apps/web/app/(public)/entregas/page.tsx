import type { Metadata } from "next";
import { getEntregas } from "@/lib/api";
import { EntregasExplorer } from "@/components/entregas-explorer";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  const { entregas } = await getEntregas();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-5 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Bitácora</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">Entregas en el terreno</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Cada jornada de ayuda, con sus fotos y el frente al que llegó. La prueba de que la
          ayuda llega a su destino.
        </p>
      </header>

      <EntregasExplorer entregas={entregas} />
    </div>
  );
}
