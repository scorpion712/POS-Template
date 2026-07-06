import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientDetail } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("getClientDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getClientDetail("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "USER" } });

      const result = await getClientDetail("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("data fetching", () => {
    it("should return error if business not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const { db } = await import("@/lib/db");
      (db.business.findUnique as any).mockResolvedValue(null);

      const result = await getClientDetail("nonexistent");
      expect("error" in result).toBe(true);
    });

    it("should return full client detail on happy path", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const { db } = await import("@/lib/db");

      const mockBusiness = {
        id: "b1",
        name: "Test Business",
        slug: "test",
        userId: "u1",
        accountStatus: "ACTIVO",
        lastPaymentDate: new Date("2026-06-01"),
        createdAt: new Date("2026-01-01"),
        cuit: "20123456789",
        condicionIva: "RESPONSABLE_INSCRIPTO",
        users: [{ id: "u1", name: "Owner", email: "owner@test.com" }],
        features: { plan: "PRO" },
        payments: [
          { id: "p1", amount: 5000, method: "TRANSFERENCIA", paidAt: new Date("2026-06-01"), reference: "REF001", notes: "Pago junio", recordedBy: "sa1" },
        ],
        _count: { products: 10, orders: 50 },
      };

      (db.business.findUnique as any).mockResolvedValue(mockBusiness);

      const result = await getClientDetail("b1");
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.business.id).toBe("b1");
      expect(data.owner?.email).toBe("owner@test.com");
      expect(data.features?.plan).toBe("PRO");
      expect(data.recentPayments).toHaveLength(1);
      expect(data.businessStats.products).toBe(10);
      expect(data.businessStats.orders).toBe(50);
    });

    it("should handle business without owner gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const { db } = await import("@/lib/db");

      (db.business.findUnique as any).mockResolvedValue({
        id: "b2", name: "No Owner", slug: "no-owner", userId: null, accountStatus: "ACTIVO",
        createdAt: new Date(), cuit: null, condicionIva: null,
        users: [], features: null, payments: [],
        _count: { products: 0, orders: 0 },
      });

      const result = await getClientDetail("b2");
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.owner).toBeNull();
      expect(data.features).toBeNull();
      expect(data.recentPayments).toHaveLength(0);
    });
  });
});
