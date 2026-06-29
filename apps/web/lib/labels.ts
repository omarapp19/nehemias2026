/** Etiquetas humanas para mostrar en la cara pública. */

export const METODO_LABEL: Record<string, string> = {
  pago_movil: "Pago Móvil",
  transfer: "Transferencia",
  cash: "Efectivo",
  other: "Otro",
};

export const FRENTE_TIPO_LABEL: Record<string, string> = {
  comunidad: "Comunidad",
  refugio: "Refugio",
  desplazados: "Desplazados",
};

export function metodoLabel(method: string | null | undefined): string {
  if (!method) return "";
  return METODO_LABEL[method] ?? method;
}
