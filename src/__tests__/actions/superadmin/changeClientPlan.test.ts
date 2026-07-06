import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeClientPlan } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/db", () => ({
  db: {
    planDefinition: {
      findFirst: vi.fn(),
    },
    business: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("changeClientPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await changeClientPlan("b1", "PRO");
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "USER" } });

      const result = await changeClientPlan("b1", "PRO");
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("validation", () => {
    it("should reject invalid plan value", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
      const { db } = await import("@/lib/db");
      (db.planDefinition.findFirst as any).mockResolvedValue(null);

      const result = await changeClientPlan("b1", "ULTRA" as any);
      expect("error" in result).toBe(true);
    });
  });

  describe("happy path", () => {
    it("should update business with planDefinitionId", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.planDefinition.findFirst as any).mockResolvedValue({ id: "pro-plan-id", name: "PRO" });
      (db.business.update as any).mockResolvedValue({ id: "b1" });

      const result = await changeClientPlan("b1", "PRO");

      expect("error" in result).toBe(false);
      expect(db.planDefinition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: "PRO" } })
      );
      expect(db.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b1" },
          data: { planDefinitionId: "pro-plan-id" },
        })
      );
    });

    it("should work when changing from BASIC to ENTERPRISE", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.planDefinition.findFirst as any).mockResolvedValue({ id: "ent-plan-id", name: "ENTERPRISE" });
      (db.business.update as any).mockResolvedValue({ id: "b1" });

      const result = await changeClientPlan("b1", "ENTERPRISE");

      expect("error" in result).toBe(false);
      expect(db.planDefinition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: "ENTERPRISE" } })
      );
      expect(db.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { planDefinitionId: "ent-plan-id" },
        })
      );
    });

    it("should handle database error gracefully", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.planDefinition.findFirst as any).mockRejectedValue(new Error("DB error"));

      const result = await changeClientPlan("b1", "PRO");
      expect("error" in result).toBe(true);
    });
  });
});
