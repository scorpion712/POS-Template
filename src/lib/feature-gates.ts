/**
 * Feature Gates — Enforcement de plan features en backend.
 *
 * Los feature flags del UI ocultan/muestran elementos, pero no protegen
 * las Server Actions. Este helper valida en backend que el feature
 * esté habilitado según el plan del negocio antes de ejecutar la operación.
 *
 * Usa plan-resolver (PlanDefinition con JSON features/limits) como SSOT.
 *
 * Uso:
 *   await requireFeature(businessId, "afip-billing");
 *
 * Si el feature no está habilitado → lanza FeatureNotEnabledError
 * Si está habilitado → no hace nada (continúa)
 */

import type { ResolvedFeatures } from "@/types/plan";
import { getEffectivePlan } from "@/lib/plan-resolver";

export type Feature =
  | "afip-billing"
  | "public-catalog"
  | "client-ledger"
  | "multi-cashbox"
  | "supplier-filter";

export class FeatureNotEnabledError extends Error {
  constructor(feature: Feature) {
    super(`Feature no habilitado: ${feature}`);
    this.name = "FeatureNotEnabledError";
  }
}

/**
 * Mapa de feature keys (usadas en UI/routing) a nombres de campos en ResolvedFeatures.
 */
const FEATURE_MAP: Record<Feature, keyof ResolvedFeatures> = {
  "afip-billing": "hasAfipBilling",
  "public-catalog": "hasPublicCatalog",
  "client-ledger": "hasClientLedger",
  "multi-cashbox": "hasMultiCashbox",
  "supplier-filter": "hasSupplierFilter",
};

/**
 * Verifica que el negocio tenga el feature habilitado según su plan.
 *
 * @throws FeatureNotEnabledError si el feature no está habilitado
 * @throws Error si el feature string no es válido
 */
export async function requireFeature(
  businessId: string,
  feature: Feature,
): Promise<void> {
  const field = FEATURE_MAP[feature];

  if (!field) {
    throw new Error(`Feature desconocido: ${feature}`);
  }

  const plan = await getEffectivePlan(businessId);
  const isEnabled = plan[field as keyof typeof plan];

  if (!isEnabled) {
    throw new FeatureNotEnabledError(feature);
  }
}
