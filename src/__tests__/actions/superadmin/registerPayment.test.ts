import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPayment } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    subscriptionPayment: {
      create: vi.fn(),
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

describe("registerPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await registerPayment("b1", { amount: 5000, method: "TRANSFERENCIA" });
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "ADMIN" } });

      const result = await registerPayment("b1", { amount: 5000, method: "TRANSFERENCIA" });
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("validation", () => {
    it("should reject negative amount", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const result = await registerPayment("b1", { amount: -100, method: "EFECTIVO" });
      expect("error" in result).toBe(true);
    });

    it("should reject zero amount", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const result = await registerPayment("b1", { amount: 0, method: "EFECTIVO" });
      expect("error" in result).toBe(true);
    });

    it("should reject invalid payment method", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const result = await registerPayment("b1", { amount: 5000, method: "CREDIT_CARD" as any });
      expect("error" in result).toBe(true);
    });
  });

  describe("happy path", () => {
    it("should register payment and update business in transaction", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");

      // Mock $transaction to execute the callback
      (db.$transaction as any).mockImplementation(async (cb: any) => {
        if (typeof cb === "function") return cb(db);
        return null;
      });

      (db.subscriptionPayment.create as any).mockResolvedValue({ id: "p1" });
      (db.business.update as any).mockResolvedValue({ id: "b1", accountStatus: "ACTIVO" });

      const result = await registerPayment("b1", {
        amount: 5000,
        method: "TRANSFERENCIA",
        reference: "REF-001",
        notes: "Pago mensual",
        paidAt: new Date("2026-06-15"),
      });

      expect("error" in result).toBe(false);
      expect(db.subscriptionPayment.create).toHaveBeenCalled();
      expect(db.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b1" },
          data: expect.objectContaining({
            accountStatus: "ACTIVO",
          }),
        })
      );
    });

    it("should set accountStatus to ACTIVO when business was MOROSO", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { id: "sa1", role: "SUPER_ADMIN" } });

      const { db } = await import("@/lib/db");
      (db.$transaction as any).mockImplementation(async (cb: any) => {
        if (typeof cb === "function") return cb(db);
        return null;
      });
      (db.subscriptionPayment.create as any).mockResolvedValue({ id: "p1" });
      (db.business.update as any).mockResolvedValue({ id: "b1", accountStatus: "ACTIVO" });

      await registerPayment("b1", { amount: 5000, method: "EFECTIVO" });

      expect(db.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accountStatus: "ACTIVO" }),
        })
      );
    });
  });
});
