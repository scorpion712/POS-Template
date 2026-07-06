import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBusiness } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  business: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() },
  planDefinition: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/superadmin-log", () => ({ logSuperadminAction: vi.fn() }));

describe("createBusiness", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should return error if no session", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue(null);
    const result = await createBusiness({ name: "Test", slug: "test", plan: "BASIC" });
    expect(result).toEqual({ error: "No autorizado" });
  });

  it("should reject duplicate slug", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createBusiness({ name: "Test", slug: "test", plan: "BASIC" });
    expect("error" in result).toBe(true);
  });

  it("should create business without owner", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.findUnique.mockResolvedValue(null);
    mockDb.planDefinition.findFirst.mockResolvedValue({ id: "basic-plan-id", name: "BASIC" });
    mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    mockDb.business.create.mockResolvedValue({ id: "b1" });

    const result = await createBusiness({ name: "Test", slug: "test", plan: "BASIC" });
    expect("error" in result).toBe(false);
    expect(mockDb.business.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null, planDefinitionId: "basic-plan-id" }) })
    );
  });

  it("should assign owner if email exists", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ id: "user1", email: "owner@test.com" });
    mockDb.planDefinition.findFirst.mockResolvedValue({ id: "basic-plan-id", name: "BASIC" });
    mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    mockDb.business.create.mockResolvedValue({ id: "b1" });

    const result = await createBusiness({ name: "Test", slug: "test", plan: "BASIC", ownerEmail: "owner@test.com" });
    expect("error" in result).toBe(false);
    expect(mockDb.business.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user1" }) })
    );
  });

  it("should handle transaction failure", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.findUnique.mockResolvedValue(null);
    mockDb.$transaction.mockRejectedValue(new Error("DB Error"));

    const result = await createBusiness({ name: "Test", slug: "test", plan: "BASIC" });
    expect("error" in result).toBe(true);
  });
});
