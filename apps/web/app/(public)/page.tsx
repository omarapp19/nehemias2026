import Link from "next/link";
import { buttonClasses, SectionHeader, IconArrowRight, IconShield } from "@nehemias/ui";
import { getHome, type HomeSnapshot } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { InsumoCard } from "@/components/cards";
import { DeliveryGallery } from "@/components/delivery-gallery";
import { RecentDonations, RecentExpenses } from "@/components/recent-transactions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: HomeSnapshot | null = null;
  try {
    data = await getHome();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-serif text-2xl font-semibold text-ink">
          No pudimos cargar los datos
        </h1>
        <p className="mt-2 text-ink-muted">
          Intenta de nuevo en unos momentos. Si el problema sigue, avísanos.
        </p>
      </div>
    );
  }

  const urgentes = data.urgentes.slice(0, 6);

  return (
    <>
      {/* ── Héroe ── */}
      <section className="relative overflow-hidden border-b border-border/50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(11,68,45,0.08),rgba(255,255,255,0))]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Columna Texto */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="flex items-center gap-2.5 px-0.5 py-1 text-xs font-bold text-brand tracking-widest uppercase">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
                </span>
                Transparencia en vivo
              </div>
              <h1 className="mt-6 font-serif text-4xl font-extrabold leading-[1.15] text-ink sm:text-5xl md:text-6xl tracking-tight">
                Cada aporte, a la vista. Para reconstruir donde nadie más llega.
              </h1>
              <p className="mt-6 text-base sm:text-lg leading-relaxed text-ink-muted">
                Tras los terremotos en Venezuela, asistimos a las comunidades olvidadas de La Guaira,
                Carayaca, Guarenas y Maracaibo. Aquí puedes auditar a dónde va cada bolívar y
                cada insumo, respaldado con facturas y fotos.
              </p>
              <div className="mt-10 flex flex-wrap gap-4 w-full sm:w-auto">
                <Link href="/donar" className={buttonClasses("primary", "lg", "shadow-[0_4px_14px_rgba(11,68,45,0.15)] hover:shadow-[0_6px_20px_rgba(11,68,45,0.2)] w-full sm:w-auto text-center")}>
                  Quiero apoyar
                </Link>
                <Link href="/transparencia" className={buttonClasses("secondary", "lg", "w-full sm:w-auto text-center")}>
                  Ver auditoría de fondos
                </Link>
              </div>
            </div>

            {/* Columna Imagen */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-none aspect-[3/2] sm:aspect-[1.4] lg:aspect-[1.1] overflow-hidden rounded-2xl border border-border shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <img
                  src="/humanitarian_aid_illustration.jpg"
                  alt="Ilustración de voluntariado y apoyo humanitario"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
              {/* Elementos decorativos de fondo */}
              <div className="absolute -bottom-4 -left-4 -z-10 h-48 w-48 rounded-2xl bg-brand-soft/50 border border-brand/5" />
              <div className="absolute -top-4 -right-4 -z-10 h-32 w-32 rounded-full bg-surface-sunken/40" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-5 py-16">
        {/* ── Balance (el corazón) ── */}
        <section>
          <SectionHeader
            eyebrow="El balance, calculado solo"
            title="Cuánto entró, cuánto se invirtió, cuánto queda"
            description="Las cifras se derivan de aportes verificados menos los egresos, consolidadas de forma unificada a la tasa de cambio del día."
          />
          <div className="mt-6">
            <BalancePanel balances={data.balances} exchangeRate={data.exchangeRate} />
          </div>
        </section>

        {/* ── Necesidades urgentes ── */}
        {urgentes.length > 0 && (
          <section>
            <SectionHeader
              eyebrow="Lo que hace falta ahora"
              title="Necesidades urgentes"
              description="Insumos por debajo del mínimo. Tu aporte se dirige primero aquí."
              action={
                <Link
                  href="/necesidades"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  Ver todas <IconArrowRight size={16} />
                </Link>
              }
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* ── Movimientos recientes ── */}
        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Ingresos" title="Últimos aportes verificados" />
            <div className="mt-5">
              <RecentDonations donations={data.ultimasDonaciones} exchangeRate={data.exchangeRate} />
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Egresos" title="En qué se invirtió" />
            <div className="mt-5">
              <RecentExpenses expenses={data.ultimosEgresos} exchangeRate={data.exchangeRate} />
            </div>
          </div>
        </section>

        {/* ── Entregas ── */}
        {data.ultimasEntregas.length > 0 && (
          <section>
            <SectionHeader
              eyebrow="La ayuda, en el terreno"
              title="Entregas recientes"
              description="Cada jornada queda registrada con fotos y el frente al que llegó."
              action={
                <Link
                  href="/entregas"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  Ver bitácora <IconArrowRight size={16} />
                </Link>
              }
            />
            <div className="mt-6">
              <DeliveryGallery entregas={data.ultimasEntregas} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
