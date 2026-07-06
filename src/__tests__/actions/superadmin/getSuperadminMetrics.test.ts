import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSuperadminMetrics } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    planDefinition: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("getSuperadminMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getSuperadminMetrics();
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if user is not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await getSuperadminMetrics();
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if user role is USER", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "USER" } });

      const result = await getSuperadminMetrics();
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("metrics calculation", () => {
    it("should return correct metrics on happy path", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");

      // Mock business.count for totals
      (db.business.count as any).mockImplementation(async (args: any) => {
        if (!args?.where) return 10; // total businesses
        if (args.where.accountStatus === "ACTIVO") return 6;
        if (args.where.accountStatus === "MOROSO") return 3;
        if (args.where.accountStatus === "DESACTIVADO") return 1;
        if (args.where.userId?.not === null) return 8; // clients
        return 0;
      });

      // Mock plan definitions
      (db.planDefinition.findMany as any).mockResolvedValue([
        { id: "p1", name: "BASIC" },
        { id: "p2", name: "PRO" },
        { id: "p3", name: "ENTERPRISE" },
      ]);

      // Mock plan distribution via business.groupBy
      (db.business.groupBy as any).mockResolvedValue([
        { planDefinitionId: "p1", _count: { planDefinitionId: 5 } },
        { planDefinitionId: "p2", _count: { planDefinitionId: 3 } },
        { planDefinitionId: "p3", _count: { planDefinitionId: 2 } },
      ]);

      // Mock recent businesses
      (db.business.findMany as any).mockImplementation(async (args: any) => {
        if (args.orderBy?.createdAt === "desc" && !args.where?.userId) {
          return [
            { id: "b1", name: "Business 1", slug: "b1", accountStatus: "ACTIVO", createdAt: new Date("2026-06-20"), userId: "u1" },
            { id: "b2", name: "Business 2", slug: "b2", accountStatus: "ACTIVO", createdAt: new Date("2026-06-19"), userId: "u2" },
            { id: "b3", name: "Business 3", slug: "b3", accountStatus: "MOROSO", createdAt: new Date("2026-06-18"), userId: null },
          ];
        }
        if (args.where?.userId?.not === null) {
          return [
            { id: "b4", name: "Client Business 1", slug: "cb1", accountStatus: "ACTIVO", createdAt: new Date("2026-06-21"), userId: "u4" },
            { id: "b5", name: "Client Business 2", slug: "cb2", accountStatus: "ACTIVO", createdAt: new Date("2026-06-20"), userId: "u5" },
          ];
        }
        return [];
      });

      const result = await getSuperadminMetrics();

      expect((result as any).error).toBeUndefined();
      const data = (result as any).success;
      expect(data.totalBusinesses).toBe(10);
      expect(data.activeBusinesses).toBe(6);
      expect(data.morosoBusinesses).toBe(3);
      expect(data.desactivadoBusinesses).toBe(1);
      expect(data.totalClients).toBe(8);
      expect(data.planDistribution).toEqual({
        BASIC: 5,
        PRO: 3,
        ENTERPRISE: 2,
      });
      expect(data.recentBusinesses).toHaveLength(3);
      expect(data.recentClients).toHaveLength(2);
    });

    it("should handle zero businesses gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.count as any).mockResolvedValue(0);
      (db.planDefinition.findMany as any).mockResolvedValue([]);
      (db.business.groupBy as any).mockResolvedValue([]);
      (db.business.findMany as any).mockResolvedValue([]);

      const result = await getSuperadminMetrics();

      expect((result as any).error).toBeUndefined();
      const data = (result as any).success;
      expect(data.totalBusinesses).toBe(0);
      expect(data.activeBusinesses).toBe(0);
      expect(data.morosoBusinesses).toBe(0);
      expect(data.desactivadoBusinesses).toBe(0);
      expect(data.totalClients).toBe(0);
      expect(data.planDistribution).toEqual({});
      expect(data.recentBusinesses).toHaveLength(0);
      expect(data.recentClients).toHaveLength(0);
    });

    it("should handle database error gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.count as any).mockRejectedValue(new Error("DB connection error"));

      const result = await getSuperadminMetrics();

      expect((result as any).success).toBeUndefined();
      expect((result as any).error).toBeDefined();
    });
  });
});
