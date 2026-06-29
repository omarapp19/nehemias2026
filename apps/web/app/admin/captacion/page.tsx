"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Textarea, Badge } from "@nehemias/ui";
import {
  apiCaptacion,
  apiCrearCaptacion,
  apiActualizarCaptacion,
  apiEliminarCaptacion,
} from "@/lib/admin-api";

interface PaymentRow {
  id: string;
  label: string;
  details: string;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCaptacionPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  function cargar() {
    apiCaptacion()
      .then((r) => setItems(r.captacion))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  async function borrar(id: string) {
    await apiEliminarCaptacion(id).catch(() => {});
    cargar();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Datos de captación</h1>
        <p className="mt-1 text-ink-muted">
          Las cuentas y medios que ve el público en “Quiero ayudar”.
        </p>
      </div>

      <CaptacionForm
        onDone={() => {
          setEditId(null);
          cargar();
        }}
      />

      <section className="space-y-3">
        {items.map((p) =>
          editId === p.id ? (
            <CaptacionForm
              key={p.id}
              item={p}
              onDone={() => {
                setEditId(null);
                cargar();
              }}
              onCancel={() => setEditId(null)}
            />
          ) : (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold uppercase tracking-wide text-brand">{p.label}</p>
                  {!p.isActive && <Badge tone="neutral">Oculto</Badge>}
                </div>
                <p className="mt-1 text-ink">{p.details}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditId(p.id)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => borrar(p.id)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ),
        )}
        {items.length === 0 && <p className="text-ink-muted">Aún no hay datos de captación.</p>}
      </section>
    </div>
  );
}

function CaptacionForm({
  item,
  onDone,
  onCancel,
}: {
  item?: PaymentRow;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [activo, setActivo] = useState(item?.isActive ?? true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    const fd = new FormData(e.currentTarget);
    const data = {
      label: fd.get("label"),
      details: fd.get("details"),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      isActive: activo,
    };
    try {
      if (item) await apiActualizarCaptacion(item.id, data);
      else await apiCrearCaptacion(data);
      onDone();
    } finally {
      setEstado("idle");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
        {item ? "Editar dato de captación" : "Agregar dato de captación"}
      </h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Etiqueta" htmlFor="c-label" required>
          <Input id="c-label" name="label" defaultValue={item?.label} placeholder="Pago Móvil" required />
        </Field>
        <Field label="Orden" htmlFor="c-order">
          <Input id="c-order" name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
        </Field>
        <Field label="Datos a mostrar" htmlFor="c-details" required className="sm:col-span-2">
          <Textarea
            id="c-details"
            name="details"
            defaultValue={item?.details}
            placeholder="Banco, teléfono, RIF..."
            required
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4 w-4 accent-[color:rgb(var(--color-brand))]"
          />
          Visible al público
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Guardando..." : item ? "Guardar" : "Agregar"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
