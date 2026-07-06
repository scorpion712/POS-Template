/**
 * Dataset de prueba — genera datos realistas para demo.
 *
 * Propósito: Poblado único (no seed). Se ejecuta una vez contra la base
 * existente para transformar negocios placeholder en datos de demostración.
 *
 * Uso: npx tsx prisma/_dataset.ts
 *
 * Qué hace:
 *   1. Asigna Gastón Mariani como cliente/dueño de GM con plan PRO
 *   2. Renombra 6 negocios placeholder a nombres reales de distintos rubros
 *   3. Crea clientes (ADMIN) como dueños de cada negocio
 *   4. Asigna planes a cada uno
 *   5. Crea productos realistas para cada rubro
 *   6. Configura edge cases de pagos (moroso, atrasado, cerca de vencer, etc.)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

/** Fecha retrocediendo N días desde hoy */
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// /** Fecha adelantando N días desde hoy */
// function daysFromNow(n: number) {
//   const d = new Date();
//   d.setDate(d.getDate() + n);
//   return d;
// }

// ──────────────────────────────────────────────
// Plan Definitions (IDs from seed)
// ──────────────────────────────────────────────

interface PlanInfo {
  id: string;
  name: "BASIC" | "PRO" | "ENTERPRISE";
}

async function getPlans(): Promise<Record<string, PlanInfo>> {
  const plans = await db.planDefinition.findMany({ orderBy: { displayOrder: "asc" } });
  const map: Record<string, PlanInfo> = {};
  for (const p of plans) {
    map[p.name] = { id: p.id, name: p.name as PlanInfo["name"] };
  }
  return map;
}

// ──────────────────────────────────────────────
// Business definitions to transform
// ──────────────────────────────────────────────

interface BusinessTransform {
  currentSlugContains: string; // match existing business by slug contains
  newName: string;
  newSlug: string;
  rubro: string;
  planName: "BASIC" | "PRO" | "ENTERPRISE";
  clientName: string;
  clientEmail: string;
  edgeCase: "al_dia" | "atrasado" | "moroso" | "cerca_vencer" | "sin_pago" | "recien_creado";
  products: Array<{ name: string; salePrice: number; amount: number; costPrice?: number }>;
}

const TRANSFORMS: BusinessTransform[] = [
  {
    currentSlugContains: "tu-negocio",
    newName: "Panadería El Trigal",
    newSlug: "panaderia-el-trigal",
    rubro: "Panadería",
    planName: "BASIC",
    clientName: "Roberto Giménez",
    clientEmail: "roberto@eltrigal.com",
    edgeCase: "atrasado",
    products: [
      { name: "Pan francés (kg)", salePrice: 1200, amount: 50, costPrice: 400 },
      { name: "Pan de molde integral", salePrice: 2500, amount: 30, costPrice: 900 },
      { name: "Facturas surtidas (docena)", salePrice: 4200, amount: 20, costPrice: 1800 },
      { name: "Medialunas (docena)", salePrice: 3600, amount: 25, costPrice: 1500 },
      { name: "Bizcochos de grasa (kg)", salePrice: 2800, amount: 15, costPrice: 1100 },
      { name: "Torta de cumpleaños", salePrice: 15000, amount: 5, costPrice: 6000 },
      { name: "Pan de campo (kg)", salePrice: 1800, amount: 40, costPrice: 700 },
      { name: "Churros (docena)", salePrice: 3200, amount: 12, costPrice: 1300 },
    ],
  },
  {
    currentSlugContains: "mi-negocio",
    newName: "Ferretería El Tornillo Feliz",
    newSlug: "ferreteria-el-tornillo-feliz",
    rubro: "Ferretería",
    planName: "PRO",
    clientName: "Marcela Roldán",
    clientEmail: "marcela@tornillofeliz.com",
    edgeCase: "moroso",
    products: [
      { name: "Taladro percutor inalámbrico", salePrice: 85000, amount: 10, costPrice: 45000 },
      { name: "Juego de llaves combinadas 8-19mm", salePrice: 12500, amount: 25, costPrice: 6000 },
      { name: "Cinta métrica 5m", salePrice: 3200, amount: 50, costPrice: 1200 },
      { name: "Pintura látex interior 20L", salePrice: 45000, amount: 15, costPrice: 22000 },
      { name: "Tornillos autoperforantes 100u", salePrice: 2500, amount: 100, costPrice: 900 },
      { name: "Amoladora angular 4½\"", salePrice: 65000, amount: 8, costPrice: 32000 },
      { name: "Cable eléctrico 2,5mm x 100m", salePrice: 32000, amount: 12, costPrice: 18000 },
      { name: "Cerradura para puerta principal", salePrice: 18500, amount: 20, costPrice: 8500 },
      { name: "Nivel de burbuja 60cm", salePrice: 6800, amount: 30, costPrice: 2800 },
      { name: "Guantes de trabajo (par)", salePrice: 4500, amount: 60, costPrice: 1800 },
    ],
  },
  {
    currentSlugContains: "test-business",
    newName: "Autopartes Martínez",
    newSlug: "autopartes-martinez",
    rubro: "Repuestos Automotrices",
    planName: "ENTERPRISE",
    clientName: "Diego Martínez",
    clientEmail: "diego@autopartesmartinez.com",
    edgeCase: "al_dia",
    products: [
      { name: "Pastillas de freno delanteras", salePrice: 18000, amount: 40, costPrice: 8500 },
      { name: "Amortiguador delantero (par)", salePrice: 65000, amount: 15, costPrice: 32000 },
      { name: "Batería 70Ah", salePrice: 95000, amount: 20, costPrice: 52000 },
      { name: "Filtro de aceite universal", salePrice: 3500, amount: 100, costPrice: 1200 },
      { name: "Bujías (juego x4)", salePrice: 12000, amount: 50, costPrice: 5000 },
      { name: "Correa de distribución", salePrice: 25000, amount: 25, costPrice: 11000 },
      { name: "Kit de embrague completo", salePrice: 125000, amount: 8, costPrice: 65000 },
      { name: "Farol trasero izquierdo", salePrice: 22000, amount: 12, costPrice: 10000 },
      { name: "Aceite motor 20W50 (5L)", salePrice: 28000, amount: 60, costPrice: 14000 },
      { name: "Limpiaparabrisas (par)", salePrice: 8500, amount: 80, costPrice: 3500 },
    ],
  },
  {
    currentSlugContains: "aaaaa",
    newName: "Distribuidora del Sur",
    newSlug: "distribuidora-del-sur",
    rubro: "Distribuidora Mayorista",
    planName: "PRO",
    clientName: "Laura Méndez",
    clientEmail: "laura@distribuidorasur.com",
    edgeCase: "cerca_vencer",
    products: [
      { name: "Arroz 1kg (bolsa x20)", salePrice: 28000, amount: 200, costPrice: 16000 },
      { name: "Aceite mezcla 1,5L (caja x12)", salePrice: 45000, amount: 150, costPrice: 26000 },
      { name: "Harina 000 1kg (bolsa x25)", salePrice: 18000, amount: 300, costPrice: 9500 },
      { name: "Azúcar 1kg (bolsa x30)", salePrice: 22000, amount: 250, costPrice: 12000 },
      { name: "Fideos spaghetti 500g (caja x24)", salePrice: 36000, amount: 180, costPrice: 19000 },
      { name: "Yerba mate 1kg (paq x12)", salePrice: 32000, amount: 120, costPrice: 17000 },
      { name: "Leche larga vida 1L (caja x12)", salePrice: 28000, amount: 200, costPrice: 15000 },
      { name: "Galletitas dulces (kg)", salePrice: 4500, amount: 500, costPrice: 2200 },
      { name: "Gaseosa cola 2,25L (caja x6)", salePrice: 24000, amount: 100, costPrice: 13000 },
    ],
  },
  {
    currentSlugContains: "nna",
    newName: "Librería y Papelera Progreso",
    newSlug: "libreria-progreso",
    rubro: "Librería y Papelería",
    planName: "BASIC",
    clientName: "Sofía Vega",
    clientEmail: "sofia@libreriaprogreso.com",
    edgeCase: "sin_pago",
    products: [
      { name: "Cuaderno tapa dura A4 x48 hojas", salePrice: 4800, amount: 80, costPrice: 2000 },
      { name: "Bolígrafo azul (caja x50)", salePrice: 15000, amount: 30, costPrice: 7000 },
      { name: "Resma papel A4 80g (500 hojas)", salePrice: 8500, amount: 100, costPrice: 4000 },
      { name: "Marcador permanente negro (caja x12)", salePrice: 9500, amount: 40, costPrice: 4500 },
      { name: "Cinta adhesiva transparente 12mm x 50m", salePrice: 1200, amount: 200, costPrice: 450 },
      { name: "Tijera escolar 17cm", salePrice: 3500, amount: 60, costPrice: 1400 },
      { name: "Goma de borrar (caja x24)", salePrice: 6000, amount: 25, costPrice: 2500 },
      { name: "Lápiz negro HB (caja x12)", salePrice: 4500, amount: 50, costPrice: 1800 },
    ],
  },
  {
    currentSlugContains: "pruebabussines",
    newName: "Carnicería Don Pedro",
    newSlug: "carniceria-don-pedro",
    rubro: "Carnicería",
    planName: "BASIC",
    clientName: "Pedro Quiroga",
    clientEmail: "pedro@donpedro.com",
    edgeCase: "recien_creado",
    products: [
      { name: "Asado (kg)", salePrice: 8500, amount: 30, costPrice: 4500 },
      { name: "Vacío (kg)", salePrice: 9500, amount: 25, costPrice: 5000 },
      { name: "Matambre (kg)", salePrice: 8000, amount: 20, costPrice: 4200 },
      { name: "Milanesa de nalga (kg)", salePrice: 7500, amount: 15, costPrice: 4000 },
      { name: "Carne picada común (kg)", salePrice: 5500, amount: 40, costPrice: 2800 },
      { name: "Pollo entero (kg)", salePrice: 3800, amount: 35, costPrice: 1800 },
      { name: "Chorizo (kg)", salePrice: 6000, amount: 25, costPrice: 3000 },
      { name: "Morcilla (kg)", salePrice: 4500, amount: 20, costPrice: 2200 },
    ],
  },
];

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  console.log("🏪 Generando dataset de demostración...\n");

  const plans = await getPlans();
  console.log(`📋 Planes disponibles: ${Object.keys(plans).join(", ")}`);

  // ── STEP 1: Asignar Gastón Mariani a GM ──────────────────

  const gmBusiness = await db.business.findFirst({ where: { slug: { contains: "gm" } } });
  if (!gmBusiness) {
    console.warn("⚠️  No se encontró negocio GM. Saltando...");
  } else {
    console.log(`\n📌 Paso 1: Asignando cliente a GM (${gmBusiness.id})`);

    // Check if user already exists
    let gmUser = await db.user.findFirst({ where: { email: "gaston@gm.com" } });
    if (!gmUser) {
      gmUser = await db.user.create({
        data: {
          name: "Gastón Mariani",
          email: "gaston@gm.com",
          password: hashPassword("gaston123"),
          role: "ADMIN",
          businessId: gmBusiness.id,
        },
      });
      console.log(`  ✅ Creado usuario: Gastón Mariani (${gmUser.id})`);
    } else {
      console.log(`  ℹ️  Usuario ya existe`);
    }

    // Set as business owner
    await db.business.update({
      where: { id: gmBusiness.id },
      data: { userId: gmUser.id, name: "GM" },
    });

    // Assign PRO plan
    const proPlan = await db.planDefinition.findFirst({ where: { name: "PRO" } });
    if (proPlan) {
      await db.business.update({
        where: { id: gmBusiness.id },
        data: { planDefinitionId: proPlan.id },
      });
    }

    console.log(`  ✅ GM asignado a Gastón Mariani con plan PRO`);
  }

  // ── STEP 2: Transformar negocios placeholder ──────────────

  console.log(`\n📌 Paso 2: Transformando ${TRANSFORMS.length} negocios...`);

  for (const t of TRANSFORMS) {
    console.log(`\n  ▶️  ${t.currentSlugContains} → ${t.newName} (${t.rubro})`);

    // Find existing business by slug (old or new) or by current name
    const biz = await db.business.findFirst({
      where: {
        OR: [
          { slug: { contains: t.currentSlugContains } },
          { slug: t.newSlug },
          { name: t.newName },
          { name: { contains: t.currentSlugContains.replace(/-/g, " ") } },
        ],
      },
      include: { users: true },
    });

    if (!biz) {
      console.warn(`  ⚠️  No encontrado. Saltando...`);
      continue;
    }

    // 1. Create client user (as ADMIN, owner)
    const existingUser = await db.user.findFirst({ where: { email: t.clientEmail } });
    let newUser;
    if (existingUser) {
      newUser = existingUser;
      console.log(`  ℹ️  Usuario ya existe: ${t.clientName}`);
    } else {
      newUser = await db.user.create({
        data: {
          name: t.clientName,
          email: t.clientEmail,
          password: hashPassword(t.clientEmail.split("@")[0] + "123"),
          role: "ADMIN",
          businessId: biz.id,
        },
      });
      console.log(`  ✅ Cliente creado: ${t.clientName} (${newUser.id})`);
    }

    // 2. Update business name + slug + set as owner
    const updateData: Record<string, unknown> = {
      name: t.newName,
      slug: t.newSlug,
      userId: newUser.id,
    };

    // 3. Set payment edge cases
    switch (t.edgeCase) {
      case "al_dia":
        updateData.lastPaymentDate = daysAgo(5);
        updateData.accountStatus = "ACTIVO";
        break;
      case "atrasado":
        updateData.lastPaymentDate = daysAgo(35); // 35 days ago → late
        updateData.accountStatus = "ACTIVO";
        break;
      case "moroso":
        updateData.lastPaymentDate = daysAgo(75); // 75 days ago → moroso
        updateData.accountStatus = "MOROSO";
        break;
      case "cerca_vencer":
        updateData.lastPaymentDate = daysAgo(28); // 28 days ago → about to expire (30-day cycle)
        updateData.accountStatus = "ACTIVO";
        break;
      case "sin_pago":
        updateData.lastPaymentDate = null;
        updateData.accountStatus = "ACTIVO";
        break;
      case "recien_creado":
        updateData.lastPaymentDate = daysAgo(2); // just paid 2 days ago
        updateData.accountStatus = "ACTIVO";
        break;
    }

    await db.business.update({ where: { id: biz.id }, data: updateData });
    console.log(`  ✅ Negocio actualizado: ${t.newName} (edge: ${t.edgeCase})`);

    // 4. Assign PlanDefinition to Business
    const p = plans[t.planName];
    if (!p) {
      console.warn(`  ⚠️  Plan ${t.planName} no encontrado en DB`);
    } else {
      await db.business.update({
        where: { id: biz.id },
        data: { planDefinitionId: p.id },
      });
      console.log(`  ✅ Plan asignado: ${p.name}`);
    }

    // 5. Delete all existing products first (clean slate)
    await db.product.deleteMany({ where: { businessId: biz.id } });

    // 6. Create products for this business
    for (const prod of t.products) {
      const costPrice = prod.costPrice ?? Math.round(prod.salePrice * 0.45);
      await db.product.create({
        data: {
          description: prod.name,
          salePrice: prod.salePrice,
          price: costPrice,
          amount: prod.amount,
          gain: prod.salePrice - costPrice,
          businessId: biz.id,
          catalog: true,
        },
      });
    }
    console.log(`  ✅ ${t.products.length} productos creados`);
  }

  // ── STEP 3: Resumen final ─────────────────────────────────

  console.log("\n═══════════════════════════════════════");
  console.log("✅ Dataset generado correctamente!");
  console.log("═══════════════════════════════════════\n");

  const summary = await db.business.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      slug: true,
      accountStatus: true,
      lastPaymentDate: true,
      userId: true,
      _count: { select: { products: true } },
    },
  });

  for (const b of summary) {
    const owner = b.userId
      ? await db.user.findUnique({ where: { id: b.userId }, select: { name: true } })
      : null;
    const daysSinceLastPayment = b.lastPaymentDate
      ? Math.round((Date.now() - b.lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    console.log(
      `  ${b.name.padEnd(35)} | ${b.accountStatus.padEnd(10)} | ` +
        `dueño: ${(owner?.name ?? "—").padEnd(20)} | ` +
        `últ. pago: ${daysSinceLastPayment !== null ? `${daysSinceLastPayment}d` : "—".padEnd(4)} | ` +
        `${b._count.products} productos`,
    );
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
