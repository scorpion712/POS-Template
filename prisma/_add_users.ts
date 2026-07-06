/**
 * Agrega usuarios no-admin (USER) a los negocios que solo tienen ADMINs.
 * Ejecutar después de _dataset.ts.
 *
 * Uso: npx tsx prisma/_add_users.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

interface SecondUser {
  name: string;
  email: string;
  password: string;
}

const SECOND_USERS: Record<string, SecondUser> = {
  "Panadería El Trigal": {
    name: "Lucía Giménez",
    email: "lucia@eltrigal.com",
    password: "lucia123",
  },
  "Ferretería El Tornillo Feliz": {
    name: "Carlos Roldán",
    email: "carlos@tornillofeliz.com",
    password: "carlos123",
  },
  "Autopartes Martínez": {
    name: "Ana Martínez",
    email: "ana@autopartesmartinez.com",
    password: "ana123",
  },
  "EB Accesorios": {
    name: "Sofía Bustamante",
    email: "sofia@ebaccesorios.com",
    password: "sofia123",
  },
  "Carnicería Don Pedro": {
    name: "Micaela Quiroga",
    email: "micaela@donpedro.com",
    password: "mica123",
  },
  "Distribuidora del Sur": {
    name: "Jorge Méndez",
    email: "jorge@distribuidorasur.com",
    password: "jorge123",
  },
  GM: {
    name: "Lautaro Mariani",
    email: "lautaro@gm.com",
    password: "lautaro123",
  },
  "Librería y Papelera Progreso": {
    name: "Tomás Vega",
    email: "tomas@libreriaprogreso.com",
    password: "tomas123",
  },
};

async function main() {
  console.log("👥 Agregando usuarios no-admin...\n");

  for (const [businessName, user] of Object.entries(SECOND_USERS)) {
    const biz = await db.business.findFirst({ where: { name: businessName } });
    if (!biz) {
      console.warn(`  ⚠️  No se encontró el negocio "${businessName}"`);
      continue;
    }

    // Check if user already exists
    const existing = await db.user.findFirst({ where: { email: user.email } });
    if (existing) {
      console.log(`  ℹ️  ${user.name} ya existe en ${businessName}`);
      continue;
    }

    await db.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashPassword(user.password),
        role: "USER",
        businessId: biz.id,
      },
    });
    console.log(`  ✅ ${user.name} (USER) → ${businessName}`);
  }

  console.log("\n✅ Usuarios agregados correctamente.");

  // Show final state
  const businesses = await db.business.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      users: { select: { name: true, role: true } },
    },
  });

  console.log("\n📋 Estado final por negocio:");
  for (const b of businesses) {
    const admins = b.users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length;
    const users = b.users.filter((u) => u.role === "USER").length;
    console.log(`  ${b.name.padEnd(35)} | ${admins} admin(s) | ${users} user(s)`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
