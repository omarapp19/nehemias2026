import type { Metadata } from "next";
import { Card, SectionHeader, IconArrowRight } from "@nehemias/ui";
import { getCaptacion } from "@/lib/api";
import { DonarForm } from "@/components/donar-form";

export const metadata: Metadata = { title: "Quiero ayudar" };
export const dynamic = "force-dynamic";

export default async function DonarPage() {
  const { captacion } = await getCaptacion();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Quiero ayudar</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">
          Tu aporte llega a quien más lo necesita
        </h1>
        <p className="mt-2 text-ink-muted">
          Dos formas de ayudar. Elige la que prefieras: ambas terminan en la transparencia
          pública, con comprobantes.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* ── Camino A: datos de captación ── */}
        <section>
          <SectionHeader
            eyebrow="Opción 1 — La más simple"
            title="Dona por estos medios"
            description="Usa cualquiera de estos datos. Nosotros registramos tu ingreso al verlo en la cuenta, para que el balance cuadre."
          />
          <div className="mt-6 space-y-3">
            {captacion.map((p) => (
              <Card key={p.id} className="p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                  {p.label}
                </p>
                <p className="mt-1 text-ink">{p.details}</p>
              </Card>
            ))}
            {captacion.length === 0 && (
              <p className="text-ink-muted">Pronto publicaremos los datos de donación.</p>
            )}
          </div>
          <div className="mt-6 flex items-start gap-2 rounded-lg bg-surface p-4 text-sm text-ink-muted">
            <IconArrowRight size={18} className="mt-0.5 shrink-0 text-brand" />
            <span>
              ¿Quieres donar insumos (medicinas, alimentos)? Escríbenos por estos mismos
              contactos y coordinamos la entrega.
            </span>
          </div>
        </section>

        {/* ── Camino B: declarar donación ── */}
        <section>
          <SectionHeader
            eyebrow="Opción 2 — Déjala registrada"
            title="Declarar mi donación"
            description="Si ya donaste y quieres que quede registrada a tu nombre, cuéntanos aquí. Entra como pendiente y la verificamos."
          />
          <div className="mt-6 rounded-xl border border-border bg-background p-5 shadow-sm sm:p-6">
            <DonarForm />
          </div>
        </section>
      </div>
    </div>
  );
}
