import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteBusinessSafe } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

describe("deleteBusinessSafe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await deleteBusinessSafe("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "USER" } });

      const result = await deleteBusinessSafe("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("without confirmation", () => {
    it("should return counts of associated data", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findUnique as any).mockResolvedValue({
        id: "b1",
        name: "Test Business",
        _count: { products: 15, orders: 42 },
      });

      const result = await deleteBusinessSafe("b1");
      expect("error" in result).toBe(false);
      const warning = (result as any).warning;
      expect(warning.products).toBe(15);
      expect(warning.orders).toBe(42);
      expect(warning.name).toBe("Test Business");
      expect(db.business.delete).not.toHaveBeenCalled();
    });

    it("should return error if business not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findUnique as any).mockResolvedValue(null);

      const result = await deleteBusinessSafe("nonexistent");
      expect("error" in result).toBe(true);
      expect(db.business.delete).not.toHaveBeenCalled();
    });
  });

  describe("with confirmation", () => {
    it("should delete business when confirmed", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findUnique as any).mockResolvedValue({
        id: "b1", _count: { products: 5, orders: 10 },
      });
      (db.business.delete as any).mockResolvedValue({ id: "b1" });

      const result = await deleteBusinessSafe("b1", true);
      expect("error" in result).toBe(false);
      expect((result as any).success).toBe("Negocio eliminado");
      expect(db.business.delete).toHaveBeenCalledWith({ where: { id: "b1" } });
    });

    it("should handle database error on delete", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.business.findUnique as any).mockResolvedValue({
        id: "b1", _count: { products: 5, orders: 10 },
      });
      (db.business.delete as any).mockRejectedValue(new Error("DB error"));

      const result = await deleteBusinessSafe("b1", true);
      expect("error" in result).toBe(true);
    });
  });
});
