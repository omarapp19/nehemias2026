import type { Metadata } from "next";
import { SectionHeader } from "@nehemias/ui";
import { getBalances, getDonaciones, getEgresos } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { TransparenciaExplorer } from "@/components/transparencia-explorer";

export const metadata: Metadata = { title: "Transparencia" };
export const dynamic = "force-dynamic";

export default async function TransparenciaPage() {
  const [{ balances }, { donaciones }, { egresos }] = await Promise.all([
    getBalances(),
    getDonaciones(),
    getEgresos(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Auditoría</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">Transparencia</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Todo lo que entra y todo lo que sale. Los egresos incluyen su factura. Los datos de
          contacto de los donantes nunca se muestran.
        </p>
      </header>

      <BalancePanel balances={balances} />

      <section>
        <SectionHeader eyebrow="Detalle" title="Ingresos y egresos" />
        <div className="mt-6">
          <TransparenciaExplorer donaciones={donaciones} egresos={egresos} />
        </div>
      </section>
    </div>
  );
}
