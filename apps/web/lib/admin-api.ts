import { PUBLIC_API_BASE } from "./config";

/** Cliente del API para el panel admin (envía la cookie de sesión). */

export class AdminApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function handle(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(res.status, body?.error ?? "Error en la solicitud.", body?.fields);
  }
  return body;
}

export function apiGet(path: string) {
  return fetch(`${PUBLIC_API_BASE}${path}`, { credentials: "include" }).then(handle);
}

export function apiJson(path: string, method: string, data: unknown) {
  return fetch(`${PUBLIC_API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(handle);
}

export function apiForm(path: string, formData: FormData, method = "POST") {
  return fetch(`${PUBLIC_API_BASE}${path}`, {
    method,
    credentials: "include",
    body: formData,
  }).then(handle);
}

// — Sesión —
export const apiMe = () => apiGet("/auth/me");
export const apiLogin = (email: string, password: string) =>
  apiJson("/auth/login", "POST", { email, password });
export const apiLogout = () => apiJson("/auth/logout", "POST", {});

// — Donaciones —
export const apiDonaciones = (status?: string) =>
  apiGet(`/admin/donaciones${status ? `?status=${status}` : ""}`);
export const apiRevisarDonacion = (id: string, action: "verify" | "reject") =>
  apiJson(`/admin/donaciones/${id}/revisar`, "POST", { action });
export const apiCrearDonacion = (form: FormData) => apiForm("/admin/donaciones", form);
export const apiActualizarDonacion = (id: string, form: FormData) => apiForm(`/admin/donaciones/${id}`, form, "PUT");
export const apiEliminarDonacion = (id: string) => apiJson(`/admin/donaciones/${id}`, "DELETE", {});

// — Egresos —
export const apiEgresos = () => apiGet("/admin/egresos");
export const apiCrearEgreso = (form: FormData) => apiForm("/admin/egresos", form);
export const apiActualizarEgreso = (id: string, form: FormData) => apiForm(`/admin/egresos/${id}`, form, "PUT");
export const apiEliminarEgreso = (id: string) => apiJson(`/admin/egresos/${id}`, "DELETE", {});

// — Inventario —
export const apiInsumos = () => apiGet("/admin/insumos");
export const apiCrearInsumo = (data: unknown) => apiJson("/admin/insumos", "POST", data);
export const apiActualizarInsumo = (id: string, data: unknown) =>
  apiJson(`/admin/insumos/${id}`, "PATCH", data);
export const apiEliminarInsumo = (id: string) => apiJson(`/admin/insumos/${id}`, "DELETE", {});

// — Frentes —
export const apiFrentes = () => apiGet("/admin/frentes");
export const apiCrearFrente = (data: unknown) => apiJson("/admin/frentes", "POST", data);
export const apiActualizarFrente = (id: string, data: unknown) =>
  apiJson(`/admin/frentes/${id}`, "PUT", data);
export const apiEliminarFrente = (id: string) => apiJson(`/admin/frentes/${id}`, "DELETE", {});

// — Galería —
export const apiGaleria = () => apiGet("/admin/galeria");
export const apiSubirFotos = (form: FormData) => apiForm("/admin/galeria", form);
export const apiEliminarFoto = (id: string) => apiJson(`/admin/galeria/${id}`, "DELETE", {});

// — Captación —
export const apiCaptacion = () => apiGet("/admin/captacion");
export const apiCrearCaptacion = (data: unknown) => apiJson("/admin/captacion", "POST", data);
export const apiActualizarCaptacion = (id: string, data: unknown) =>
  apiJson(`/admin/captacion/${id}`, "PUT", data);
export const apiEliminarCaptacion = (id: string) =>
  apiJson(`/admin/captacion/${id}`, "DELETE", {});

// — Sincronización —
export const apiSyncSheets = () => apiJson("/admin/sync-sheets", "POST", {});

