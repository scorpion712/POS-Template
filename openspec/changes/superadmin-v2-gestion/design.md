# Design — Superadmin V2: Gestión Completa (ABM)

**Change**: `superadmin-v2-gestion`  
**Estado**: Draft

---

## 0. Estándares Obligatorios (TODAS LAS FASES)

Aplican los mismos estándares del change anterior:
- **TDD** — Toda nueva Server Action debe tener test antes de implementar
- **Fire & Forget** para logs — nunca bloquear operación principal
- **Transacciones** para operaciones multi-tabla
- **Validación Zod** para todos los inputs de Server Actions
- **Mismo patrón UI** que las páginas existentes (gradient header, cards, badges)

### Convención de tests:
```
src/__tests__/actions/superadmin/
├── createClient.test.ts
├── updateClient.test.ts
├── deleteClient.test.ts
├── createBusiness.test.ts
├── updateBusiness.test.ts
├── getPlans.test.ts
├── createPlan.test.ts
├── updatePlan.test.ts
├── deletePlan.test.ts
├── getAuditLogs.test.ts
└── logSuperadminAction.test.ts
```

---

## Fase 1 — ABM Clientes

### 1.1 Arquitectura de Componentes

```
/superadmin/clients/page.tsx (existente, actualizar)
  ├── Header (existente + botón "+ Nuevo Cliente")
  ├── CreateClientDialog (nuevo — modal)
  │   ├── Sección Dueño: nombre, email, password
  │   └── Sección Negocio: nombre, slug (auto), plan
  ├── SearchBar + Filters (existente)
  ├── ClientsTable (existente)
  └── PaginationControls (existente)

/superadmin/clients/[id]/page.tsx (existente, actualizar)
  ├── Header (existente + botón "Editar" + "Eliminar")
  ├── EditClientDialog (nuevo — modal)
  ├── DeleteClientButton (nuevo — con confirmación escrita)
  └── ... resto existente
```

### 1.2 Data Flow

#### Crear Cliente
```
CreateClientDialog (Client)
  → Formulario con validación Zod en cliente
    name: z.string().min(2)
    email: z.string().email()
    password: z.string().min(6)
    businessName: z.string().min(2)
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/)
    plan: z.enum(["BASIC", "PRO", "ENTERPRISE"])

  → Submit: createClient(data) (Server Action)
    → 1. Validar rol SUPER_ADMIN
    → 2. Validar input con Zod
    → 3. Verificar email único en User
    → 4. Verificar slug único en Business
    → 5. db.$transaction(async (tx) => {
          const user = tx.user.create({ data: { name, email, password: hash, role: ADMIN } })
          const business = tx.business.create({ data: { name: businessName, slug, userId: user.id } })
          tx.businessFeatures.create({ data: { businessId: business.id, plan } })
          return { user, business }
        })
    → 6. logSuperadminAction(adminId, "create_client", { name, email, businessName }, business.id, "business")
    → 7. revalidateTag()
    → 8. Return { success, clientId }
```

#### Editar Cliente
```
EditClientDialog (Client)
  → Formulario: name (input)
  → Submit: updateClient(businessId, { name })
    → Solo actualiza User.name del dueño
    → logSuperadminAction(...)
```

#### Eliminar Cliente
```
DeleteClientButton (Client)
  → Click → safety check: getClientDeleteInfo(businessId)
    → Counts: productos, órdenes, pagos
  → Modal con advertencia + input "ELIMINAR"
  → Submit: deleteClient(businessId)
    → db.business.delete({ where: { id: businessId } }) // Cascade elimina todo
    → logSuperadminAction(...)
    → revalidateTag()
    → redirect a /superadmin/clients
```

### 1.3 Server Actions

```typescript
// src/actions/superadmin.ts — nuevas actions

export const createClient = async (data: {
  name: string;
  email: string;
  password: string;
  businessName: string;
  slug: string;
  plan?: Plan;
}) => {
  // Auth: SUPER_ADMIN
  // Validar: Zod schema
  // Verificar: email único, slug único
  // Transacción: User + Business + BusinessFeatures
  // Log: logSuperadminAction
  // Revalidate
};

export const updateClient = async (businessId: string, data: { name: string }) => {
  // Auth: SUPER_ADMIN
  // Update: User.name del dueño del business
  // Log
  // Revalidate
};

export const getClientDeleteInfo = async (businessId: string) => {
  // Auth: SUPER_ADMIN
  // Returns: { products, orders, payments, businessName } counts
};

export const deleteClient = async (businessId: string) => {
  // Auth: SUPER_ADMIN
  // Delete: Business (cascade)
  // Log
  // Revalidate
  // Return { success }
};
```

---

## Fase 2 — ABM Negocios

### 2.1 Arquitectura de Componentes

```
/superadmin/businesses/page.tsx (existente, actualizar)
  ├── Header (existente + botón "+ Nuevo Negocio")
  ├── CreateBusinessDialog (nuevo — modal)
  │   ├── nombre, slug (auto), dueño (email lookup), plan
  ├── SearchBar + Filters (existente)
  ├── BusinessesTable (existente + columna "Acciones" con botón Editar)
  └── PaginationControls (existente)

Nuevo: EditBusinessDialog (modal)
  ├── nombre, slug, CUIT, IVA, dirección, estado, lastPaymentDate
  └── Acceso: botón "Editar" en cada fila de la tabla
```

### 2.2 Data Flow

#### Crear Negocio
```
CreateBusinessDialog (Client)
  → Formulario: name, slug (auto-generado), ownerEmail (opcional), plan
  → Submit: createBusiness(data)
    → 1. Auth check
    → 2. Validar Zod
    → 3. Si ownerEmail: buscar User por email
      → Si existe: asignar userId
      → Si no: crear sin dueño (userId = null)
    → 4. Verificar slug único
    → 5. Transacción: Business + BusinessFeatures
    → 6. Log + revalidate
```

#### Editar Negocio
```
EditBusinessDialog (Client)
  → Formulario con datos actuales pre-cargados
  → Submit: updateBusiness(businessId, data)
    → Solo actualiza campos que cambiaron
    → Validar slug único si cambió
    → Log + revalidate
```

---

## Fase 3 — Catálogo y ABM de Planes

### 3.1 Arquitectura de Componentes

```
/superadmin/plans/page.tsx (nueva)
  ├── Header (gradient card + breadcrumbs + botón "+ Nuevo Plan")
  ├── PlansTable
  │   ├── Nombre, Precio, Features, Límites, Estado, Acciones
  │   └── Badge "Default" si isDefault
  └── PlanDialog (create/edit — mismo componente)
      ├── name, description, price
      ├── Feature toggles (mismo estilo que FeaturesForm)
      ├── maxUsers, maxProducts
      ├── isActive toggle, isDefault checkbox
      └── displayOrder

Sidebar:
  └── Agregar link "Planes" con icon Package
```

### 3.2 Seed Script

```typescript
// prisma/seed.ts o migration SQL
// Crear 3 planes default si no existen
```

---

## Fase 4 — Logs de Superadmin

### 4.1 Arquitectura de Componentes

```
/superadmin/logs/page.tsx (nueva)
  ├── Header (gradient card + breadcrumbs)
  ├── LogFilters
  │   ├── Action (select)
  │   ├── Fecha desde/hasta (date inputs)
  │   └── Search por targetId/adminId
  ├── LogsTable
  │   ├── Fecha, Admin, Acción, Target, Detalles (expandible)
  │   └── Badge de color por tipo de acción
  └── PaginationControls
```

### 4.2 Helper: `src/lib/superadmin-log.ts`

```typescript
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
```

### 4.3 Integración en Actions

Cada Server Action (nueva y existente) debe llamar `logSuperadminAction` después de la operación exitosa, ANTES de revalidar/retornar.

```typescript
// Patrón:
const session = await auth();
// ... operación ...
await logSuperadminAction(session.user.id, "action_name", { details }, targetId, "targetType");
revalidateTag(...);
return { success: true };
```

---

## 5. Migraciones Prisma

```bash
# Fase 3: PlanDefinition
npx prisma migrate dev --name add_plan_definitions

# Fase 4: SuperadminAuditLog
npx prisma migrate dev --name add_superadmin_audit_log
```

Ambas son tablas nuevas — NO modifican tablas existentes. Riesgo CERO de romper datos actuales.

---

## 6. Archivos Afectados (Resumen por Fase)

### Fase 1 — ABM Clientes
| Archivo | Acción |
|---------|--------|
| `src/actions/superadmin.ts` | ➕ `createClient()`, `updateClient()`, `getClientDeleteInfo()`, `deleteClient()` |
| `src/app/superadmin/clients/page.tsx` | 🔄 Botón "+ Nuevo Cliente" + CreateClientDialog |
| `src/app/superadmin/clients/[id]/page.tsx` | 🔄 Botón Editar + Eliminar |
| `src/__tests__/actions/superadmin/createClient.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/updateClient.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/deleteClient.test.ts` | ➕ Tests |

### Fase 2 — ABM Negocios
| Archivo | Acción |
|---------|--------|
| `src/actions/superadmin.ts` | ➕ `createBusiness()`, `updateBusiness()` |
| `src/app/superadmin/businesses/page.tsx` | 🔄 Botón "+ Nuevo Negocio" + columna Editar |
| `src/__tests__/actions/superadmin/createBusiness.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/updateBusiness.test.ts` | ➕ Tests |

### Fase 3 — Catálogo de Planes
| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | ➕ `PlanDefinition` model |
| `prisma/seed.ts` | ➕ Seed data para planes default |
| `src/actions/superadmin.ts` | ➕ `getPlans()`, `createPlan()`, `updatePlan()`, `deletePlan()` |
| `src/app/superadmin/plans/page.tsx` | ➕ Nueva página |
| `src/app/superadmin/layout.tsx` | 🔄 Sidebar link a Planes |
| `src/__tests__/actions/superadmin/getPlans.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/createPlan.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/updatePlan.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/deletePlan.test.ts` | ➕ Tests |

### Fase 4 — Logs
| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | ➕ `SuperadminAuditLog` model |
| `src/lib/superadmin-log.ts` | ➕ Helper |
| `src/actions/superadmin.ts` | 🔄 Integrar logging en todas las actions |
| `src/app/superadmin/logs/page.tsx` | ➕ Nueva página |
| `src/app/superadmin/layout.tsx` | 🔄 Sidebar link a Logs |
| `src/__tests__/actions/superadmin/getAuditLogs.test.ts` | ➕ Tests |
| `src/__tests__/lib/superadmin-log.test.ts` | ➕ Tests |
