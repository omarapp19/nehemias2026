"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  BadgeStock,
  nivelStock,
  formatNumber,
} from "@nehemias/ui";
import { apiInsumos, apiCrearInsumo, apiActualizarInsumo } from "@/lib/admin-api";

interface SupplyRow {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: string | number;
  minThreshold: string | number;
  isUrgent: boolean;
}

export default function AdminInventarioPage() {
  const [items, setItems] = useState<SupplyRow[]>([]);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [formKey, setFormKey] = useState(0);

  function cargar() {
    apiInsumos()
      .then((r) => setItems(r.insumos))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await apiCrearInsumo(data);
      setFormKey((k) => k + 1);
      cargar();
    } finally {
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Inventario</h1>
        <p className="mt-1 text-ink-muted">
          Stock y mínimos. Lo urgente (por debajo del mínimo) se destaca solo al público.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Agregar insumo</h2>
        <form key={formKey} onSubmit={crear} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Nombre" htmlFor="name" required>
            <Input id="name" name="name" required />
          </Field>
          <Field label="Categoría" htmlFor="category">
            <Input id="category" name="category" placeholder="Alimento..." />
          </Field>
          <Field label="Unidad" htmlFor="unit" required>
            <Input id="unit" name="unit" placeholder="kg, cajas" required />
          </Field>
          <Field label="Stock actual" htmlFor="currentStock">
            <Input id="currentStock" name="currentStock" inputMode="decimal" defaultValue="0" />
          </Field>
          <Field label="Mínimo" htmlFor="minThreshold">
            <Input id="minThreshold" name="minThreshold" inputMode="decimal" defaultValue="0" />
          </Field>
          <div className="sm:col-span-2 lg:col-span-5">
            <Button type="submit" disabled={estado === "enviando"}>
              {estado === "enviando" ? "Guardando..." : "Agregar"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        {items.map((s) => (
          <SupplyRowItem key={s.id} supply={s} onSaved={cargar} />
        ))}
        {items.length === 0 && <p className="text-ink-muted">No hay insumos todavía.</p>}
      </section>
    </div>
  );
}

function SupplyRowItem({ supply, onSaved }: { supply: SupplyRow; onSaved: () => void }) {
  const [stock, setStock] = useState(String(supply.currentStock));
  const [min, setMin] = useState(String(supply.minThreshold));
  const [guardando, setGuardando] = useState(false);

  const nivel = nivelStock(Number(stock), Number(min));
  const cambiado =
    stock !== String(supply.currentStock) || min !== String(supply.minThreshold);

  async function guardar() {
    setGuardando(true);
    try {
      await apiActualizarInsumo(supply.id, {
        currentStock: Number(stock),
        minThreshold: Number(min),
      });
      onSaved();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <BadgeStock estado={nivel} />
        <div>
          <p className="font-medium text-ink">{supply.name}</p>
          <p className="text-sm text-ink-subtle">
            {supply.category ?? "Sin categoría"} · {formatNumber(Number(stock))} {supply.unit}
          </p>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <label className="text-xs text-ink-subtle">
          Stock
          <Input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-24"
          />
        </label>
        <label className="text-xs text-ink-subtle">
          Mínimo
          <Input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-24"
          />
        </label>
        <Button size="sm" onClick={guardar} disabled={!cambiado || guardando}>
          {guardando ? "..." : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}
