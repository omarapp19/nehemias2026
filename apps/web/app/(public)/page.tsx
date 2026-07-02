import Link from "next/link";
import { buttonClasses, SectionHeader, IconArrowRight, IconShield } from "@nehemias/ui";
import { getHome, type HomeSnapshot } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { InsumoCard } from "@/components/cards";
import { RecentDonations, RecentExpenses } from "@/components/recent-transactions";
import { GalleryView } from "@/components/gallery-view";

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
      <section className="relative overflow-hidden border-b border-border/50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(17,24,39,0.05),rgba(255,255,255,0))]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Columna Texto */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="flex items-center gap-2.5 px-0.5 py-1 text-xs font-bold text-ink-muted tracking-widest uppercase">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ink opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ink"></span>
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
                <Link href="/donar" className={buttonClasses("primary", "lg", "shadow-[0_4px_14px_rgba(17,24,39,0.12)] hover:shadow-[0_6px_20px_rgba(17,24,39,0.18)] w-full sm:w-auto text-center")}>
                  Quiero apoyar
                </Link>
                <Link href="/transparencia" className={buttonClasses("secondary", "lg", "w-full sm:w-auto text-center")}>
                  Ver auditoría de fondos
                </Link>
              </div>
            </div>

            {/* Columna Imagen */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-none aspect-[3/2] sm:aspect-[1.4] lg:aspect-[1.1] overflow-hidden rounded-2xl border border-border/80 bg-white/40 backdrop-blur shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <img
                  src="/humanitarian_aid_illustration.jpg"
                  alt="Ilustración de voluntariado y apoyo humanitario"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
              {/* Elementos decorativos de fondo */}
              <div className="absolute -bottom-4 -left-4 -z-10 h-48 w-48 rounded-2xl bg-white/30 backdrop-blur-md border border-white/50 shadow-md" />
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
        <section className="grid gap-10 lg:grid-cols-2 items-stretch">
          <div className="flex flex-col">
            <SectionHeader eyebrow="Ingresos" title="Últimos aportes verificados" />
            <div className="mt-5 flex-1">
              <RecentDonations donations={data.ultimasDonaciones} exchangeRate={data.exchangeRate} />
            </div>
          </div>
          <div className="flex flex-col">
            <SectionHeader eyebrow="Egresos" title="En qué se invirtió" />
            <div className="mt-5 flex-1">
              <RecentExpenses expenses={data.ultimosEgresos} exchangeRate={data.exchangeRate} />
            </div>
          </div>
        </section>

        {/* ── Galería del Trabajo ── */}
        {data.ultimasFotos.length > 0 && (
          <section className="border-t border-border pt-10">
            <SectionHeader
              eyebrow="El trabajo en el terreno"
              title="Galería de actividades"
              description="Registros fotográficos de las jornadas de distribución y apoyo."
              action={
                <Link
                  href="/galeria"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  Ver galería completa <IconArrowRight size={16} />
                </Link>
              }
            />
            <div className="mt-6">
              <GalleryView photos={data.ultimasFotos} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
