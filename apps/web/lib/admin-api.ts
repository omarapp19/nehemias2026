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

// — Egresos —
export const apiEgresos = () => apiGet("/admin/egresos");
export const apiCrearEgreso = (form: FormData) => apiForm("/admin/egresos", form);

// — Inventario —
export const apiInsumos = () => apiGet("/admin/insumos");
export const apiCrearInsumo = (data: unknown) => apiJson("/admin/insumos", "POST", data);
export const apiActualizarInsumo = (id: string, data: unknown) =>
  apiJson(`/admin/insumos/${id}`, "PATCH", data);

// — Frentes —
export const apiFrentes = () => apiGet("/admin/frentes");
export const apiCrearFrente = (data: unknown) => apiJson("/admin/frentes", "POST", data);
export const apiActualizarFrente = (id: string, data: unknown) =>
  apiJson(`/admin/frentes/${id}`, "PUT", data);

// — Entregas —
export const apiEntregas = () => apiGet("/admin/entregas");
export const apiCrearEntrega = (form: FormData) => apiForm("/admin/entregas", form);

// — Captación —
export const apiCaptacion = () => apiGet("/admin/captacion");
export const apiCrearCaptacion = (data: unknown) => apiJson("/admin/captacion", "POST", data);
export const apiActualizarCaptacion = (id: string, data: unknown) =>
  apiJson(`/admin/captacion/${id}`, "PUT", data);
export const apiEliminarCaptacion = (id: string) =>
  apiJson(`/admin/captacion/${id}`, "DELETE", {});
