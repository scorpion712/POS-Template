import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateClient } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  business: { findUnique: vi.fn() },
  user: { update: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/superadmin-log", () => ({
  logSuperadminAction: vi.fn(),
}));

describe("updateClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await updateClient("b1", { name: "New Name" });
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await updateClient("b1", { name: "New Name" });
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("validation", () => {
    it("should reject empty name", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const result = await updateClient("b1", { name: "" });
      expect("error" in result).toBe(true);
    });
  });

  describe("happy path", () => {
    it("should update user name when business has an owner", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue({
        id: "b1",
        userId: "user1",
      });
      mockDb.user.update.mockResolvedValue({ id: "user1", name: "New Name" });

      const result = await updateClient("b1", { name: "New Name" });

      expect("error" in result).toBe(false);
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: { name: "New Name" },
      });
    });

    it("should return error if business not found", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue(null);

      const result = await updateClient("b1", { name: "New Name" });
      expect("error" in result).toBe(true);
    });

    it("should return error if business has no owner", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.business.findUnique.mockResolvedValue({
        id: "b1",
        userId: null,
      });

      const result = await updateClient("b1", { name: "New Name" });
      expect("error" in result).toBe(true);
    });
  });
});
