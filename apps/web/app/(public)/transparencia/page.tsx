import type { Metadata } from "next";
import { SectionHeader } from "@nehemias/ui";
import { getBalances, getDonaciones, getEgresos } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { TransparenciaExplorer } from "@/components/transparencia-explorer";

export const metadata: Metadata = { title: "Transparencia" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function TransparenciaPage() {
  const [{ balances, exchangeRate }, { donaciones, meta: donacionesMeta }, { egresos, meta: egresosMeta }] =
    await Promise.all([
      getBalances(),
      getDonaciones({ page: 1, limit: PAGE_SIZE }),
      getEgresos({ page: 1, limit: PAGE_SIZE }),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-5 py-16 sm:py-24">
      <header className="border-b border-border/50 pb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Auditoría</p>
        <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Transparencia</h1>
        <p className="mt-4 max-w-prose text-base text-ink-muted leading-relaxed">
          Libro de contabilidad abierto en tiempo real. Cada compra incluye su respectiva factura digital auditada. Los datos privados de donantes se mantienen anónimos.
        </p>
      </header>

      <BalancePanel balances={balances} exchangeRate={exchangeRate} />

      <section>
        <SectionHeader eyebrow="Historial transaccional" title="Ingresos y egresos" />
        <div className="mt-6">
          <TransparenciaExplorer
            donaciones={donaciones}
            donacionesMeta={donacionesMeta}
            egresos={egresos}
            egresosMeta={egresosMeta}
            exchangeRate={exchangeRate}
          />
        </div>
      </section>
    </div>
  );
}
