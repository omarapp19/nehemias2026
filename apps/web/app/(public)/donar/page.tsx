import type { Metadata } from "next";
import { Card, SectionHeader, IconArrowRight } from "@nehemias/ui";
import { getCaptacion } from "@/lib/api";
import { DonarForm } from "@/components/donar-form";

export const metadata: Metadata = { title: "Quiero ayudar" };
export const dynamic = "force-dynamic";

export default async function DonarPage() {
  const { captacion } = await getCaptacion();

  return (
    <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Quiero ayudar</p>
        <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Tu aporte llega a quien más lo necesita
        </h1>
        <p className="mt-4 text-base text-ink-muted leading-relaxed">
          Existen dos formas de canalizar tu ayuda. Elige la que prefieras. Ambas se verán reflejadas en la transparencia pública.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        {/* ── Camino A: datos de captación ── */}
        <section>
          <SectionHeader
            eyebrow="Opción 1 — Transferir directo"
            title="Medios de recaudación"
            description="Utiliza cualquiera de los siguientes datos oficiales. Registraremos tu aporte automáticamente."
          />
          <div className="mt-6 space-y-4">
            {captacion.map((p) => (
              <Card key={p.id} className="p-5 border border-border/80 hover:border-brand/20 transition-all duration-300">
                <p className="text-xs font-bold uppercase tracking-widest text-brand">
                  {p.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink leading-relaxed font-sans">{p.details}</p>
              </Card>
            ))}
            {captacion.length === 0 && (
              <p className="text-ink-muted text-sm italic">Pronto publicaremos los datos de donación.</p>
            )}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-lg bg-brand-soft/40 border border-brand/10 p-4 text-sm text-ink-muted leading-relaxed">
            <IconArrowRight size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>
              <strong>¿Deseas donar insumos físicos (como medicinas o alimentos)?</strong> Por favor contáctanos por estos medios para coordinar la logística.
            </span>
          </div>
        </section>

        {/* ── Camino B: declarar donación ── */}
        <section>
          <SectionHeader
            eyebrow="Opción 2 — Declarar aporte"
            title="Notificar una donación"
            description="Si ya realizaste una transferencia y deseas registrarla a tu nombre, notifícala aquí. La confirmaremos a la brevedad."
          />
          <div className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-all duration-300 sm:p-8">
            <DonarForm />
          </div>
        </section>
      </div>
    </div>
  );
}
