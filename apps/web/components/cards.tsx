import {
  Card,
  Money,
  ProgressBar,
  BadgeStock,
  nivelStock,
  IconReceipt,
  IconTrendingUp,
  formatDate,
  formatNumber,
  type Currency,
} from "@nehemias/ui";

/** Tarjeta de transacción: un ingreso (donación) o un egreso (compra). */
export function TransaccionCard({
  direccion,
  titulo,
  subtitulo,
  amount,
  currency,
  fecha,
  comprobanteUrl,
  comprobanteLabel,
}: {
  direccion: "ingreso" | "egreso";
  titulo: string;
  subtitulo?: string | null;
  amount: number;
  currency: Currency;
  fecha: string;
  comprobanteUrl?: string | null;
  comprobanteLabel?: string;
}) {
  const esIngreso = direccion === "ingreso";
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            esIngreso ? "bg-brand-soft text-brand" : "bg-surface-sunken text-ink-muted"
          }`}
        >
          {esIngreso ? <IconTrendingUp size={18} /> : <IconReceipt size={18} />}
        </span>
        <div>
          <p className="font-medium text-ink">{titulo}</p>
          {subtitulo && <p className="text-sm text-ink-muted">{subtitulo}</p>}
          <p className="mt-0.5 text-xs text-ink-subtle">{formatDate(fecha)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <Money
          amount={amount}
          currency={currency}
          className={`text-lg font-semibold ${esIngreso ? "text-brand" : "text-ink"}`}
        />
        {comprobanteUrl && (
          <a
            href={comprobanteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-strong"
          >
            <IconReceipt size={15} />
            {comprobanteLabel ?? "Ver factura"}
          </a>
        )}
      </div>
    </Card>
  );
}

/** Tarjeta de insumo (inventario / necesidades). */
export function InsumoCard({
  name,
  category,
  unit,
  currentStock,
  minThreshold,
}: {
  name: string;
  category?: string | null;
  unit: string;
  currentStock: number;
  minThreshold: number;
}) {
  const nivel = nivelStock(currentStock, minThreshold);
  const tone = nivel === "agotado" ? "danger" : nivel === "bajo" ? "warning" : "brand";
  const faltante = Math.max(0, minThreshold - currentStock);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{name}</p>
          {category && <p className="text-sm text-ink-subtle">{category}</p>}
        </div>
        <BadgeStock estado={nivel} />
      </div>

      <ProgressBar value={currentStock} max={Math.max(minThreshold, currentStock, 1)} tone={tone} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">
          <span className="font-semibold tabular-nums text-ink">
            {formatNumber(currentStock)}
          </span>{" "}
          {unit} en existencia
        </span>
        {faltante > 0 && (
          <span className="font-medium text-warning">
            Faltan {formatNumber(faltante)} {unit}
          </span>
        )}
      </div>
    </Card>
  );
}
