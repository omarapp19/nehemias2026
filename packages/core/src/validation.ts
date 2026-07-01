import { z } from "zod";

/**
 * Esquemas de validación compartidos (zod). Mensajes en español y humanos.
 * El API valida SIEMPRE con estos esquemas antes de tocar la base de datos.
 */

/**
 * Booleano robusto para formularios (multipart manda strings).
 * OJO: z.coerce.boolean() convierte "false" en true; esto lo evita.
 */
function zBool(def: boolean) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return def;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["true", "1", "on", "yes", "si", "sí"].includes(v.toLowerCase());
    return Boolean(v);
  }, z.boolean());
}

export const currencyEnum = z.enum(["USD", "VES"], {
  errorMap: () => ({ message: "Elige una moneda válida (USD o VES)." }),
});
export const donationMethodEnum = z.string();
export const donationTypeEnum = z.enum(["financial", "in_kind"]);
export const frenteTypeEnum = z.enum(["comunidad", "refugio", "desplazados"]);

// — Autenticación admin —
export const loginSchema = z.object({
  email: z.string().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// — Línea de insumo (donación en especie / entrega) —
export const itemLineSchema = z.object({
  description: z.string().min(2, "Describe el insumo."),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero."),
  unit: z.string().min(1, "Indica la unidad (kg, cajas, unidades...)."),
  supplyId: z.string().uuid().optional(),
});

// — Camino B: el público declara su donación (entra como `pending`) —
export const declareDonationSchema = z
  .object({
    type: donationTypeEnum.default("financial"),
    amount: z.coerce.number().positive("El monto debe ser mayor que cero.").optional(),
    currency: currencyEnum.default("USD"),
    method: donationMethodEnum.optional(),
    referenceNumber: z.string().max(60).optional(),
    exchangeRate: z.coerce.number().positive().optional(),
    donorName: z.string().max(120).optional(),
    isAnonymous: zBool(false),
    donorContact: z.string().max(160).optional(), // PRIVADO
    message: z.string().max(280).optional(),
    donatedAt: z.coerce.date().optional(),
    inKindItems: z.array(itemLineSchema).optional(),
  })
  .refine((d) => d.type !== "financial" || (d.amount && d.amount > 0), {
    message: "Indica el monto donado.",
    path: ["amount"],
  })
  .refine((d) => d.type !== "in_kind" || (d.inKindItems && d.inKindItems.length > 0), {
    message: "Agrega al menos un insumo donado.",
    path: ["inKindItems"],
  });
export type DeclareDonationInput = z.infer<typeof declareDonationSchema>;

// — Admin registra una donación (puede quedar verificada directamente) —
export const adminCreateDonationSchema = declareDonationSchema.and(
  z.object({
    markVerified: zBool(true),
  }),
);
export type AdminCreateDonationInput = z.infer<typeof adminCreateDonationSchema>;

// — Verificar / rechazar donación —
export const reviewDonationSchema = z.object({
  action: z.enum(["verify", "reject"]),
});
export type ReviewDonationInput = z.infer<typeof reviewDonationSchema>;

// — Egreso / compra —
export const expenseSchema = z
  .object({
    description: z.string().min(2, "Describe la compra."),
    amount: z.coerce.number().positive("El monto debe ser mayor que cero."),
    currency: currencyEnum.default("USD"),
    category: z.string().max(60).optional(),
    supplier: z.string().max(120).optional(),
    invoiceNumber: z.string().max(60).optional(),
    spentAt: z.coerce.date().optional(),
    createsStock: zBool(false),
    // Si alimenta inventario:
    stockSupplyName: z.string().max(120).optional(),
    stockQuantity: z.coerce.number().positive().optional(),
    stockUnit: z.string().max(40).optional(),
    stockCategory: z.string().max(60).optional(),
  })
  .refine(
    (e) =>
      !e.createsStock ||
      (e.stockSupplyName && e.stockQuantity && e.stockUnit),
    {
      message: "Para sumar al inventario indica insumo, cantidad y unidad.",
      path: ["stockSupplyName"],
    },
  );
export type ExpenseInput = z.infer<typeof expenseSchema>;

// — Insumo (inventario) —
export const supplySchema = z.object({
  name: z.string().min(2, "Escribe el nombre del insumo."),
  category: z.string().max(60).optional(),
  unit: z.string().min(1, "Indica la unidad."),
  currentStock: z.coerce.number().min(0).default(0),
  minThreshold: z.coerce.number().min(0).default(0),
  origin: z.enum(["purchased", "donated"]).optional(),
});
export type SupplyInput = z.infer<typeof supplySchema>;

export const supplyUpdateSchema = supplySchema.partial();
export type SupplyUpdateInput = z.infer<typeof supplyUpdateSchema>;

// — Frente de atención —
export const frenteSchema = z.object({
  name: z.string().min(2, "Escribe el nombre del frente."),
  type: frenteTypeEnum,
  location: z.string().max(160).optional(),
  description: z.string().max(400).optional(),
});
export type FrenteInput = z.infer<typeof frenteSchema>;

// — Entrega (bitácora) —
export const deliverySchema = z.object({
  frenteId: z.string().uuid("Elige un frente válido."),
  title: z.string().min(2, "Ponle un título a la jornada."),
  notes: z.string().max(400).optional(),
  deliveredAt: z.coerce.date().optional(),
  items: z.array(itemLineSchema).min(1, "Agrega al menos un insumo entregado."),
});
export type DeliveryInput = z.infer<typeof deliverySchema>;

// — Datos de captación —
export const paymentInfoSchema = z.object({
  label: z.string().min(2, "Escribe la etiqueta (p. ej. Pago Móvil)."),
  details: z.string().min(2, "Escribe los datos a mostrar."),
  isActive: zBool(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type PaymentInfoInput = z.infer<typeof paymentInfoSchema>;
