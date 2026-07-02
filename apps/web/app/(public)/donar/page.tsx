import type { Metadata } from "next";
import { Card, SectionHeader } from "@nehemias/ui";
import { getCaptacion, getSettings } from "@/lib/api";
import { DonarForm } from "@/components/donar-form";
import { PaymentMethodCard } from "@/components/payment-method-card";

export const metadata: Metadata = { title: "Quiero ayudar" };
export const dynamic = "force-dynamic";

export default async function DonarPage() {
  const { captacion } = await getCaptacion();
  const { settings } = await getSettings();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Quiero ayudar</p>
        <h1 className="mt-2 font-serif text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Tu aporte llega a quien más lo necesita
        </h1>
        <p className="mt-4 text-base text-ink-muted leading-relaxed">
          Puedes transferir directamente utilizando cualquiera de los medios de recaudación oficiales y luego reportar tu donación para asegurar que se registre en el portal de transparencia.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 items-start">
        {/* ── Camino A: datos de captación ── */}
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Opción 1 — Transferir directo"
            title="Medios de recaudación"
            description="Utiliza cualquiera de los siguientes datos oficiales de recaudación. Registraremos tu aporte automáticamente."
          />
          <div className="space-y-4">
            {captacion.map((p) => (
              <PaymentMethodCard key={p.id} method={p} />
            ))}
            {captacion.length === 0 && (
              <p className="text-ink-muted text-sm italic py-4">Pronto publicaremos los datos de donación.</p>
            )}
          </div>
        </section>


        {/* ── Camino B: declarar donación ── */}
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Opción 2 — Declarar aporte"
            title="Notificar una donación"
            description="Si ya realizaste tu transferencia monetaria, notifícala aquí. La validaremos y publicaremos a la brevedad."
          />
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-all duration-300 sm:p-8">
            <DonarForm />
          </div>
        </section>
      </div>

      {/* ── Sección de Contacto ── */}
      <section className="mt-20 border-t border-border pt-16">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Contacto & Coordinación</p>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            ¿Tienes alguna duda o deseas coordinar otra ayuda?
          </h2>
          <p className="mx-auto max-w-2xl text-base text-ink-muted leading-relaxed">
            Si deseas donar insumos físicos (alimentos, ropa, medicinas), ser voluntario en las próximas jornadas de distribución, o tienes alguna consulta sobre los informes de transparencia, contáctanos directamente.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3 text-left">
            <Card className="p-6 border border-border/80 bg-white hover:border-brand/35 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-brand tracking-wider">WhatsApp / Teléfono</span>
                <p className="mt-3 text-base font-bold text-ink font-mono">{settings.contact_phone}</p>
              </div>
              <p className="mt-2 text-xs text-ink-subtle">Atención y coordinación directa de entregas</p>
            </Card>

            <Card className="p-6 border border-border/80 bg-white hover:border-brand/35 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-brand tracking-wider">Correo Electrónico</span>
                <p className="mt-3 text-base font-bold text-ink truncate">{settings.contact_email}</p>
              </div>
              <p className="mt-2 text-xs text-ink-subtle">Consultas de transparencia e institucionales</p>
            </Card>

            <Card className="p-6 border border-border/80 bg-white hover:border-brand/35 transition-all duration-300 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-brand tracking-wider">Sede de Acopio</span>
                <p className="mt-3 text-base font-bold text-ink">{settings.contact_sede}</p>
              </div>
              <p className="mt-2 text-xs text-ink-subtle">Punto único para recepción de insumos físicos</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
