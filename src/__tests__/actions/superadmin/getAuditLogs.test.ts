import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuditLogs } from "@/actions/superadmin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockDb = vi.hoisted(() => ({
  superadminAuditLog: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

describe("getAuditLogs", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should return error if no session", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue(null);
    const result = await getAuditLogs({ page: 1 });
    expect(result).toEqual({ error: "No autorizado" });
  });

  it("should return paginated logs", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    mockDb.superadminAuditLog.findMany.mockResolvedValue([
      { id: "log1", action: "create_client", adminId: "admin1" },
    ]);
    mockDb.superadminAuditLog.count.mockResolvedValue(1);

    const result = await getAuditLogs({ page: 1 });
    expect("error" in result).toBe(false);
    const data = (result as any).success;
    expect(data.logs).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
  });

  it("should filter by action", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    mockDb.superadminAuditLog.findMany.mockResolvedValue([]);
    mockDb.superadminAuditLog.count.mockResolvedValue(0);

    await getAuditLogs({ page: 1, action: "create_client" });
    expect(mockDb.superadminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: "create_client" }),
      })
    );
  });

  it("should handle errors gracefully", async () => {
    const { auth } = await import("@/lib/auth");
    (auth as any).mockResolvedValue({ user: { role: "SUPER_ADMIN" } });
    mockDb.superadminAuditLog.findMany.mockRejectedValue(new Error("DB Error"));

    const result = await getAuditLogs({ page: 1 });
    expect("error" in result).toBe(true);
  });
});
