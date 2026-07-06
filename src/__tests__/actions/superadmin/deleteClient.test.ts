import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientDeleteInfo, deleteClient } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  business: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  subscriptionPayment: { count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/superadmin-log", () => ({
  logSuperadminAction: vi.fn(),
}));

describe("getClientDeleteInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getClientDeleteInfo("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("happy path", () => {
    it("should return counts of associated data", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      mockDb.business.findUnique.mockResolvedValue({
        id: "b1",
        name: "Test Business",
        _count: { products: 10, orders: 25 },
      });
      mockDb.subscriptionPayment.count.mockResolvedValue(5);

      const result = await getClientDeleteInfo("b1");

      expect("error" in result).toBe(false);
      const info = (result as any).success;
      expect(info.products).toBe(10);
      expect(info.orders).toBe(25);
      expect(info.payments).toBe(5);
      expect(info.businessName).toBe("Test Business");
    });

    it("should return error if business not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      mockDb.business.findUnique.mockResolvedValue(null);

      const result = await getClientDeleteInfo("nonexistent");
      expect("error" in result).toBe(true);
    });
  });
});

describe("deleteClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await deleteClient("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("happy path", () => {
    it("should delete business and cascade", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue({
        id: "b1",
        name: "Test Business",
      });
      mockDb.business.delete.mockResolvedValue({ id: "b1" });

      const result = await deleteClient("b1");

      expect("error" in result).toBe(false);
      expect(mockDb.business.delete).toHaveBeenCalledWith({
        where: { id: "b1" },
      });
    });

    it("should return error if business not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue(null);

      const result = await deleteClient("nonexistent");
      expect("error" in result).toBe(true);
      expect(mockDb.business.delete).not.toHaveBeenCalled();
    });

    it("should handle database error", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue({
        id: "b1",
        name: "Test Business",
      });
      mockDb.business.delete.mockRejectedValue(new Error("DB Error"));

      const result = await deleteClient("b1");
      expect("error" in result).toBe(true);
    });
  });
});
