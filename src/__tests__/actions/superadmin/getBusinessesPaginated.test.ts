import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBusinessesPaginated } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("getBusinessesPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getBusinessesPaginated({ page: 1 });
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await getBusinessesPaginated({ page: 1 });
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("data fetching", () => {
    it("should return paginated businesses on happy path", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      const mockBusinesses = [
        {
          id: "b1", name: "Business 1", slug: "b1", accountStatus: "ACTIVO",
          lastPaymentDate: new Date(), createdAt: new Date(), userId: "u1",
          users: [{ id: "u1", name: "Owner", email: "owner@test.com" }],
          features: { plan: "PRO" },
          _count: { products: 10, orders: 5 },
        },
      ];
      (db.business.findMany as any).mockResolvedValue(mockBusinesses);
      (db.business.count as any).mockResolvedValue(1);

      const result = await getBusinessesPaginated({ page: 1 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.businesses).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(1);
      expect(data.businesses[0]._count.products).toBe(10);
      expect(data.businesses[0]._count.orders).toBe(5);
    });

    it("should filter by search term (name)", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([]);
      (db.business.count as any).mockResolvedValue(0);

      await getBusinessesPaginated({ page: 1, search: "Test Business" });

      expect(db.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: "Test Business", mode: "insensitive" } }),
            ]),
          }),
        })
      );
    });

    it("should filter by account status", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([]);
      (db.business.count as any).mockResolvedValue(0);

      await getBusinessesPaginated({ page: 1, status: "DESACTIVADO" });

      expect(db.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountStatus: "DESACTIVADO",
          }),
        })
      );
    });

    it("should handle empty results gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([]);
      (db.business.count as any).mockResolvedValue(0);

      const result = await getBusinessesPaginated({ page: 1 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.businesses).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it("should handle business without owner gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      const mockBusinesses = [
        {
          id: "b2", name: "No Owner", slug: "no-owner", accountStatus: "ACTIVO",
          lastPaymentDate: null, createdAt: new Date(), userId: null,
          users: [], features: null,
          _count: { products: 0, orders: 0 },
        },
      ];
      (db.business.findMany as any).mockResolvedValue(mockBusinesses);
      (db.business.count as any).mockResolvedValue(1);

      const result = await getBusinessesPaginated({ page: 1 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.businesses[0].userId).toBeNull();
    });

    it("should handle pagination correctly", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      const businesses = Array.from({ length: 10 }, (_, i) => ({
        id: `b${i}`, name: `Business ${i}`, slug: `b${i}`, accountStatus: "ACTIVO",
        lastPaymentDate: null, createdAt: new Date(), userId: null,
        users: [], features: null,
        _count: { products: 0, orders: 0 },
      }));
      (db.business.findMany as any).mockResolvedValue(businesses);
      (db.business.count as any).mockResolvedValue(25);

      const result = await getBusinessesPaginated({ page: 2 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.page).toBe(2);
      expect(data.totalPages).toBe(3); // 25 / 10 = 2.5 → ceil 3
      expect(db.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });
});
