import Link from "next/link";
import { formatDate, IconMapPin } from "@nehemias/ui";
import type { PublicDelivery } from "@nehemias/core";
import { fileUrl } from "@/lib/config";

const TIPO_LABEL: Record<string, string> = {
  comunidad: "Comunidad",
  refugio: "Refugio",
  desplazados: "Desplazados",
};

export function DeliveryCard({ entrega }: { entrega: PublicDelivery }) {
  const cover = fileUrl(entrega.photos[0]?.url);
  return (
    <Link
      href={`/entregas/${entrega.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[3/2] w-full overflow-hidden bg-surface-sunken">
        {cover ? (
          <img
            src={cover}
            alt={`Entrega en ${entrega.frente.name}: ${entrega.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-subtle">
            Sin foto
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-sm text-brand">
          <IconMapPin size={15} />
          <span className="font-medium">{entrega.frente.name}</span>
          <span className="text-ink-subtle">· {TIPO_LABEL[entrega.frente.type] ?? entrega.frente.type}</span>
        </div>
        <h3 className="mt-1.5 font-medium text-ink">{entrega.title}</h3>
        <p className="mt-1 text-sm text-ink-subtle">
          {formatDate(entrega.deliveredAt)} · {entrega.items.length} insumos entregados
        </p>
      </div>
    </Link>
  );
}

export function DeliveryGallery({ entregas }: { entregas: PublicDelivery[] }) {
  if (entregas.length === 0) {
    return <p className="text-ink-muted">Aún no hay entregas registradas.</p>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {entregas.map((e) => (
        <DeliveryCard key={e.id} entrega={e} />
      ))}
    </div>
  );
}
