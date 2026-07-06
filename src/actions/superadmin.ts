"use server";

import { db } from "@/lib/db";
import { UserRole, Prisma } from "@prisma/client";
import { revalidateTag, updateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { auth } from "@/lib/auth";
import { fail } from "@/lib/action-result";
import { logSuperadminAction } from "@/lib/superadmin-log";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const getSuperadminMetrics = async () => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const [
      totalBusinesses,
      activeBusinesses,
      morosoBusinesses,
      desactivadoBusinesses,
      totalClients,
      planDistribution,
      recentBusinesses,
      recentClients,
    ] = await Promise.all([
      db.business.count(),
      db.business.count({ where: { accountStatus: "ACTIVO" } }),
      db.business.count({ where: { accountStatus: "MOROSO" } }),
      db.business.count({ where: { accountStatus: "DESACTIVADO" } }),
      db.business.count({ where: { userId: { not: null } } }),
      db.planDefinition.findMany({ select: { id: true, name: true } }).then(async (defs) => {
        const planDefMap = new Map(defs.map(d => [d.id, d.name]));
        const groups = await db.business.groupBy({
          by: ["planDefinitionId"],
          _count: { planDefinitionId: true },
          where: { planDefinitionId: { not: null } },
        });
        const dist: Record<string, number> = {};
        for (const g of groups) {
          const name = g.planDefinitionId ? (planDefMap.get(g.planDefinitionId) || "UNKNOWN") : "UNKNOWN";
          dist[name] = g._count.planDefinitionId;
        }
        return dist;
      }),
      db.business.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          accountStatus: true,
          createdAt: true,
          userId: true,
        },
      }),
      db.business.findMany({
        where: { userId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          accountStatus: true,
          createdAt: true,
          userId: true,
        },
      }),
    ]);

    return {
      success: {
        totalBusinesses,
        activeBusinesses,
        morosoBusinesses,
        desactivadoBusinesses,
        totalClients,
        planDistribution,
        recentBusinesses,
        recentClients,
      },
    };
  } catch (error) {
    console.error("Error fetching superadmin metrics:", error);
    return { error: "Error al obtener métricas del dashboard" };
  }
};

export const promoteToAdmin = async (userId: string, businessName: string, slug: string) => {
  try {
    // Check if slug exists
    const existingBusiness = await db.business.findUnique({
      where: { slug },
    });

    if (existingBusiness) {
      return { error: "Business slug already exists." };
    }

    // Transaction to create business and update user
    await db.$transaction(async (tx) => {
      // Create Business
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug: slug,
          userId: userId, // Set owner
        },
      });

      // Update User
      await tx.user.update({
        where: { id: userId },
        data: {
          role: UserRole.ADMIN,
          businessId: business.id,
        },
      });
    });

    revalidateTag(CACHE_TAGS.SUPERADMIN, "max");
    return { success: "User promoted and business created." };
  } catch (error) {
    console.error("Promote Error:", error);
    return fail("Failed to promote user.");
  }
};

export const getAllBusinesses = async () => {
    const session = await auth();

    if (session?.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "No autorizado" };
    }

    try {
        const businesses = await db.business.findMany({
            include: {
                users: true,
                _count: {
                    select: {
                        users: true,
                        products: true,
                        orders: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return { success: businesses };
    } catch (error) {
        console.error("Error fetching businesses:", error);
        return fail("Error al obtener negocios");
    }
};

export const deleteBusiness = async (businessId: string) => {
    const session = await auth();

    if (session?.user.role !== UserRole.SUPER_ADMIN) {
        return { error: "No autorizado" };
    }

    try {
        await db.business.delete({
            where: {
                id: businessId
            }
        });
        
        revalidateTag(CACHE_TAGS.SUPERADMIN, "max");
        return { success: "Negocio eliminado" };
    } catch (error) {
        console.error("Error deleting business:", error);
        return fail("Error al eliminar negocio");
    }
};

export const updateBusinessPlanAction = async (payload: {
  businessId: string;
  planDefinitionId: string;
}) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "No autorizado" };
  }

  try {
    // Validate PlanDefinition exists
    const planDef = await db.planDefinition.findUnique({
      where: { id: payload.planDefinitionId },
    });
    if (!planDef) {
      return { success: false, error: "Plan no encontrado" };
    }

    await db.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: payload.businessId },
      });

      if (!business) {
        throw new Error("Negocio no encontrado");
      }

      await tx.business.update({
        where: { id: payload.businessId },
        data: { planDefinitionId: payload.planDefinitionId },
      });
    });

    await logSuperadminAction(
      session.user.id!,
      "update_features",
      { businessId: payload.businessId, planDefinitionId: payload.planDefinitionId },
      payload.businessId,
      "business"
    );

    try {
      revalidateTag(CACHE_TAGS.SUPERADMIN, "max");
    } catch {
      // Ignore static generation store missing in test environments
    }
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("Error updating business plan:", error);
    return fail(err.message || "Error al actualizar el plan del negocio");
  }
};

// ──────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  businessName: z.string().min(2, "El nombre del negocio debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  plan: z.string().optional().default("BASIC"),
});

const updateClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

const createBusinessSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  plan: z.string().optional().default("BASIC"),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  cuit: z.string().optional().nullable(),
  condicionIva: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  accountStatus: z.string().optional(),
  lastPaymentDate: z.string().optional().nullable(),
});

const createPlanSchema = z.object({
  name: z.string().min(1, "El nombre del plan es requerido"),
  description: z.string().optional().default(""),
  price: z.number().min(0, "El precio no puede ser negativo").default(0),
  features: z.object({
    hasAfipBilling: z.boolean().default(false),
    hasPublicCatalog: z.boolean().default(false),
    hasClientLedger: z.boolean().default(false),
    hasMultiCashbox: z.boolean().default(false),
    hasSupplierFilter: z.boolean().default(false),
    hasBudget: z.boolean().default(false),
  }).default({}),
  limits: z.object({
    maxUsers: z.number().int().min(1).default(1),
    maxProducts: z.number().int().min(1).default(100),
    maxCashboxes: z.number().int().min(1).default(1),
    maxClients: z.number().int().min(1).default(100),
    dailySalesLimit: z.number().int().min(0).default(0),
    dailyProductsLimit: z.number().int().min(0).default(0),
    dailyClientsLimit: z.number().int().min(0).default(0),
  }).default({}),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
  isDefault: z.boolean().optional().default(false),
});

const updatePlanSchema = createPlanSchema.partial();

const getAuditLogsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  action: z.string().optional(),
  adminId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// ──────────────────────────────────────────────
// Fase 1 — ABM Clientes
// ──────────────────────────────────────────────

export const createClient = async (data: z.infer<typeof createClientSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = createClientSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  const { name, email, password, businessName, slug, plan } = parsed.data;

  try {
    // Verificar email único
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: "El email ya está registrado" };
    }

    // Verificar slug único
    const existingBusiness = await db.business.findUnique({ where: { slug } });
    if (existingBusiness) {
      return { error: "El slug ya está en uso" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transacción: crear User + Business + asignar plan
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });

      // Resolver plan definition por nombre
      const planDef = await tx.planDefinition.findFirst({ where: { name: plan } });

      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
          userId: user.id,
          planDefinitionId: planDef?.id ?? null,
        },
      });

      // Actualizar user con businessId
      await tx.user.update({
        where: { id: user.id },
        data: { businessId: business.id },
      });

      return { userId: user.id, businessId: business.id };
    });

    await logSuperadminAction(
      session.user.id!,
      "create_client",
      { name, email, businessName, plan },
      result.businessId,
      "business"
    );

    try { updateTag(CACHE_TAGS.SUPERADMIN); } catch { /* ignore */ }
    return { success: true, clientId: result.businessId };
  } catch (error) {
    console.error("Error creating client:", error);
    return { error: "Error al crear el cliente" };
  }
};

export const updateClient = async (businessId: string, data: z.infer<typeof updateClientSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = updateClientSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  try {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (!business) {
      return { error: "Cliente no encontrado" };
    }

    if (!business.userId) {
      return { error: "El negocio no tiene un dueño asignado" };
    }

    await db.user.update({
      where: { id: business.userId },
      data: { name: parsed.data.name },
    });

    await logSuperadminAction(
      session.user.id!,
      "update_client",
      { businessId, previousUserId: business.userId, newName: parsed.data.name },
      businessId,
      "business"
    );

    try { updateTag(CACHE_TAGS.SUPERADMIN); } catch { /* ignore */ }
    return { success: true };
  } catch (error) {
    console.error("Error updating client:", error);
    return { error: "Error al actualizar el cliente" };
  }
};

export const getClientDeleteInfo = async (businessId: string) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        name: true,
        _count: { select: { products: true, orders: true } },
      },
    });

    if (!business) {
      return { error: "Cliente no encontrado" };
    }

    const payments = await db.subscriptionPayment.count({
      where: { businessId },
    });

    return {
      success: {
        businessName: business.name,
        products: business._count.products,
        orders: business._count.orders,
        payments,
      },
    };
  } catch (error) {
    console.error("Error getting client delete info:", error);
    return { error: "Error al obtener información del cliente" };
  }
};

export const deleteClient = async (businessId: string) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });

    if (!business) {
      return { error: "Cliente no encontrado" };
    }

    await db.business.delete({ where: { id: businessId } });

    await logSuperadminAction(
      session.user.id!,
      "delete_client",
      { businessName: business.name },
      businessId,
      "business"
    );

    try { updateTag(CACHE_TAGS.SUPERADMIN); } catch { /* ignore */ }
    return { success: true };
  } catch (error) {
    console.error("Error deleting client:", error);
    return { error: "Error al eliminar el cliente" };
  }
};

// ──────────────────────────────────────────────
// Fase 2 — ABM Negocios
// ──────────────────────────────────────────────

export const createBusiness = async (data: z.infer<typeof createBusinessSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = createBusinessSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  const { name, slug, ownerEmail, plan } = parsed.data;

  try {
    // Verificar slug único
    const existingBusiness = await db.business.findUnique({ where: { slug } });
    if (existingBusiness) {
      return { error: "El slug ya está en uso" };
    }

    // Buscar owner por email si se proporcionó
    let ownerId: string | null = null;
    if (ownerEmail) {
      const owner = await db.user.findUnique({ where: { email: ownerEmail } });
      if (owner) {
        ownerId = owner.id;
      }
      // Si no existe, se crea sin dueño (no es error)
    }

    const planDef = await db.planDefinition.findFirst({ where: { name: plan } });

    const result = await db.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name,
          slug,
          userId: ownerId,
          planDefinitionId: planDef?.id ?? null,
        },
      });

      return business;
    });

    await logSuperadminAction(
      session.user.id!,
      "create_business",
      { name, slug, ownerEmail: ownerEmail || null, plan },
      result.id,
      "business"
    );

    try { updateTag(CACHE_TAGS.SUPERADMIN); } catch { /* ignore */ }
    return { success: true, businessId: result.id };
  } catch (error) {
    console.error("Error creating business:", error);
    return { error: "Error al crear el negocio" };
  }
};

export const updateBusiness = async (
  businessId: string,
  data: z.infer<typeof updateBusinessSchema>
) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = updateBusinessSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  try {
    const { slug, lastPaymentDate, ...rest } = parsed.data;

    // Si cambia slug, verificar unicidad
    if (slug) {
      const existing = await db.business.findFirst({
        where: { slug, id: { not: businessId } },
      });
      if (existing) {
        return { error: "El slug ya está en uso por otro negocio" };
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (slug) updateData.slug = slug;
    if (lastPaymentDate !== undefined) {
      updateData.lastPaymentDate = lastPaymentDate ? new Date(lastPaymentDate) : null;
    }

    await db.business.update({
      where: { id: businessId },
      data: updateData,
    });

    await logSuperadminAction(
      session.user.id!,
      "update_business",
      { businessId, changes: updateData },
      businessId,
      "business"
    );

    try { updateTag(CACHE_TAGS.SUPERADMIN); } catch { /* ignore */ }
    return { success: true };
  } catch (error) {
    console.error("Error updating business:", error);
    return { error: "Error al actualizar el negocio" };
  }
};

// ──────────────────────────────────────────────
// Fase 3 — Catálogo de Planes
// ──────────────────────────────────────────────

export const getPlans = async (includeInactive = false) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const plans = await db.planDefinition.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return { success: plans };
  } catch (error) {
    console.error("Error fetching plans:", error);
    return { error: "Error al obtener los planes" };
  }
};

export const createPlan = async (data: z.infer<typeof createPlanSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = createPlanSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  try {
    // Verificar nombre único
    const existing = await db.planDefinition.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return { error: "Ya existe un plan con ese nombre" };
    }

    // Si es default, quitar default de otros planes
    if (parsed.data.isDefault) {
      await db.planDefinition.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await db.planDefinition.create({ data: parsed.data });

    await logSuperadminAction(
      session.user.id!,
      "create_plan",
      { name: plan.name, price: plan.price },
      plan.id,
      "plan"
    );

    return { success: true, planId: plan.id };
  } catch (error) {
    console.error("Error creating plan:", error);
    return { error: "Error al crear el plan" };
  }
};

export const updatePlan = async (planId: string, data: z.infer<typeof updatePlanSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = updatePlanSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  try {
    // Si cambia nombre, verificar unicidad
    if (parsed.data.name) {
      const existing = await db.planDefinition.findFirst({
        where: { name: parsed.data.name, id: { not: planId } },
      });
      if (existing) {
        return { error: "Ya existe un plan con ese nombre" };
      }
    }

    // Si es default, quitar default de otros planes
    if (parsed.data.isDefault) {
      await db.planDefinition.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await db.planDefinition.update({
      where: { id: planId },
      data: parsed.data,
    });

    await logSuperadminAction(
      session.user.id!,
      "update_plan",
      { planId, changes: parsed.data },
      planId,
      "plan"
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating plan:", error);
    return { error: "Error al actualizar el plan" };
  }
};

export const deletePlan = async (planId: string) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const plan = await db.planDefinition.findUnique({
      where: { id: planId },
      select: { name: true },
    });

    if (!plan) {
      return { error: "Plan no encontrado" };
    }

    // Verificar que ningún negocio tenga este plan
    const businessesWithPlan = await db.business.count({
      where: { planDefinitionId: planId },
    });

    if (businessesWithPlan > 0) {
      return {
        error: `No se puede eliminar el plan porque ${businessesWithPlan} negocio(s) lo tienen asignado`,
      };
    }

    await db.planDefinition.delete({ where: { id: planId } });

    await logSuperadminAction(
      session.user.id!,
      "delete_plan",
      { planName: plan.name },
      planId,
      "plan"
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting plan:", error);
    return { error: "Error al eliminar el plan" };
  }
};

// ──────────────────────────────────────────────
// Fase 4 — Logs de Superadmin
// ──────────────────────────────────────────────

const PAGE_SIZE = 50;

export const getAuditLogs = async (filters: z.infer<typeof getAuditLogsSchema>) => {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  const parsed = getAuditLogsSchema.safeParse(filters);
  if (!parsed.success) {
    return { error: "Filtros inválidos" };
  }

  const { page, action, adminId, from, to } = parsed.data;
  const skip = (page - 1) * PAGE_SIZE;

  try {
    const where: Prisma.SuperadminAuditLogWhereInput = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      db.superadminAuditLog.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
      }),
      db.superadminAuditLog.count({ where }),
    ]);

    return {
      success: {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { error: "Error al obtener los logs" };
  }
};

// ──────────────────────────────────────────────
// Existing actions continue below
// ──────────────────────────────────────────────

const VALID_PAYMENT_METHODS = ["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO", "OTRO"] as const;
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];

export interface GetClientsPaginatedInput {
  page: number;
  search?: string;
  status?: string;
}

export const getClientsPaginated = async (params: GetClientsPaginatedInput) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const { page, search, status } = params;
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessWhereInput = {
      userId: { not: null },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { cuit: { contains: search, mode: "insensitive" } },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (status) {
      where.accountStatus = status as Prisma.EnumBusinessStatusFilter["equals"];
    }

    const [clients, total] = await Promise.all([
      db.business.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          accountStatus: true,
          createdAt: true,
          userId: true,
          users: {
            select: { id: true, name: true, email: true },
          },
          planDefinition: {
            select: { name: true },
          },
        },
      }),
      db.business.count({ where }),
    ]);

    return {
      success: {
        clients,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching paginated clients:", error);
    return { error: "Error al obtener clientes" };
  }
};

export const getClientDetail = async (businessId: string) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const business = await db.business.findUnique({
      where: { id: businessId },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
        planDefinition: true,
        payments: {
          orderBy: { paidAt: "desc" },
          take: 10,
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!business) {
      return { error: "Cliente no encontrado" };
    }

    return {
      success: {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          userId: business.userId,
          accountStatus: business.accountStatus,
          lastPaymentDate: business.lastPaymentDate,
          createdAt: business.createdAt,
          cuit: business.cuit,
          condicionIva: business.condicionIva,
        },
        owner: business.users[0] || null,
        planDefinition: business.planDefinition,
        recentPayments: business.payments,
        businessStats: {
          products: business._count.products,
          orders: business._count.orders,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching client detail:", error);
    return { error: "Error al obtener detalle del cliente" };
  }
};

export interface RegisterPaymentInput {
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  paidAt?: Date;
}

export const registerPayment = async (businessId: string, data: RegisterPaymentInput) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  if (data.amount <= 0) {
    return { error: "El monto debe ser mayor a cero" };
  }

  if (!VALID_PAYMENT_METHODS.includes(data.method as PaymentMethod)) {
    return { error: "Método de pago no válido" };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.subscriptionPayment.create({
        data: {
          businessId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          notes: data.notes,
          paidAt: data.paidAt ?? new Date(),
          recordedBy: session.user.id!,
        },
      });

      await tx.business.update({
        where: { id: businessId },
        data: {
          accountStatus: "ACTIVO",
          lastPaymentDate: data.paidAt ?? new Date(),
        },
      });
    });

    await logSuperadminAction(
      session.user.id!,
      "register_payment",
      { amount: data.amount, method: data.method, businessId },
      businessId,
      "business"
    );

    revalidatePath("/superadmin/clients");
    return { success: true };
  } catch (error) {
    console.error("Error registering payment:", error);
    return { error: "Error al registrar pago" };
  }
};

export const changeClientPlan = async (businessId: string, planName: string) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const planDef = await db.planDefinition.findFirst({ where: { name: planName } });
    if (!planDef) {
      return { error: "Plan no válido" };
    }

    await db.business.update({
      where: { id: businessId },
      data: { planDefinitionId: planDef.id },
    });

    await logSuperadminAction(
      session.user.id!,
      "change_client_plan",
      { businessId, newPlan: planName },
      businessId,
      "business"
    );

    revalidatePath("/superadmin/clients");
    return { success: true };
  } catch (error) {
    console.error("Error changing client plan:", error);
    return { error: "Error al cambiar plan del cliente" };
  }
};

export interface GetBusinessesPaginatedInput {
  page: number;
  search?: string;
  status?: string;
}

export const getBusinessesPaginated = async (params: GetBusinessesPaginatedInput) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const { page, search, status } = params;
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BusinessWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (status) {
      where.accountStatus = status as Prisma.EnumBusinessStatusFilter["equals"];
    }

    const [businesses, total] = await Promise.all([
      db.business.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          accountStatus: true,
          lastPaymentDate: true,
          createdAt: true,
          userId: true,
          users: {
            select: { id: true, name: true, email: true },
          },
          planDefinition: {
            select: { name: true },
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
      }),
      db.business.count({ where }),
    ]);

    return {
      success: {
        businesses,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching paginated businesses:", error);
    return { error: "Error al obtener negocios" };
  }
};

export const deleteBusinessSafe = async (businessId: string, confirm?: boolean) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!business) {
      return { error: "Negocio no encontrado" };
    }

    if (!confirm) {
      return {
        warning: {
          name: business.name,
          products: business._count.products,
          orders: business._count.orders,
        },
      };
    }

    await db.business.delete({
      where: { id: businessId },
    });

    await logSuperadminAction(
      session.user.id!,
      "delete_business",
      { businessName: business?.name },
      businessId,
      "business"
    );

    try {
      revalidateTag(CACHE_TAGS.SUPERADMIN, "max");
    } catch {
      // Ignore revalidation errors in test environments
    }
    return { success: "Negocio eliminado" };
  } catch (error) {
    console.error("Error deleting business:", error);
    return { error: "Error al eliminar negocio" };
  }
};

/**
 * Obtiene usuarios internos de un negocio (empleados/cajeros).
 * SOLO LECTURA — el superadmin ve pero no modifica.
 */
export const getBusinessUsers = async (businessId: string) => {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    const users = await db.user.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        cashbox: {
          select: { name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { users };
  } catch (error) {
    console.error("Error fetching business users:", error);
    return { error: "Error al obtener usuarios del negocio" };
  }
};

