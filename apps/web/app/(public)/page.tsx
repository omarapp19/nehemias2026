import Link from "next/link";
import { buttonClasses, SectionHeader, IconArrowRight, IconShield } from "@nehemias/ui";
import { getHome, type HomeSnapshot } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { InsumoCard, TransaccionCard } from "@/components/cards";
import { DeliveryGallery } from "@/components/delivery-gallery";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";

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
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-brand">
              <IconShield size={15} />
              Transparencia en tiempo real
            </span>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
              Cada aporte, a la vista. Para llegar a quienes nadie está atendiendo.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
              Tras los terremotos, asistimos a las comunidades olvidadas de La Guaira,
              Carayaca, Guarenas y Maracaibo. Aquí puedes auditar a dónde fue cada bolívar y
              cada insumo: con comprobantes y fotos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/donar" className={buttonClasses("primary", "lg")}>
                Quiero ayudar
              </Link>
              <Link href="/transparencia" className={buttonClasses("secondary", "lg")}>
                Ver en qué se usó
              </Link>
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
            description="Las cifras se derivan de aportes verificados menos los egresos. El dólar y el bolívar se llevan por separado, sin conversiones."
          />
          <div className="mt-6">
            <BalancePanel balances={data.balances} />
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
            <div className="mt-5 space-y-3">
              {data.ultimasDonaciones.map((d) => (
                <TransaccionCard
                  key={d.id}
                  direccion="ingreso"
                  titulo={d.donorDisplay}
                  subtitulo={d.type === "in_kind" ? "Donación en especie" : metodoLabel(d.method)}
                  amount={d.amount ?? 0}
                  currency={d.currency}
                  fecha={d.donatedAt}
                />
              ))}
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Egresos" title="En qué se invirtió" />
            <div className="mt-5 space-y-3">
              {data.ultimosEgresos.map((e) => (
                <TransaccionCard
                  key={e.id}
                  direccion="egreso"
                  titulo={e.description}
                  subtitulo={e.supplier ?? e.category}
                  amount={e.amount}
                  currency={e.currency}
                  fecha={e.spentAt}
                  comprobanteUrl={fileUrl(e.invoiceUrl)}
                />
              ))}
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
