# Spec — Superadmin V2: Gestión Completa (ABM)

**Change**: `superadmin-v2-gestion`  
**Estado**: Draft  
**Inspiración UI/UX**: Páginas existentes de `/superadmin/clients`

---

## Fase 1 — ABM Clientes (CRUD Dueños)

### 1.1 Concepto

Un **Cliente** es un `User` con `role === ADMIN` que posee un `Business` (via `Business.userId`). El superadmin necesita poder **crear, editar y eliminar** estos clientes desde la UI.

### 1.2 Estado Actual

| Operación | Estado | Dónde |
|-----------|--------|-------|
| Listar clientes | ✅ Implementado | `/superadmin/clients/` + `getClientsPaginated()` |
| Ver detalle | ✅ Implementado | `/superadmin/clients/[id]` + `getClientDetail()` |
| Registrar pago | ✅ Implementado | Dialog en detalle + `registerPayment()` |
| Cambiar plan | ✅ Implementado | Dialog en detalle + `changeClientPlan()` |
| **Crear cliente** | ❌ No existe desde UI | Solo `promoteToAdmin()` que es raw |
| **Editar cliente** | ❌ No existe | No hay action para update de datos del dueño |
| **Eliminar cliente** | ❌ No existe | No hay safe delete para clientes |

### 1.3 Ruta: `/superadmin/clients/page.tsx`

**Agregar en el header:**
- Botón "+ Nuevo Cliente" → abre `CreateClientDialog`

#### CreateClientDialog

**Modal con 2 secciones:**
1. **Datos del dueño** (User):
   - Nombre (input text, required)
   - Email (input email, required, validar unicidad)
   - Contraseña (input password, required, min 6 chars)
   
2. **Datos del negocio** (Business):
   - Nombre del negocio (input text, required)
   - Slug (input text, required, validar unicidad en backend, auto-generar desde nombre)
   - Plan inicial (select: BASIC | PRO | ENTERPRISE, default BASIC)

**Comportamiento:**
- El slug se auto-genera del nombre (lowercase, replace spaces with hyphens, remove special chars)
- El superadmin puede editar el slug manualmente
- Al submit: transacción Prisma que crea User (ADMIN) + Business + BusinessFeatures
- Success: toast + refresh de la tabla

#### EditClientDialog

**Modal desde detalle del cliente:**
- Nombre (input, required)
- Email (input, required, read-only por ahora — cambiar email es complejo por auth)
- Botón "Guardar cambios"

**Nota:** Solo editamos datos del `User` (nombre). El email queda read-only porque cambiar el email asociado a la cuenta de auth es complejo y requiere reverificación.

#### DeleteClientButton

**Desde detalle del cliente:**
- Botón "Eliminar Cliente" con estilo rojo/danger
- Al clickear: safety check con conteo de datos asociados antes del modal de confirmación
- Modal muestra:
  - ⚠️ Advertencia: "Esto eliminará al cliente {nombre}, su negocio {negocio}, y todos los datos asociados (productos, órdenes, clientes, etc.)"
  - Conteo de: productos, órdenes, pagos registrados
  - Input de confirmación: escribir "ELIMINAR" para habilitar el botón
- Al confirmar: `deleteClient(businessId)` — elimina en cascada (CUIDADO: Prisma cascade)
- Success: toast + redirect a lista de clientes

### 1.4 Server Actions Nuevas

| Action | Input | Output | Notas |
|--------|-------|--------|-------|
| `createClient(name, email, password, businessName, slug, plan)` | Datos del dueño + negocio | `{ success, clientId }` | Transacción: User + Business + BusinessFeatures |
| `updateClient(clientId, data)` | clientId, { name? } | `{ success }` | Solo update de User.name por ahora |
| `deleteClient(businessId)` | businessId | `{ success }` | Elimina Business (cascade). Safety check primero |

### 1.5 Criterios de Aceptación

- [ ] Crear cliente desde modal en lista de clientes
- [ ] Slug auto-generado desde nombre, editable manualmente
- [ ] Validación de unicidad de email y slug en backend
- [ ] Editar nombre del dueño desde detalle del cliente
- [ ] Eliminar cliente con safety check + confirmación escrita
- [ ] Todo responsivo
- [ ] Toasts de éxito/error consistentes

---

## Fase 2 — ABM Negocios (CRUD)

### 2.1 Concepto

Un **Negocio** es una entidad `Business`. El superadmin necesita crear y editar negocios. La eliminación ya existe con `deleteBusinessSafe`.

### 2.2 Estado Actual

| Operación | Estado | Dónde |
|-----------|--------|-------|
| Listar negocios (paginated) | ✅ Implementado | `/superadmin/businesses/` + `getBusinessesPaginated()` |
| Ver detalle (features, ARCA) | ✅ Implementado | `/[id]/features/`, `/[id]/arca/`, `/[id]/users/` |
| Ver usuarios internos | ✅ Implementado | `/[id]/users/` + `getBusinessUsers()` |
| Eliminar negocio (safe) | ✅ Implementado | `deleteBusinessSafe()` con confirmación |
| **Crear negocio** | ❌ No existe desde UI | Solo raw desde `promoteToAdmin()` |
| **Editar negocio** | ❌ No existe | No hay action para update |

### 2.3 Ruta: `/superadmin/businesses/page.tsx`

**Agregar en el header:**
- Botón "+ Nuevo Negocio" → abre `CreateBusinessDialog`

#### CreateBusinessDialog

**Modal:**
- Nombre del negocio (input, required)
- Slug (input, required, auto-generado, validar unicidad)
- Dueño (input email opcional + lookup):
  - Escribir email → buscar si existe User con ese email
  - Si existe: mostrar nombre y "Asignar como dueño"
  - Si no existe: mostrar "El email no está registrado. Se creará el negocio sin dueño."
- Plan inicial (select: BASIC | PRO | ENTERPRISE, default BASIC)

**Comportamiento:**
- Slug auto-generado, editable
- Dueño opcional — si se asigna, se actualiza `Business.userId`
- Transacción: crea Business + BusinessFeatures (con plan seleccionado)
- Success: toast + refresh tabla

#### EditBusinessDialog

**Modal desde la tabla de negocios (nuevo botón "Editar"):**
- Nombre (input, required)
- Slug (input, required, validar unicidad)
- CUIT (input, validar formato)
- Condición IVA (select: MONOTRIBUTO | RESPONSABLE_INSCRIPTO)
- Dirección (textarea, opcional)
- Estado de cuenta (select: ACTIVO | MOROSO | DESACTIVADO)
- Último pago (date picker, opcional)

**Comportamiento:**
- Guarda cambios en Business
- Revalida path
- Toast de éxito

### 2.4 Server Actions Nuevas

| Action | Input | Output | Notas |
|--------|-------|--------|-------|
| `createBusiness(name, slug, ownerEmail?, plan?)` | Datos del negocio | `{ success, businessId }` | Crea Business + BusinessFeatures. Owner lookup por email. |
| `updateBusiness(businessId, data)` | businessId, datos a cambiar | `{ success }` | Solo modifica lo que viene en data |

### 2.5 Criterios de Aceptación

- [ ] Crear negocio desde modal en lista de negocios
- [ ] Slug auto-generado, editable, validado
- [ ] Asignar dueño por email con lookup
- [ ] Editar datos del negocio (nombre, slug, CUIT, IVA, estado, etc.)
- [ ] Validación de unicidad de slug
- [ ] Todo responsivo

---

## Fase 3 — Catálogo y ABM de Planes

### 3.1 Concepto

Hoy `Plan` es un enum en Prisma (`BASIC | PRO | ENTERPRISE`). Necesitamos un modelo `PlanDefinition` que permita al superadmin gestionar los planes como datos, no como código.

### 3.2 Nuevo Modelo: `PlanDefinition`

```prisma
model PlanDefinition {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  price       Float    @default(0)

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

  isActive    Boolean @default(true)
  displayOrder Int    @default(0)
  isDefault   Boolean @default(false)

  createdAt DateTime @updatedAt
  updatedAt DateTime @updatedAt

  @@map("plan_definitions")
}
```

### 3.3 Integración con Sistema Existente

- `BusinessFeatures.plan` se mantiene como `String` (no FK a PlanDefinition)
- Al crear plan, se seedean los 3 planes originales (BASIC, PRO, ENTERPRISE) en PlanDefinition
- La UI del superadmin lee de `PlanDefinition` para mostrar el catálogo
- Al cambiar de plan desde la UI, se escribe el `name` del PlanDefinition en `BusinessFeatures.plan`
- `getClientsPaginated` y `getBusinessesPaginated` filtran por `BusinessFeatures.plan` como antes

### 3.4 Ruta: `/superadmin/plans/page.tsx` (nueva página)

**Sidebar:** Agregar link "Planes" con icon `Package`

**Header:**
- Breadcrumbs: `Superadmin > Planes`
- Título + descripción
- Botón "+ Nuevo Plan"

**Tabla/Cards de Planes:**
Cada plan muestra:
- Nombre con badge de default
- Descripción
- Precio mensual (formateado)
- Features incluidas (checklist con iconos check/cross)
- Límites (maxUsers, maxProducts)
- Estado (activo/inactivo) con toggle
- Acciones: Editar, Eliminar (solo si no está en uso)

**Nuevo/Editar Plan (dialog o página):**
- Nombre (input, required, unique)
- Descripción (textarea)
- Precio (input number)
- Feature flags (toggles, mismo estilo que FeaturesForm)
- Límites (maxUsers, maxProducts — inputs number)
- Orden de display (input number)
- Default checkbox (solo 1 puede ser default)

### 3.5 Server Actions Nuevas

| Action | Input | Output | Notas |
|--------|-------|--------|-------|
| `getPlans()` | — | `PlanDefinition[]` | Solo activos por defecto, opcional filtro |
| `createPlan(data)` | PlanDefinition data | `{ success, planId }` | Validar nombre único |
| `updatePlan(planId, data)` | planId, data | `{ success }` | Validar nombre único si cambió |
| `deletePlan(planId)` | planId | `{ success }` | Verificar que ningún negocio tenga este plan |

### 3.6 Seed Data

Al migrar, seedear los 3 planes originales:

```typescript
const DEFAULT_PLANS = [
  {
    name: "BASIC",
    description: "Plan básico para pequeños comercios",
    price: 0,
    hasAfipBilling: false,
    hasPublicCatalog: false,
    hasClientLedger: false,
    hasMultiCashbox: false,
    hasSupplierFilter: false,
    hasBudget: false,
    maxUsers: 1,
    maxProducts: 100,
    isActive: true,
    displayOrder: 1,
    isDefault: true,
  },
  {
    name: "PRO",
    description: "Plan profesional para negocios en crecimiento",
    price: 15000,
    hasAfipBilling: true,
    hasPublicCatalog: true,
    hasClientLedger: true,
    hasMultiCashbox: false,
    hasSupplierFilter: false,
    hasBudget: true,
    maxUsers: 5,
    maxProducts: 1000,
    isActive: true,
    displayOrder: 2,
    isDefault: false,
  },
  {
    name: "ENTERPRISE",
    description: "Plan enterprise para grandes operaciones",
    price: 35000,
    hasAfipBilling: true,
    hasPublicCatalog: true,
    hasClientLedger: true,
    hasMultiCashbox: true,
    hasSupplierFilter: true,
    hasBudget: true,
    maxUsers: 999,
    maxProducts: 99999,
    isActive: true,
    displayOrder: 3,
    isDefault: false,
  },
];
```

### 3.7 Criterios de Aceptación

- [ ] Modelo `PlanDefinition` creado con migración
- [ ] Seed data con BASIC/PRO/ENTERPRISE
- [ ] Página de planes con tabla/cards
- [ ] Crear plan con validación de nombre único
- [ ] Editar plan (features, precio, límites)
- [ ] Eliminar plan (verificar que no esté en uso)
- [ ] Toggle activo/inactivo
- [ ] Plan default (solo 1)
- [ ] Sidebar link a Planes

---

## Fase 4 — Logs de Superadmin

### 4.1 Concepto

Cada acción del superadmin debe quedar registrada con timestamp, admin que la ejecutó, y detalles relevantes. Para auditoría, soporte y debugging.

### 4.2 Nuevo Modelo: `SuperadminAuditLog`

```prisma
model SuperadminAuditLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String
  details    Json?
  targetId   String?
  targetType String?
  createdAt  DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
  @@map("superadmin_audit_logs")
}
```

### 4.3 Helper: `src/lib/superadmin-log.ts`

```typescript
// Fire & forget — nunca lanza error ni bloquea la operación principal
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
    // Fire & forget — nunca bloquear
  }
};
```

### 4.4 Acciones a Loggear

| Acción | Action Name | Details | TargetType |
|--------|-------------|---------|------------|
| Crear cliente | `create_client` | { name, email, businessName } | business |
| Editar cliente | `update_client` | { changes } | business |
| Eliminar cliente | `delete_client` | { businessName } | business |
| Crear negocio | `create_business` | { name, slug } | business |
| Editar negocio | `update_business` | { changes } | business |
| Eliminar negocio | `delete_business` | { businessName } | business |
| Registrar pago | `register_payment` | { amount, method } | business |
| Cambiar plan (cliente) | `change_client_plan` | { oldPlan, newPlan } | business |
| Crear plan | `create_plan` | { name, price } | plan |
| Editar plan | `update_plan` | { changes } | plan |
| Eliminar plan | `delete_plan` | { planName } | plan |
| Cambiar features | `update_features` | { changes } | business |

### 4.5 Ruta: `/superadmin/logs/page.tsx`

**Header:**
- Breadcrumbs: `Superadmin > Logs`
- Título + subtítulo

**Filtros:**
- Filtro por acción (select con todas las acciones disponibles)
- Filtro por fecha (desde/hasta)
- Search por targetId o adminId

**Tabla de Logs:**
| Columna | Dato |
|---------|------|
| Fecha/Hora | Formateada |
| Admin | adminId (mostrar email si se puede resolver) |
| Acción | Badge con color por tipo |
| Target | targetId + targetType |
| Detalles | Expandir para ver JSON |

**Paginación:**
- Server-side, 50 items por página
- Los logs son WORM (write once, read many) — no se editan ni eliminan

### 4.6 Server Actions

| Action | Input | Output | Notas |
|--------|-------|--------|-------|
| `getAuditLogs(page, action?, adminId?, from?, to?)` | Filtros | `{ logs[], total, page, totalPages }` | Solo lectura. Ordenado por createdAt DESC |

### 4.7 Criterios de Aceptación

- [ ] Modelo `SuperadminAuditLog` creado con migración
- [ ] Helper `logSuperadminAction` fire & forget
- [ ] Todas las actions existentes y nuevas loggean su acción
- [ ] Página de logs con filtros y paginación
- [ ] Logs WORM (sin editar ni eliminar)
- [ ] Responsive
