"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Money,
  formatDate,
  IconReceipt,
  IconUpload,
} from "@nehemias/ui";
import type { PublicExpense } from "@nehemias/core";
import { apiEgresos, apiCrearEgreso } from "@/lib/admin-api";
import { fileUrl } from "@/lib/config";

export default function AdminEgresosPage() {
  const [items, setItems] = useState<PublicExpense[]>([]);
  const [creaStock, setCreaStock] = useState(false);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  function cargar() {
    apiEgresos()
      .then((r) => setItems(r.egresos))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("createsStock", creaStock ? "true" : "false");
    try {
      await apiCrearEgreso(data);
      form.reset();
      setFileName("");
      setCreaStock(false);
      setEstado("idle");
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo registrar la compra.");
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Egresos</h1>
        <p className="mt-1 text-ink-muted">
          Registra una compra y sube su factura. Baja del balance y queda pública.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Registrar una compra</h2>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Qué se compró?" htmlFor="desc" required className="sm:col-span-2">
            <Input id="desc" name="description" placeholder="Medicinas, alimentos..." required />
          </Field>
          <Field label="Monto" htmlFor="monto" required>
            <Input id="monto" name="amount" inputMode="decimal" required />
          </Field>
          <Field label="Moneda" htmlFor="moneda">
            <Select id="moneda" name="currency" defaultValue="USD">
              <option value="USD">Dólares (USD)</option>
              <option value="VES">Bolívares (Bs.)</option>
            </Select>
          </Field>
          <Field label="Categoría" htmlFor="cat">
            <Input id="cat" name="category" placeholder="Medicinas, Alimentos, Logística..." />
          </Field>
          <Field label="Proveedor" htmlFor="prov">
            <Input id="prov" name="supplier" placeholder="Nombre del proveedor" />
          </Field>
          <Field label="Fecha" htmlFor="fecha">
            <Input id="fecha" name="spentAt" type="date" />
          </Field>

          {/* Factura */}
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-ink">Factura (pública)</span>
            <label
              htmlFor="invoice"
              className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-ink-muted hover:bg-surface-sunken"
            >
              <IconUpload size={20} />
              <span className="text-sm">{fileName || "Subir foto o PDF de la factura"}</span>
              <input
                id="invoice"
                name="invoice"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          </div>

          {/* Alimenta inventario */}
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={creaStock}
              onChange={(e) => setCreaStock(e.target.checked)}
              className="h-4 w-4 accent-[color:rgb(var(--color-brand))]"
            />
            Esta compra entra al inventario
          </label>
          {creaStock && (
            <div className="grid gap-4 rounded-lg bg-surface p-4 sm:col-span-2 sm:grid-cols-3">
              <Field label="Insumo" htmlFor="s-name">
                <Input id="s-name" name="stockSupplyName" placeholder="Arroz" />
              </Field>
              <Field label="Cantidad" htmlFor="s-qty">
                <Input id="s-qty" name="stockQuantity" inputMode="decimal" />
              </Field>
              <Field label="Unidad" htmlFor="s-unit">
                <Input id="s-unit" name="stockUnit" placeholder="kg, cajas..." />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={estado === "enviando"}>
              {estado === "enviando" ? "Guardando..." : "Registrar compra"}
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Compras registradas</h2>
        <div className="space-y-3">
          {items.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">{e.description}</p>
                <p className="text-sm text-ink-muted">
                  {e.supplier ?? e.category} · {formatDate(e.spentAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Money amount={e.amount} currency={e.currency} className="font-semibold text-ink" />
                {fileUrl(e.invoiceUrl) && (
                  <a
                    href={fileUrl(e.invoiceUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand"
                  >
                    <IconReceipt size={15} /> Factura
                  </a>
                )}
              </div>
            </Card>
          ))}
          {items.length === 0 && <p className="text-ink-muted">Aún no hay compras registradas.</p>}
        </div>
      </section>
    </div>
  );
}
