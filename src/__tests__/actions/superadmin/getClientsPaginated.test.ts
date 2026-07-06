import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientsPaginated } from "@/actions/superadmin";

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

describe("getClientsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getClientsPaginated({ page: 1 });
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if user is not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await getClientsPaginated({ page: 1 });
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("data fetching", () => {
    it("should return paginated clients without filters", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([
        { id: "b1", name: "Business 1", slug: "b1", userId: "u1", accountStatus: "ACTIVO", createdAt: new Date(), users: [{ id: "u1", name: "Owner", email: "owner@test.com" }], features: { plan: "PRO" } },
      ]);
      (db.business.count as any).mockResolvedValue(1);

      const result = await getClientsPaginated({ page: 1 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.clients).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(1);
    });

    it("should filter by search term", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([]);
      (db.business.count as any).mockResolvedValue(0);

      await getClientsPaginated({ page: 1, search: "test@test.com" });

      expect(db.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: null },
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

      await getClientsPaginated({ page: 1, status: "MOROSO" });

      expect(db.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountStatus: "MOROSO",
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

      const result = await getClientsPaginated({ page: 1 });
      expect("error" in result).toBe(false);
      const data = (result as any).success;
      expect(data.clients).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it("should handle search with special characters", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findMany as any).mockResolvedValue([]);
      (db.business.count as any).mockResolvedValue(0);

      await getClientsPaginated({ page: 1, search: "ñoñería & <script>" });

      expect(db.business.findMany).toHaveBeenCalled();
    });
  });
});
