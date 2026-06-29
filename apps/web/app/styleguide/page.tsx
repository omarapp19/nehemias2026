import type { Metadata } from "next";
import {
  theme,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Badge,
  BadgeDonacion,
  BadgeStock,
  Stat,
  Money,
  Card,
} from "@nehemias/ui";
import { TransaccionCard, InsumoCard } from "@/components/cards";

export const metadata: Metadata = { title: "Guía de estilo" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-prose text-ink-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Design system
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold text-ink">
          Guía de estilo · Nehemías
        </h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Tokens, tipografía y componentes. Sobrio, institucional y de alta confiabilidad.
          Para re-tematizar toda la plataforma, edita los hex en{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-sm">
            packages/ui/src/theme.config.ts
          </code>
          .
        </p>
      </header>

      <Section title="Paleta" description="Un solo acento institucional; rojo/ámbar reservados para alertas.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(theme.colors).map(([name, hex]) => (
            <div key={name} className="overflow-hidden rounded-lg border border-border">
              <div className="h-16 w-full" style={{ backgroundColor: hex }} />
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-ink">{name}</p>
                <p className="font-mono text-xs uppercase text-ink-subtle">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía" description="Serif sobria para titulares; sans legible para datos; cifras tabulares.">
        <div className="space-y-3">
          <p className="font-serif text-4xl font-semibold text-ink">
            Reconstruir con transparencia
          </p>
          <p className="font-serif text-2xl text-ink">Titular secundario en serif</p>
          <p className="max-w-prose text-base text-ink-muted">
            Cuerpo en Inter. La confianza nace del orden: márgenes generosos, ritmo vertical
            y datos claros. El público audita en tiempo real a dónde fue cada aporte.
          </p>
          <p className="text-lg tabular-nums text-ink">
            Cifras tabulares: 1,234.50 · 9,870.00 · 12.00
          </p>
        </div>
      </Section>

      <Section title="Botones" description="Objetivo de toque cómodo (≥48px en tamaños md y lg).">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Registrar una compra</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver detalle</Button>
          <Button variant="danger">Rechazar</Button>
          <Button variant="primary" size="sm">
            Pequeño
          </Button>
          <Button variant="primary" size="lg">
            Grande
          </Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
        </div>
      </Section>

      <Section title="Formularios" description="Etiquetas claras, lenguaje humano, errores entendibles.">
        <div className="grid max-w-xl gap-4">
          <Field label="Monto donado" htmlFor="sg-monto" help="Solo el número, sin símbolos.">
            <Input id="sg-monto" inputMode="decimal" placeholder="100.00" />
          </Field>
          <Field label="Método" htmlFor="sg-metodo">
            <Select id="sg-metodo" defaultValue="">
              <option value="" disabled>
                Elige una opción
              </option>
              <option value="pago_movil">Pago Móvil</option>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
            </Select>
          </Field>
          <Field label="Mensaje" htmlFor="sg-msg" help="Opcional, se muestra públicamente.">
            <Textarea id="sg-msg" placeholder="Un mensaje de aliento..." />
          </Field>
          <Field label="Correo" htmlFor="sg-err" error="Escribe un correo válido.">
            <Input id="sg-err" defaultValue="correo-invalido" aria-invalid />
          </Field>
        </div>
      </Section>

      <Section title="Estados" description="Color + texto + forma (icono): nunca solo color.">
        <div className="flex flex-wrap gap-3">
          <BadgeDonacion estado="pending" />
          <BadgeDonacion estado="verified" />
          <BadgeDonacion estado="rejected" />
          <BadgeStock estado="normal" />
          <BadgeStock estado="bajo" />
          <BadgeStock estado="agotado" />
          <Badge tone="brand">Etiqueta de marca</Badge>
          <Badge tone="neutral">Neutral</Badge>
        </div>
      </Section>

      <Section title="Cifras de transparencia" description="Los datos son el héroe: grandes, claros, con dignidad.">
        <Card className="grid gap-6 p-6 sm:grid-cols-3">
          <Stat label="Recaudado" value={<Money amount={9870} currency="USD" />} tone="brand" size="lg" />
          <Stat label="Invertido" value={<Money amount={6420.5} currency="USD" />} size="lg" />
          <Stat
            label="Disponible"
            value={<Money amount={3449.5} currency="USD" />}
            tone="brand"
            size="lg"
          />
        </Card>
      </Section>

      <Section title="Tarjeta de transacción">
        <div className="grid gap-3">
          <TransaccionCard
            direccion="ingreso"
            titulo="Donación de María G."
            subtitulo="Pago Móvil"
            amount={150}
            currency="USD"
            fecha="2026-06-26"
          />
          <TransaccionCard
            direccion="egreso"
            titulo="Compra de medicinas"
            subtitulo="Farmacia La Salud"
            amount={420.5}
            currency="USD"
            fecha="2026-06-27"
            comprobanteUrl="#"
          />
        </div>
      </Section>

      <Section title="Tarjeta de insumo">
        <div className="grid gap-3 sm:grid-cols-2">
          <InsumoCard name="Agua potable" category="Alimento" unit="litros" currentStock={120} minThreshold={80} />
          <InsumoCard name="Antibióticos" category="Medicina" unit="cajas" currentStock={6} minThreshold={20} />
          <InsumoCard name="Pañales" category="Higiene" unit="paquetes" currentStock={0} minThreshold={30} />
        </div>
      </Section>
    </div>
  );
}
