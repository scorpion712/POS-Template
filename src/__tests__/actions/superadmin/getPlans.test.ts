import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlans } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  planDefinition: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("getPlans", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should return error if no session", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue(null);
    const result = await getPlans();
    expect(result).toEqual({ error: "No autorizado" });
  });

  it("should return only active plans by default", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    mockDb.planDefinition.findMany.mockResolvedValue([
      { id: "p1", name: "BASIC", isActive: true },
    ]);

    const result = await getPlans();
    expect("error" in result).toBe(false);
    expect(mockDb.planDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });

  it("should include inactive plans when requested", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    mockDb.planDefinition.findMany.mockResolvedValue([]);

    await getPlans(true);
    expect(mockDb.planDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});
