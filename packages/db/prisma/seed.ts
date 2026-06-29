import path from "node:path";
import { config } from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import argon2 from "argon2";

// Carga el .env de la raíz del monorepo (por si se ejecuta directamente desde packages/db).
config({ path: path.resolve(process.cwd(), "../../.env") });
config();

const prisma = new PrismaClient();

const D = (n: number) => new Prisma.Decimal(n);
const urgent = (stock: number, min: number) => stock < min;

// Imágenes de ejemplo (reemplazables desde el panel). Deterministas para el demo.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/600`;
// Documento de ejemplo para facturas/comprobantes del seed.
const docu = (seed: string) => `https://picsum.photos/seed/${seed}/800/1000`;

async function main() {
  console.log("⏳ Sembrando datos de demostración...");

  // ── Admin inicial ──
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nehemias.org";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "cambia_esta_clave_admin";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Coordinación Nehemías";
  const passwordHash = await argon2.hash(adminPass, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, isActive: true },
    create: { email: adminEmail, name: adminName, passwordHash, role: "admin" },
  });
  console.log(`👤 Admin: ${adminEmail}`);

  // ── Limpieza de datos de demo (no toca admins) ──
  await prisma.stockMovement.deleteMany();
  await prisma.deliveryPhoto.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.inKindItem.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.supply.deleteMany();
  await prisma.frente.deleteMany();
  await prisma.paymentInfo.deleteMany();

  // ── Datos de captación (públicos) ──
  await prisma.paymentInfo.createMany({
    data: [
      {
        label: "Pago Móvil",
        details: "Banco de Venezuela (0102) · Tel 0414-1234567 · RIF J-12345678-9",
        sortOrder: 1,
      },
      {
        label: "Transferencia (Bs.)",
        details: "Banco de Venezuela · Cuenta 0102-0000-00-0000000000 · Iglesia Nehemías",
        sortOrder: 2,
      },
      { label: "Zelle (USD)", details: "ayuda@nehemias.org · Nehemias Church", sortOrder: 3 },
      { label: "Binance (USDT)", details: "Pay ID: 123456789 · Red TRC20", sortOrder: 4 },
    ],
  });

  // ── Frentes de atención ──
  const laGuaira = await prisma.frente.create({
    data: {
      name: "La Guaira",
      type: "comunidad",
      location: "Sector Las Tunitas",
      description: "Familias desalojadas por deslizamientos en la zona costera.",
    },
  });
  const carayaca = await prisma.frente.create({
    data: {
      name: "Carayaca",
      type: "comunidad",
      location: "Vía El Limón",
      description: "Comunidad rural aislada tras el colapso de la vía principal.",
    },
  });
  const guarenas = await prisma.frente.create({
    data: {
      name: "Refugio Escuela Bolivariana",
      type: "refugio",
      location: "Guarenas",
      description: "Refugio temporal con más de 40 familias desatendidas.",
    },
  });
  const maracaibo = await prisma.frente.create({
    data: {
      name: "Desplazados Sur del Lago",
      type: "desplazados",
      location: "Maracaibo",
      description: "Personas desplazadas internas sin asistencia institucional.",
    },
  });

  // ── Inventario (algunos urgentes) ──
  const supplyData: {
    name: string;
    category: string;
    unit: string;
    stock: number;
    min: number;
    origin: "purchased" | "donated";
  }[] = [
    { name: "Agua potable", category: "Alimento", unit: "litros", stock: 320, min: 200, origin: "donated" },
    { name: "Arroz", category: "Alimento", unit: "kg", stock: 80, min: 150, origin: "purchased" },
    { name: "Leche en polvo", category: "Alimento", unit: "kg", stock: 40, min: 60, origin: "purchased" },
    { name: "Aceite", category: "Alimento", unit: "litros", stock: 120, min: 80, origin: "purchased" },
    { name: "Antibióticos", category: "Medicina", unit: "cajas", stock: 5, min: 30, origin: "purchased" },
    { name: "Acetaminofén", category: "Medicina", unit: "cajas", stock: 12, min: 25, origin: "donated" },
    { name: "Pañales", category: "Higiene", unit: "paquetes", stock: 0, min: 40, origin: "donated" },
    { name: "Toallas sanitarias", category: "Higiene", unit: "paquetes", stock: 10, min: 35, origin: "donated" },
    { name: "Jabón", category: "Higiene", unit: "unidades", stock: 200, min: 100, origin: "purchased" },
    { name: "Cloro", category: "Higiene", unit: "litros", stock: 50, min: 30, origin: "purchased" },
    { name: "Colchonetas", category: "Refugio", unit: "unidades", stock: 15, min: 50, origin: "donated" },
    { name: "Frazadas", category: "Refugio", unit: "unidades", stock: 60, min: 40, origin: "donated" },
  ];

  const supplies: Record<string, string> = {};
  for (const s of supplyData) {
    const created = await prisma.supply.create({
      data: {
        name: s.name,
        category: s.category,
        unit: s.unit,
        currentStock: D(s.stock),
        minThreshold: D(s.min),
        isUrgent: urgent(s.stock, s.min),
        origin: s.origin,
      },
    });
    supplies[s.name] = created.id;
  }

  // ── Donaciones VERIFICADAS (cuentan al balance) ──
  const verified: Prisma.DonationCreateManyInput[] = [
    { type: "financial", status: "verified", amount: D(200), currency: "USD", method: "transfer", donorName: "María González", donatedAt: new Date("2026-06-25"), verifiedAt: new Date("2026-06-25"), message: "Con cariño para las familias." },
    { type: "financial", status: "verified", amount: D(150), currency: "USD", method: "pago_movil", donorName: "José Rodríguez", donatedAt: new Date("2026-06-25"), verifiedAt: new Date("2026-06-26") },
    { type: "financial", status: "verified", amount: D(500), currency: "USD", method: "transfer", isAnonymous: true, donatedAt: new Date("2026-06-26"), verifiedAt: new Date("2026-06-26"), message: "Dios los bendiga." },
    { type: "financial", status: "verified", amount: D(75), currency: "USD", method: "cash", donorName: "Familia Pérez", donatedAt: new Date("2026-06-26"), verifiedAt: new Date("2026-06-26") },
    { type: "financial", status: "verified", amount: D(1000), currency: "USD", method: "transfer", isAnonymous: true, donatedAt: new Date("2026-06-27"), verifiedAt: new Date("2026-06-27") },
    { type: "financial", status: "verified", amount: D(300), currency: "USD", method: "pago_movil", donorName: "Carlos Méndez", donatedAt: new Date("2026-06-27"), verifiedAt: new Date("2026-06-27") },
    { type: "financial", status: "verified", amount: D(250), currency: "USD", method: "transfer", donorName: "Ana Belén", donatedAt: new Date("2026-06-28"), verifiedAt: new Date("2026-06-28") },
    { type: "financial", status: "verified", amount: D(60), currency: "USD", method: "cash", donorName: "Pedro Linares", donatedAt: new Date("2026-06-28"), verifiedAt: new Date("2026-06-28") },
    { type: "financial", status: "verified", amount: D(3200), currency: "VES", method: "pago_movil", donorName: "Yolanda Sánchez", donatedAt: new Date("2026-06-25"), verifiedAt: new Date("2026-06-25") },
    { type: "financial", status: "verified", amount: D(1500), currency: "VES", method: "pago_movil", isAnonymous: true, donatedAt: new Date("2026-06-26"), verifiedAt: new Date("2026-06-26") },
    { type: "financial", status: "verified", amount: D(5000), currency: "VES", method: "transfer", donorName: "Comercial El Faro", donatedAt: new Date("2026-06-27"), verifiedAt: new Date("2026-06-27"), message: "Aporte de nuestro negocio." },
    { type: "financial", status: "verified", amount: D(2400), currency: "VES", method: "pago_movil", donorName: "Luisa Marcano", donatedAt: new Date("2026-06-28"), verifiedAt: new Date("2026-06-28") },
    { type: "financial", status: "verified", amount: D(800), currency: "VES", method: "cash", isAnonymous: true, donatedAt: new Date("2026-06-28"), verifiedAt: new Date("2026-06-29") },
  ];
  await prisma.donation.createMany({ data: verified });

  // Donación en especie verificada (con ítems) — para mostrar trazabilidad.
  await prisma.donation.create({
    data: {
      type: "in_kind",
      status: "verified",
      donorName: "Panadería Trigo de Oro",
      donatedAt: new Date("2026-06-26"),
      verifiedAt: new Date("2026-06-26"),
      message: "Donamos lo que pudimos reunir.",
      inKindItems: {
        create: [
          { description: "Frazadas", quantity: D(30), unit: "unidades", supplyId: supplies["Frazadas"] },
          { description: "Agua potable", quantity: D(100), unit: "litros", supplyId: supplies["Agua potable"] },
        ],
      },
    },
  });

  // ── Donaciones PENDIENTES (cola de verificación; NO afectan el balance) ──
  await prisma.donation.create({
    data: {
      type: "financial",
      status: "pending",
      amount: D(120),
      currency: "USD",
      method: "pago_movil",
      donorName: "Gabriela Ruiz",
      donorContact: "0412-7654321", // PRIVADO
      proofUrl: docu("comprobante-1"), // PRIVADO
      message: "Espero ayude.",
      declaredByPublic: true,
      donatedAt: new Date("2026-06-29"),
    },
  });
  await prisma.donation.create({
    data: {
      type: "financial",
      status: "pending",
      amount: D(4500),
      currency: "VES",
      method: "transfer",
      isAnonymous: true,
      donorContact: "anon@correo.com", // PRIVADO
      proofUrl: docu("comprobante-2"),
      declaredByPublic: true,
      donatedAt: new Date("2026-06-29"),
    },
  });
  await prisma.donation.create({
    data: {
      type: "in_kind",
      status: "pending",
      donorName: "Ferretería Central",
      donorContact: "0414-1112233",
      declaredByPublic: true,
      donatedAt: new Date("2026-06-29"),
      inKindItems: {
        create: [{ description: "Colchonetas", quantity: D(20), unit: "unidades" }],
      },
    },
  });

  // ── Egresos (con factura PÚBLICA) ──
  const expenses: Prisma.ExpenseCreateManyInput[] = [
    { description: "Compra de arroz y aceite", amount: D(420.5), currency: "USD", category: "Alimentos", supplier: "Mayorista San José", invoiceUrl: docu("factura-1"), createsStock: true, spentAt: new Date("2026-06-26") },
    { description: "Antibióticos y acetaminofén", amount: D(680), currency: "USD", category: "Medicinas", supplier: "Farmacia La Salud", invoiceUrl: docu("factura-2"), createsStock: true, spentAt: new Date("2026-06-26") },
    { description: "Transporte de insumos a La Guaira", amount: D(90), currency: "USD", category: "Logística", supplier: "Fletes Rápidos", invoiceUrl: docu("factura-3"), spentAt: new Date("2026-06-27") },
    { description: "Jabón y cloro", amount: D(160), currency: "USD", category: "Higiene", supplier: "Distribuidora Limpia", invoiceUrl: docu("factura-4"), createsStock: true, spentAt: new Date("2026-06-27") },
    { description: "Combustible para traslados", amount: D(2100), currency: "VES", category: "Logística", supplier: "Estación Centro", invoiceUrl: docu("factura-5"), spentAt: new Date("2026-06-27") },
    { description: "Pan y víveres frescos", amount: D(3400), currency: "VES", category: "Alimentos", supplier: "Panadería Trigo de Oro", invoiceUrl: docu("factura-6"), spentAt: new Date("2026-06-28") },
    { description: "Frazadas y colchonetas", amount: D(540), currency: "USD", category: "Refugio", supplier: "Textil del Centro", invoiceUrl: docu("factura-7"), createsStock: true, spentAt: new Date("2026-06-28") },
    { description: "Agua embotellada", amount: D(220), currency: "USD", category: "Alimentos", supplier: "AguaPura C.A.", invoiceUrl: docu("factura-8"), createsStock: true, spentAt: new Date("2026-06-28") },
    { description: "Alquiler de camión", amount: D(1800), currency: "VES", category: "Logística", supplier: "Transporte Unido", invoiceUrl: docu("factura-9"), spentAt: new Date("2026-06-29") },
    { description: "Insumos de higiene femenina", amount: D(130), currency: "USD", category: "Higiene", supplier: "Distribuidora Limpia", invoiceUrl: docu("factura-10"), createsStock: true, spentAt: new Date("2026-06-29") },
  ];
  await prisma.expense.createMany({ data: expenses });

  // ── Entregas (bitácora con fotos) ──
  const entregas: {
    frenteId: string;
    title: string;
    notes: string;
    when: string;
    items: { name: string; qty: number; unit: string }[];
    photos: string[];
  }[] = [
    {
      frenteId: laGuaira.id,
      title: "Entrega de alimentos y agua",
      notes: "Atendimos a 35 familias del sector Las Tunitas.",
      when: "2026-06-26",
      items: [
        { name: "Arroz", qty: 40, unit: "kg" },
        { name: "Agua potable", qty: 80, unit: "litros" },
      ],
      photos: [photo("guaira-1"), photo("guaira-2")],
    },
    {
      frenteId: carayaca.id,
      title: "Jornada médica y medicinas",
      notes: "Entrega de medicinas básicas a la comunidad aislada.",
      when: "2026-06-27",
      items: [
        { name: "Antibióticos", qty: 8, unit: "cajas" },
        { name: "Acetaminofén", qty: 10, unit: "cajas" },
      ],
      photos: [photo("carayaca-1"), photo("carayaca-2"), photo("carayaca-3")],
    },
    {
      frenteId: guarenas.id,
      title: "Refugio: colchonetas y frazadas",
      notes: "Dotación para 40 familias en el refugio.",
      when: "2026-06-28",
      items: [
        { name: "Colchonetas", qty: 15, unit: "unidades" },
        { name: "Frazadas", qty: 30, unit: "unidades" },
      ],
      photos: [photo("guarenas-1"), photo("guarenas-2")],
    },
    {
      frenteId: maracaibo.id,
      title: "Higiene y agua para desplazados",
      notes: "Kits de higiene para familias del Sur del Lago.",
      when: "2026-06-28",
      items: [
        { name: "Jabón", qty: 60, unit: "unidades" },
        { name: "Cloro", qty: 20, unit: "litros" },
      ],
      photos: [photo("maracaibo-1")],
    },
    {
      frenteId: laGuaira.id,
      title: "Segunda entrega de víveres",
      notes: "Refuerzo de alimentos tras nuevas familias desplazadas.",
      when: "2026-06-29",
      items: [
        { name: "Aceite", qty: 30, unit: "litros" },
        { name: "Leche en polvo", qty: 20, unit: "kg" },
      ],
      photos: [photo("guaira-3"), photo("guaira-4")],
    },
  ];

  for (const e of entregas) {
    await prisma.delivery.create({
      data: {
        frenteId: e.frenteId,
        title: e.title,
        notes: e.notes,
        deliveredAt: new Date(e.when),
        items: {
          create: e.items.map((i) => ({
            description: i.name,
            quantity: D(i.qty),
            unit: i.unit,
            supplyId: supplies[i.name],
          })),
        },
        photos: { create: e.photos.map((url) => ({ url })) },
      },
    });
  }

  console.log("✅ Datos de demostración sembrados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
