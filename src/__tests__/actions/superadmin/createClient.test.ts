import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  business: { findUnique: vi.fn(), create: vi.fn() },
  planDefinition: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/superadmin-log", () => ({
  logSuperadminAction: vi.fn(),
}));

const validInput = {
  name: "Juan Pérez",
  email: "juan@test.com",
  password: "123456",
  businessName: "Mi Negocio",
  slug: "mi-negocio",
  plan: "BASIC" as const,
};

describe("createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should return error if no session", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue(null);

      const result = await createClient(validInput);
      expect(result).toEqual({ error: "No autorizado" });
    });

    it("should return error if not SUPER_ADMIN", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "USER" } });

      const result = await createClient(validInput);
      expect(result).toEqual({ error: "No autorizado" });
    });
  });

  describe("validation", () => {
    it("should reject short name", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      const result = await createClient({ ...validInput, name: "A" });
      expect("error" in result).toBe(true);
    });

    it("should reject invalid email", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      const result = await createClient({ ...validInput, email: "not-an-email" });
      expect("error" in result).toBe(true);
    });

    it("should reject short password", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      const result = await createClient({ ...validInput, password: "123" });
      expect("error" in result).toBe(true);
    });

    it("should reject invalid slug format", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      const result = await createClient({ ...validInput, slug: "MI NEGOCIO!!" });
      expect("error" in result).toBe(true);
    });
  });

  describe("duplicate checks", () => {
    it("should reject duplicate email", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.user.findUnique.mockResolvedValue({ id: "existing", email: "juan@test.com" });

      const result = await createClient(validInput);
      expect("error" in result).toBe(true);
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it("should reject duplicate slug", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.business.findUnique.mockResolvedValue({ id: "existing", slug: "mi-negocio" });

      const result = await createClient(validInput);
      expect("error" in result).toBe(true);
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("should create user, business, and plan in transaction", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });

      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.business.findUnique.mockResolvedValue(null);

      const mockUser = { id: "user1", name: "Juan Pérez", email: "juan@test.com" };
      const mockBusiness = { id: "b1", name: "Mi Negocio", slug: "mi-negocio" };

      mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
      mockDb.user.create.mockResolvedValue(mockUser);
      mockDb.business.create.mockResolvedValue(mockBusiness);
      mockDb.planDefinition.findFirst.mockResolvedValue({ id: "basic-plan-id", name: "BASIC" });

      const result = await createClient(validInput);

      expect("error" in result).toBe(false);
      expect(mockDb.$transaction).toHaveBeenCalled();
      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Juan Pérez",
            email: "juan@test.com",
            role: "ADMIN",
          }),
        })
      );
      expect(mockDb.business.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Mi Negocio",
            slug: "mi-negocio",
            planDefinitionId: "basic-plan-id",
          }),
        })
      );
      expect(mockDb.planDefinition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: "BASIC" } })
      );
    });

    it("should handle transaction failure", async () => {
      const { auth } = await import("@/lib/auth");
      (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" }, id: "admin1" });

      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.business.findUnique.mockResolvedValue(null);
      mockDb.$transaction.mockRejectedValue(new Error("DB Error"));

      const result = await createClient(validInput);
      expect("error" in result).toBe(true);
    });
  });
});
