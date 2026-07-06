import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBusinessUsers } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("getBusinessUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await getBusinessUsers("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await getBusinessUsers("b1");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("data fetching", () => {
    it("should return users with cashbox info for a business with users", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      const mockUsers = [
        {
          id: "u1",
          name: "Juan Pérez",
          email: "juan@test.com",
          role: "ADMIN",
          emailVerified: new Date("2024-01-15"),
          cashbox: { name: "Caja Principal" },
        },
        {
          id: "u2",
          name: "María García",
          email: "maria@test.com",
          role: "USER",
          emailVerified: new Date("2024-02-20"),
          cashbox: { name: "Caja 2" },
        },
      ];
      (db.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await getBusinessUsers("b1");
      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toMatchObject({
        name: "Juan Pérez",
        role: "ADMIN",
        cashbox: { name: "Caja Principal" },
      });
      expect(result.users[1]).toMatchObject({
        name: "María García",
        role: "USER",
        cashbox: { name: "Caja 2" },
      });
    });

    it("should return empty array for a business with no users", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.user.findMany as any).mockResolvedValue([]);

      const result = await getBusinessUsers("b1");
      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.users).toEqual([]);
    });

    it("should return empty array for a non-existent business", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.user.findMany as any).mockResolvedValue([]);

      const result = await getBusinessUsers("nonexistent");
      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.users).toEqual([]);
    });

    it("should handle users without cashbox assignment", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      const mockUsers = [
        {
          id: "u3",
          name: "Pedro López",
          email: "pedro@test.com",
          role: "USER",
          emailVerified: null,
          cashbox: null,
        },
      ];
      (db.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await getBusinessUsers("b1");
      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.users).toHaveLength(1);
      expect(result.users[0].cashbox).toBeNull();
      expect(result.users[0].emailVerified).toBeNull();
    });
  });
});
