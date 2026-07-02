"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Card, Field, Input, Textarea, Badge, Select, IconX } from "@nehemias/ui";
import {
  apiCaptacion,
  apiCrearCaptacion,
  apiActualizarCaptacion,
  apiEliminarCaptacion,
  apiSettings,
  apiActualizarSettings,
} from "@/lib/admin-api";

interface PaymentRow {
  id: string;
  label: string;
  details: string;
  isActive: boolean;
  sortOrder: number;
  defaultCurrency: "USD" | "VES";
}

export default function AdminCaptacionPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [settings, setSettings] = useState<{ contact_phone: string; contact_email: string; contact_sede: string }>({
    contact_phone: "",
    contact_email: "",
    contact_sede: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    apiSettings()
      .then((res) => {
        if (res.settings) setSettings(res.settings);
      })
      .catch(() => {});
  }, []);

  function cargar() {
    apiCaptacion()
      .then((r) => setItems(r.captacion))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");
    const fd = new FormData(e.currentTarget);
    const data = {
      contact_phone: fd.get("contact_phone") as string,
      contact_email: fd.get("contact_email") as string,
      contact_sede: fd.get("contact_sede") as string,
    };
    try {
      const res = await apiActualizarSettings(data);
      if (res.settings) {
        setSettings(res.settings);
        setSettingsMessage("Datos de contacto guardados correctamente.");
      }
    } catch {
      setSettingsMessage("Error al guardar los datos de contacto.");
    } finally {
      setSettingsSaving(false);
    }
  }

  useEffect(() => {
    if (mostrarForm || editId !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mostrarForm, editId]);

  async function borrar(id: string) {
    if (confirm("¿Estás seguro de eliminar este método de pago?")) {
      await apiEliminarCaptacion(id).catch(() => {});
      cargar();
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Configuración</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Métodos de Pago</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Las cuentas y medios que ve el público en la sección “Quiero ayudar”.
          </p>
        </div>
        <Button
          variant={mostrarForm ? "secondary" : "primary"}
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 shadow-sm transition-all duration-300 hover:scale-[1.02]"
        >
          {mostrarForm ? "Ocultar Formulario" : "Agregar Método"}
        </Button>
      </div>

      {/* Sección de Datos de Contacto */}
      <Card className="p-6 bg-white border border-border/80 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-ink">Datos de contacto públicos</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Esta información se muestra al público en el portal de transparencia y formulario de donación.
          </p>
        </div>
        <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-3">
          <Field label="Teléfono / WhatsApp de Contacto" htmlFor="contact_phone" required>
            <Input
              id="contact_phone"
              name="contact_phone"
              value={settings.contact_phone}
              onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              required
            />
          </Field>
          <Field label="Correo Electrónico" htmlFor="contact_email" required>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              required
            />
          </Field>
          <Field label="Sede de Acopio (Ubicación)" htmlFor="contact_sede" required>
            <Input
              id="contact_sede"
              name="contact_sede"
              value={settings.contact_sede}
              onChange={(e) => setSettings({ ...settings, contact_sede: e.target.value })}
              required
            />
          </Field>
          <div className="sm:col-span-3 flex items-center justify-between gap-4 mt-2">
            {settingsMessage && (
              <p className={`text-sm font-semibold ${settingsMessage.includes("Error") ? "text-danger" : "text-success"}`}>
                {settingsMessage}
              </p>
            )}
            <Button type="submit" disabled={settingsSaving} className="ml-auto">
              {settingsSaving ? "Guardando..." : "Guardar Datos de Contacto"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Modal para Agregar */}
      {mounted && mostrarForm && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink leading-tight">Agregar método de pago</h3>
              </div>
              <button
                onClick={() => setMostrarForm(false)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Contenido del Modal (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <CaptacionForm
                onDone={() => {
                  setMostrarForm(false);
                  cargar();
                }}
                onCancel={() => setMostrarForm(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para Editar */}
      {mounted && editId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink leading-tight">Editar método de pago</h3>
              </div>
              <button
                onClick={() => setEditId(null)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Contenido del Modal (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <CaptacionForm
                item={items.find((x) => x.id === editId)}
                onDone={() => {
                  setEditId(null);
                  cargar();
                }}
                onCancel={() => setEditId(null)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <section className="space-y-4">
        {items.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-5 bg-white border border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-ink text-base uppercase tracking-wide">{p.label}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full border border-brand/10">
                  Moneda: {p.defaultCurrency}
                </span>
                {!p.isActive && <Badge tone="neutral">Oculto</Badge>}
              </div>
              <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{p.details}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setEditId(p.id)} className="shadow-sm">
                Editar
              </Button>
              <Button variant="danger" size="sm" onClick={() => borrar(p.id)} className="shadow-sm">
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
            <h3 className="font-serif text-lg font-bold text-ink">Sin registros</h3>
            <p className="text-sm text-ink-subtle mt-1">Aún no hay métodos de pago configurados.</p>
          </div>
        )}
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
      defaultCurrency: fd.get("defaultCurrency"),
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
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Etiqueta / Nombre de Cuenta" htmlFor="c-label" required>
        <Input id="c-label" name="label" defaultValue={item?.label} placeholder="Ej: Pago Móvil, Zelle, Cuenta BDV" required />
      </Field>
      <Field label="Orden de visualización" htmlFor="c-order">
        <Input id="c-order" name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} />
      </Field>
      <Field label="Moneda de Recepción Predeterminada" htmlFor="c-currency">
        <Select id="c-currency" name="defaultCurrency" defaultValue={item?.defaultCurrency ?? "USD"}>
          <option value="USD">Dólares (USD)</option>
          <option value="VES">Bolívares (VES / Bs.)</option>
        </Select>
      </Field>
      <Field label="Datos / Detalles a mostrar" htmlFor="c-details" required className="sm:col-span-2">
        <Textarea
          id="c-details"
          name="details"
          defaultValue={item?.details}
          placeholder="Banco, teléfono, Cédula/RIF, correo, etc..."
          required
          rows={4}
        />
      </Field>
      <div className="sm:col-span-2 py-1">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
          />
          Visible al público en el formulario de donaciones
        </label>
      </div>
      <div className="pt-2 border-t border-border/40 flex justify-end gap-3 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={estado === "enviando"} className="shadow-md">
          {estado === "enviando" ? "Guardando..." : item ? "Guardar Cambios" : "Agregar Método"}
        </Button>
      </div>
    </form>
  );
}
