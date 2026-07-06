import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateBusiness } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  business: { findFirst: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/superadmin-log", () => ({ logSuperadminAction: vi.fn() }));

describe("updateBusiness", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should return error if no session", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue(null);
    const result = await updateBusiness("b1", { name: "New Name" });
    expect(result).toEqual({ error: "No autorizado" });
  });

  it("should update business fields", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.update.mockResolvedValue({ id: "b1" });

    const result = await updateBusiness("b1", { name: "New Name", cuit: "20-12345678-9" });
    expect("error" in result).toBe(false);
    expect(mockDb.business.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { name: "New Name", cuit: "20-12345678-9" },
    });
  });

  it("should reject duplicate slug", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.findFirst.mockResolvedValue({ id: "b2" });

    const result = await updateBusiness("b1", { slug: "existing-slug" });
    expect("error" in result).toBe(true);
    expect(mockDb.business.update).not.toHaveBeenCalled();
  });

  it("should handle database error", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "admin1" } });
    mockDb.business.update.mockRejectedValue(new Error("DB Error"));

    const result = await updateBusiness("b1", { name: "New Name" });
    expect("error" in result).toBe(true);
  });
});
