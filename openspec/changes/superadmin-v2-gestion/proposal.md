# Superadmin V2 — Gestión Completa (ABM)

**Change**: `superadmin-v2-gestion`  
**Fecha**: 2026-06-24  
**Estado**: Proposed  
**Inspiración UI/UX**: Páginas existentes de `/superadmin/clients` y `/superadmin/businesses/[id]/features`

---

## Resumen Ejecutivo

El superadmin actual tiene **lectura** (listar, detalle, pagos) pero carece de **ABM completo**: no puede crear clientes ni negocios desde la UI, no puede editar datos existentes, no puede gestionar el catálogo de planes (todo es enum hardcodeado), y no tiene trazabilidad de acciones.

Este plan agrega **4 fases** que cierran el ciclo de gestión:

1. **ABM Clientes** — Crear, editar y eliminar dueños de negocio
2. **ABM Negocios** — Crear, editar y eliminar negocios
3. **Catálogo de Planes** — Modelo propio, CRUD desde superadmin, precio por plan
4. **Logs de Superadmin** — Trazabilidad de todas las acciones

---

## Fase 1 — ABM Clientes (CRUD Dueños)

### 🎯 Objetivo
Hoy el superadmin puede **ver** clientes y **registrar pagos/cambiar plan**, pero **no puede crearlos, editarlos ni eliminarlos** desde la UI.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `src/actions/superadmin.ts` | ➕ `createClient(name, email, password, businessName, slug)`, `updateClient(clientId, data)`, `deleteClient(clientId)` |
| `/superadmin/clients/page.tsx` | 🔄 Agregar botón "+ Nuevo Cliente" → modal/formulario |
| `/superadmin/clients/[id]/page.tsx` | 🔄 Agregar botón "Editar" + "Eliminar" con confirmación |
| Nuevo: `CreateClientDialog` | Modal con formulario: datos del dueño + datos del negocio en un paso |
| Nuevo: `EditClientDialog` | Modal para editar datos del dueño (nombre, email) |

**Flujo:**
- **Crear**: Formulario único que crea `User` (ADMIN) + `Business` + `BusinessFeatures` en una transacción
- **Editar**: Solo datos del dueño (nombre, email) — el negocio se edita en ABM Negocios
- **Eliminar**: Safety check con conteo de datos asociados + confirmación

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🟡 MEDIO (5-6 archivos) | ✅ Incluido |

### 📱 Mobile
Mismo patrón responsive que el formulario de pago existente.

---

## Fase 2 — ABM Negocios (CRUD)

### 🎯 Objetivo
Hoy el superadmin puede **listar** negocios con búsqueda, **ver features y config ARCA**, y **eliminar** (con safety). Pero **no puede crear ni editar** datos del negocio.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `src/actions/superadmin.ts` | ➕ `createBusiness(name, slug, ownerEmail?)`, `updateBusiness(businessId, data)` |
| `/superadmin/businesses/page.tsx` | 🔄 Agregar botón "+ Nuevo Negocio" |
| Nuevo: `CreateBusinessDialog` | Modal con nombre + slug (verificar unicidad) + dueño opcional |
| Nuevo: `EditBusinessDialog` | Modal para editar nombre, slug, CUIT, condición IVA, dirección |

**Flujo:**
- **Crear**: Nombre + slug (validar unicidad en backend). Opcional: asignar dueño existente por email.
- **Editar**: Nombre, slug, CUIT, condición IVA, dirección, estado de cuenta, lastPaymentDate
- Eliminar: ✅ ya existe con `deleteBusinessSafe`

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🟡 MEDIO (3-4 archivos) | ✅ Incluido |

### ⚠️ Riesgo
Editar slug puede romper URLs públicas del catálogo. Validar unicidad antes de cambiar.

---

## Fase 3 — Catálogo y ABM de Planes

### 🎯 Objetivo
Hoy `Plan` es un enum hardcodeado (`BASIC | PRO | ENTERPRISE`). No hay forma de ver qué incluye cada plan, cuánto cuesta, o agregar/quitar planes sin deploy.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `prisma/schema.prisma` | ➕ Nuevo modelo `PlanDefinition` con name, description, price, features map, limits |
| `src/actions/superadmin.ts` | ➕ `getPlans()`, `createPlan()`, `updatePlan()`, `deletePlan()` |
| Nuevo: `/superadmin/plans/page.tsx` | Página con catálogo de planes: cards o tabla con precio, features, límites |
| Nuevo: `/superadmin/plans/new/page.tsx` (o dialog) | Crear/editar plan |
| Migración | `npx prisma migrate dev --name add_plan_definitions` |

**Modelo propuesto:**

```prisma
model PlanDefinition {
  id          String   @id @default(cuid())
  name        String   @unique      // BASIC, PRO, ENTERPRISE, CUSTOM_1, etc.
  description String?
  price       Float    @default(0)  // Precio mensual en ARS
  isActive    Boolean  @default(true)

  // Feature flags que este plan incluye
  hasAfipBilling    Boolean @default(false)
  hasPublicCatalog  Boolean @default(false)
  hasClientLedger   Boolean @default(false)
  hasMultiCashbox   Boolean @default(false)
  hasSupplierFilter Boolean @default(false)
  hasBudget         Boolean @default(false)

  // Límites
  maxUsers    Int @default(1)
  maxProducts Int @default(100)

  // Metadata
  displayOrder Int     @default(0)  // Orden de aparición en UI
  isDefault    Boolean @default(false) // Plan por defecto para nuevos negocios
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("plan_definitions")
}
```

**Integración con modelo existente:**
- `BusinessFeatures.plan` sigue siendo String (no FK) — no romper datos existentes
- Al crear plan, se puede migrar a futuro si hace falta
- La UI del superadmin lee de `PlanDefinition` en vez del enum

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🔴 ALTO (5-7 archivos) | ✅ Incluido |

### ✅ Beneficio
El superadmin puede crear ofertas comerciales, ajustar precios, y definir qué features incluye cada plan **sin hacer deploy**.

---

## Fase 4 — Logs de Superadmin

### 🎯 Objetivo
Hoy no hay trazabilidad. Si un cliente aparece con el plan cambiado o datos modificados, no se sabe quién ni cuándo. Los logs de superadmin registran **todas las acciones** del superadmin sobre el sistema.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `prisma/schema.prisma` | ➕ Nuevo modelo `SuperadminAuditLog` |
| `src/lib/superadmin-log.ts` | ➕ Helper `logAction(adminId, action, details)` — fire & forget |
| `src/actions/superadmin.ts` | 🔄 Integrar logging en todas las actions existentes y nuevas |
| Nuevo: `/superadmin/logs/page.tsx` | Página para ver logs: tabla paginada con filtros por acción y fecha |
| Migración | `npx prisma migrate dev --name add_superadmin_audit_log` |

**Modelo:**
```prisma
model SuperadminAuditLog {
  id        String   @id @default(cuid())
  adminId   String                     // userId del superadmin
  action    String                     // "create_client", "change_plan", "register_payment", etc.
  details   Json?                      // payload con datos relevantes
  targetId  String?                    // businessId, userId, etc.
  targetType String?                   // "business", "user", "plan", etc.
  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
  @@map("superadmin_audit_logs")
}
```

**Helper `logAction`:**
```typescript
// Fire & forget — nunca lanza error ni bloquea la operación principal
export const logAction = async (
  adminId: string,
  action: string,
  details?: Record<string, unknown>,
  targetId?: string,
  targetType?: string,
) => {
  try {
    await db.superadminAuditLog.create({
      data: { adminId, action, details: details ?? {}, targetId, targetType },
    });
  } catch (error) {
    console.error("Failed to log superadmin action:", error);
    // Nunca bloquear la operación principal por un log
  }
};
```

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🟡 MEDIO | 🟡 MEDIO (4-5 archivos) | ✅ Incluido |

### ✅ Beneficio
Trazabilidad completa. Saber quién hizo qué y cuándo. Útil para soporte, auditoría y debugging.

---

## Orden de Implementación

```
Fase 1 (ABM Clientes) → Fase 2 (ABM Negocios) → Fase 3 (Planes) → Fase 4 (Logs)
```

**Justificación:**
1. **Fase 1** — ABM Clientes es la operación más solicitada: crear clientes desde el superadmin
2. **Fase 2** — ABM Negocios complementa a clientes: crear negocios, asignar dueños
3. **Fase 3** — Catálogo de Planes es independiente pero deseable antes de logs
4. **Fase 4** — Logs se integran en todas las actions existentes al final

---

## Dependencias entre Fases

| Fase | Depende de | Afecta a |
|------|-----------|----------|
| Fase 1 | N/A | Fase 2 (comparten datos de cliente) |
| Fase 2 | N/A | Fase 1 (comparten UI de negocio) |
| Fase 3 | N/A | N/A (independiente) |
| Fase 4 | Fases 1-3 (integra logging en las nuevas actions) | N/A |

---

## Tradeoffs y Decisiones

| Decisión | Ganas | Pierdes |
|----------|-------|---------|
| ABM Clientes crea User+Business juntos | Operación simple, 1 paso | Si después sacamos @unique de userId, toca migrar |
| `PlanDefinition` como modelo nuevo (no modificar enum) | Flexibilidad total, sin romper existente | Data duplicada (Plan enum + PlanDefinition table) |
| Logs como fire & forget | No bloquean operaciones | Si la DB de logs falla, perdés trazabilidad |
| `BusinessFeatures.plan` como String (no FK) | Sin migración de datos | Validación manual de valores permitidos |
