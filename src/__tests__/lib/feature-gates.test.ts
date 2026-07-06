import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireFeature, FeatureNotEnabledError } from "@/lib/feature-gates";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findUnique: vi.fn(),
    },
  },
}));

describe("requireFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not throw when feature exists and is enabled", async () => {
    const { db } = await import("@/lib/db");
    (db.business.findUnique as any).mockResolvedValue({
      id: "b1",
      trialEndsAt: null,
      planDefinition: {
        name: "PRO",
        features: { hasAfipBilling: true },
        limits: {},
      },
    });

    await expect(
      requireFeature("b1", "afip-billing"),
    ).resolves.toBeUndefined();
  });

  it("should throw FeatureNotEnabledError when feature exists but is disabled", async () => {
    const { db } = await import("@/lib/db");
    (db.business.findUnique as any).mockResolvedValue({
      id: "b2",
      trialEndsAt: null,
      planDefinition: {
        name: "BASIC",
        features: { hasPublicCatalog: false },
        limits: {},
      },
    });

    await expect(
      requireFeature("b2", "public-catalog"),
    ).rejects.toThrow(FeatureNotEnabledError);
  });

  it("should throw FeatureNotEnabledError when business has no plan", async () => {
    const { db } = await import("@/lib/db");
    (db.business.findUnique as any).mockResolvedValue({
      id: "b3",
      trialEndsAt: null,
      planDefinition: null,
    });

    await expect(
      requireFeature("b3", "client-ledger"),
    ).rejects.toThrow(FeatureNotEnabledError);
  });

  it("should throw Error for invalid feature string", async () => {
    await expect(
      (requireFeature as any)("b1", "invalid-feature"),
    ).rejects.toThrow("Feature desconocido");
  });

  it("should throw FeatureNotEnabledError for non-existent businessId", async () => {
    const { db } = await import("@/lib/db");
    (db.business.findUnique as any).mockResolvedValue(null);

    await expect(
      requireFeature("nonexistent", "multi-cashbox"),
    ).rejects.toThrow(FeatureNotEnabledError);
  });
});
