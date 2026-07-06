/**
 * verify-plan-backfill.mjs — Ad-hoc verification script
 * 
 * Reads the 5 BusinessFeatures rows and their linked PlanDefinition,
 * recomputes ResolvedFeatures via the same logic as plan-resolver.ts,
 * and asserts they match expected post-migration values.
 * 
 * Usage: node .agents/local/verify-plan-backfill.mjs
 * Requires: DATABASE_URL in .env
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Expected features per business (pre-migration column values)
// Format: businessId → expected effective plan features
const EXPECTED = {
  // BASIC with hasPublicCatalog override
  "cmo97af0x0000lg0aob15d67n": {
    plan: "BASIC",
    hasAfipBilling: false,
    hasPublicCatalog: true,
    hasClientLedger: false,
    hasMultiCashbox: false,
    hasSupplierFilter: false,
    hasBudget: false,
    hasNegativeStock: false,
    maxUsers: 1,
    maxProducts: 100,
    maxCashboxes: 1,
    maxClients: 50,
    dailySalesLimit: 999999,
    dailyProductsLimit: 999999,
    dailyClientsLimit: 999999,
  },
  // BASIC with hasPublicCatalog override
  "cmorixy360000jr0ay0nl87uc": {
    plan: "BASIC",
    hasAfipBilling: false,
    hasPublicCatalog: true,
    hasClientLedger: false,
    hasMultiCashbox: false,
    hasSupplierFilter: false,
    hasBudget: false,
    hasNegativeStock: false,
    maxUsers: 1,
    maxProducts: 100,
    maxCashboxes: 1,
    maxClients: 50,
    dailySalesLimit: 999999,
    dailyProductsLimit: 999999,
    dailyClientsLimit: 999999,
  },
  // ENTERPRISE with custom overrides
  "cmmme8vgx0004u5e4t5f1pecm": {
    plan: "ENTERPRISE",
    hasAfipBilling: true,
    hasPublicCatalog: true,
    hasClientLedger: false,
    hasMultiCashbox: true,
    hasSupplierFilter: false,
    hasBudget: true,
    hasNegativeStock: true,
    maxUsers: 999,
    maxProducts: 99999,
    maxCashboxes: 999999,
    maxClients: 999999,
    dailySalesLimit: 999999,
    dailyProductsLimit: 999999,
    dailyClientsLimit: 999999,
  },
  // ENTERPRISE with custom overrides
  "cmpnoh05v0001u53k8zzs1vyw": {
    plan: "ENTERPRISE",
    hasAfipBilling: true,
    hasPublicCatalog: true,
    hasClientLedger: true,
    hasMultiCashbox: true,
    hasSupplierFilter: false,
    hasBudget: true,
    hasNegativeStock: true,
    maxUsers: 20,
    maxProducts: 30000,
    maxCashboxes: 999999,
    maxClients: 999999,
    dailySalesLimit: 999999,
    dailyProductsLimit: 999999,
    dailyClientsLimit: 999999,
  },
  // PRO with custom overrides
  "cmq2esesr0000jq0anpiq0izz": {
    plan: "PRO",
    hasAfipBilling: true,
    hasPublicCatalog: false,
    hasClientLedger: true,
    hasMultiCashbox: true,
    hasSupplierFilter: true,
    hasBudget: true,
    hasNegativeStock: false,
    maxUsers: 5,
    maxProducts: 109999,
    maxCashboxes: 3,
    maxClients: 500,
    dailySalesLimit: 999999,
    dailyProductsLimit: 999999,
    dailyClientsLimit: 999999,
  },
};

// The resolveFeatures logic (mirrors src/lib/plan-resolver.ts)
function resolveFeatures(planDef, overrides) {
  const merged = {};
  // Merge features first
  for (const [key, value] of Object.entries(planDef.features)) {
    merged[key] = value;
  }
  // Then limits (same shape, just numeric)
  for (const [key, value] of Object.entries(planDef.limits)) {
    merged[key] = value;
  }
  // Apply overrides on top
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (key in merged) {
        merged[key] = value;
      }
    }
  }
  merged.plan = planDef.name;
  return merged;
}

async function main() {
  const businesses = await db.businessFeatures.findMany({
    include: {
      planDefinition: true,
    },
  });

  let passed = 0;
  let failed = 0;

  for (const bf of businesses) {
    const bizId = bf.businessId;
    const expected = EXPECTED[bizId];

    if (!expected) {
      console.error(`❌ Business ${bizId}: no expected values defined`);
      failed++;
      continue;
    }

    const resolved = resolveFeatures(bf.planDefinition, bf.overrides);

    let ok = true;
    const diffs = [];
    
    for (const [key, expectedVal] of Object.entries(expected)) {
      const actualVal = resolved[key];
      if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
        ok = false;
        diffs.push(`  ${key}: expected ${JSON.stringify(expectedVal)}, got ${JSON.stringify(actualVal)}`);
      }
    }

    if (ok) {
      console.log(`✅ ${bizId} → ${bf.planDefinition.name}: all ${Object.keys(expected).length} fields match`);
      passed++;
    } else {
      console.error(`❌ ${bizId} → ${bf.planDefinition.name}: MISMATCH`);
      diffs.forEach(d => console.error(d));
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
