"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Card, Field, Input, Select, Badge, IconX } from "@nehemias/ui";
import {
  apiAdmins,
  apiCrearAdmin,
  apiDesactivarAdmin,
  apiReactivarAdmin,
  apiResetearPassword,
  AdminApiError,
  type AdminRow,
} from "@/lib/admin-api";

export default function AdminAdministradoresPage() {
  const [items, setItems] = useState<AdminRow[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  function cargar() {
    apiAdmins()
      .then((r) => setItems(r.admins))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  useEffect(() => {
    document.body.style.overflow = mostrarForm || resetId !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mostrarForm, resetId]);

  async function toggleActivo(a: AdminRow) {
    setError("");
    try {
      if (a.isActive) await apiDesactivarAdmin(a.id);
      else await apiReactivarAdmin(a.id);
      cargar();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al actualizar el estado.");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Acceso</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Administradores</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Quiénes pueden entrar al panel y con qué rol.
          </p>
        </div>
        <Button
          variant={mostrarForm ? "secondary" : "primary"}
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 shadow-sm transition-all duration-300 hover:scale-[1.02]"
        >
          {mostrarForm ? "Ocultar Formulario" : "Crear Administrador"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {mounted && mostrarForm && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink">Crear administrador</h3>
              <button
                onClick={() => setMostrarForm(false)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <CrearAdminForm
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

      {mounted && resetId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-md w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink">Resetear contraseña</h3>
              <button
                onClick={() => setResetId(null)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <ResetPasswordForm
                id={resetId}
                onDone={() => setResetId(null)}
                onCancel={() => setResetId(null)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <section className="space-y-4">
        {items.map((a) => (
          <Card key={a.id} className="flex items-center justify-between p-5 bg-white border border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-ink text-base">{a.name}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full border border-brand/10">
                  {a.role === "admin" ? "Admin" : "Coordinador"}
                </span>
                {!a.isActive && <Badge tone="neutral">Inactivo</Badge>}
              </div>
              <p className="text-sm text-ink-muted">{a.email}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setResetId(a.id)} className="shadow-sm">
                Resetear contraseña
              </Button>
              <Button
                variant={a.isActive ? "danger" : "secondary"}
                size="sm"
                onClick={() => toggleActivo(a)}
                className="shadow-sm"
              >
                {a.isActive ? "Desactivar" : "Reactivar"}
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
            <h3 className="font-serif text-lg font-bold text-ink">Sin registros</h3>
            <p className="text-sm text-ink-subtle mt-1">Aún no hay administradores.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CrearAdminForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      email: fd.get("email") as string,
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      password: fd.get("password") as string,
    };
    try {
      await apiCrearAdmin(data);
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al crear el administrador.");
    } finally {
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre" htmlFor="a-name" required>
        <Input id="a-name" name="name" required />
      </Field>
      <Field label="Correo" htmlFor="a-email" required>
        <Input id="a-email" name="email" type="email" required />
      </Field>
      <Field label="Rol" htmlFor="a-role">
        <Select id="a-role" name="role" defaultValue="coordinator">
          <option value="coordinator">Coordinador</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <Field label="Contraseña" htmlFor="a-password" required help="Mínimo 8 caracteres.">
        <Input id="a-password" name="password" type="password" minLength={8} required />
      </Field>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="pt-2 border-t border-border/40 flex justify-end gap-3 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"} className="shadow-md">
          {estado === "enviando" ? "Creando..." : "Crear Administrador"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({
  id,
  onDone,
  onCancel,
}: {
  id: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    try {
      await apiResetearPassword(id, password);
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al resetear la contraseña.");
    } finally {
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nueva contraseña" htmlFor="r-password" required help="Mínimo 8 caracteres.">
        <Input
          id="r-password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Guardando..." : "Resetear"}
        </Button>
      </div>
    </form>
  );
}
