import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Registra una acción del superadmin en el log de auditoría.
 * Fire & forget — nunca lanza error ni bloquea la operación principal.
 */
export const logSuperadminAction = async (
  adminId: string,
  action: string,
  details?: Record<string, unknown>,
  targetId?: string,
  targetType?: string,
) => {
  try {
    await db.superadminAuditLog.create({
      data: {
        adminId,
        action,
        details: (details ?? {}) as Prisma.JsonObject,
        targetId,
        targetType,
      },
    });
  } catch (error) {
    console.error("Failed to log superadmin action:", error);
  }
};
