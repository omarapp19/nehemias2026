import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, IconMapPin, IconArrowRight, formatNumber } from "@nehemias/ui";
import { getEntrega } from "@/lib/api";
import { FRENTE_TIPO_LABEL } from "@/lib/labels";
import { fileUrl } from "@/lib/config";

export const metadata: Metadata = { title: "Detalle de entrega" };
export const dynamic = "force-dynamic";

export default async function EntregaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await getEntrega(id).catch(() => null);
  if (!res) notFound();
  const entrega = res.entrega;

  const photos = entrega.photos.map((p) => fileUrl(p.url)).filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <Link
        href="/entregas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
      >
        <IconArrowRight size={16} className="rotate-180" />
        Volver a la bitácora
      </Link>

      <div className="mt-5 flex items-center gap-1.5 text-brand">
        <IconMapPin size={18} />
        <span className="font-medium">{entrega.frente.name}</span>
        <span className="text-ink-subtle">
          · {FRENTE_TIPO_LABEL[entrega.frente.type] ?? entrega.frente.type}
          {entrega.frente.location ? ` · ${entrega.frente.location}` : ""}
        </span>
      </div>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-ink sm:text-4xl">
        {entrega.title}
      </h1>
      <p className="mt-2 text-ink-muted">{formatDate(entrega.deliveredAt)}</p>
      {entrega.notes && <p className="mt-4 max-w-prose text-lg text-ink-muted">{entrega.notes}</p>}

      {/* Galería */}
      {photos.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {photos.map((src, i) => (
            <div
              key={src}
              className={`overflow-hidden rounded-lg border border-border bg-surface-sunken ${
                i === 0 && photos.length > 1 ? "sm:col-span-2" : ""
              }`}
            >
              <img
                src={src}
                alt={`Foto de la entrega en ${entrega.frente.name}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Insumos entregados */}
      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold text-ink">Qué se entregó</h2>
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {entrega.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-ink">{it.description}</span>
              <span className="font-medium tabular-nums text-ink">
                {formatNumber(it.quantity)} {it.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
