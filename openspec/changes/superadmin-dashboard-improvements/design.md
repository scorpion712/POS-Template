# Design — Superadmin Dashboard: Plan de Mejora Integral

**Change**: `superadmin-dashboard-improvements`  
**Estado**: Draft

---

## 0. Estándares Obligatorios (TODAS LAS FASES)

Estos estándares aplican a cada fase, cada action, cada componente. No son opcionales.

### 0.1 TDD — Test-Driven Development

Toda nueva Server Action debe tener su archivo de test ANTES de ser implementada.

**Convención de nombres:**
```
src/__tests__/actions/superadmin/
├── getSuperadminMetrics.test.ts
├── getClientsPaginated.test.ts
├── registerPayment.test.ts
├── changeClientPlan.test.ts
├── getBusinessesPaginated.test.ts
├── deleteBusinessSafe.test.ts
├── getBusinessUsers.test.ts
└── requireFeature.test.ts
```

**Estructura de cada test:**

```typescript
// 1. Mock de dependencias (db, auth)
// 2. Test: usuario no autenticado → error
// 3. Test: usuario no SUPER_ADMIN → error
// 4. Test: input inválido → error (si aplica)
// 5. Test: caso feliz → success + datos correctos
// 6. Test: edge cases (búsqueda sin resultados, páginas vacías, etc.)
// 7. Test: límites (paginación, caracteres, etc.)
```

**Framework de testing:** Usar Vitest (ya configurado en el proyecto).

**Mocking de Prisma:**
```typescript
import { db } from "@/lib/db";
vi.mock("@/lib/db", () => ({
  db: {
    business: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    // ... otros modelos según la action
  },
}));
```

**Mocking de auth:**
```typescript
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
```

### 0.2 Edge Cases — Por Acción

Cada action debe contemplar y testear estos escenarios:

| Categoría | Escenario | Respuesta esperada |
|-----------|-----------|-------------------|
| **Autenticación** | Sin sesión | `{ error: "No autorizado" }` |
| **Autorización** | Rol incorrecto | `{ error: "No autorizado" }` |
| **No encontrado** | ID inválido / no existe | `{ error: "No encontrado" }` o redirect |
| **Input inválido** | Zod validation fail | `{ error: "Campos inválidos" }` con detalles |
| **Vacio** | Búsqueda sin resultados | Array vacío, no error |
| **Límites** | Página > totalPages | Última página válida |
| **Límites** | Search demasiado largo (>100 chars) | Truncar o validar |
| **Concurrencia** | Misma action llamada 2 veces | Transaction protege |
| **DB error** | Prisma lanza excepción | `{ error: "Error interno" }` con console.error |

### 0.3 Migración de Prisma — Safety

**Reglas para nuevos modelos:**
1. Todo nuevo modelo debe tener `@id @default(cuid())` — consistente con el proyecto
2. Toda relación debe tener `onDelete: Cascade` o `SetNull` según el caso
3. Nuevos campos opcionales en modelos existentes deben ser nullable (`String?`, `DateTime?`)
4. Nuevos campos REQUIRED en modelos existentes deben tener `@default(...)` para no romper datos existentes
5. No renombrar campos existentes — crear nuevos y migrar datos en dos pasos si es necesario

**Comando de migración:**
```bash
npx prisma migrate dev --name <nombre_descriptivo>
# Siempre verificar SQL generado antes de aplicar
npx prisma migrate dev --name add_subscription_payments --create-only
# Revisar SQL en prisma/migrations/<id>_add_subscription_payments/migration.sql
# Luego aplicar:
npx prisma migrate dev
```

**Rollback plan:** Cada migración debe poder revertirse con:
```bash
npx prisma migrate dev --name <nombre> --create-only  # generar SQL
# Si algo sale mal:
npx prisma migrate reset  # solo en dev
```

### 0.4 Documentación — Cómo y Por Qué

**En Server Actions:**
```typescript
/**
 * Obtiene clientes paginados con filtros.
 * 
 * @Query: db.business.findMany con userId != null (negocios con dueño)
 * @Cache: React.cache() para dedup en el mismo render
 * @Auth: Requiere SUPER_ADMIN
 * 
 * Por qué userId != null:
 *   Un "cliente" es un User (dueño) que tiene un Business asociado.
 *   No todos los negocios tienen userId (pueden crearse sin dueño desde superadmin).
 *   Filtramos solo los que tienen dueño asignado.
 */
```

**En componentes:**
```typescript
/**
 * ClientsTable
 * 
 * Server Component que renderiza la tabla de clientes.
 * NO tiene estado cliente — los filtros se manejan via URL searchParams.
 * 
 * Por qué Server Component:
 *   - Los datos se resuelven en server (RSC)
 *   - No necesita interactividad propia
 *   - Cero JS enviado al cliente para la tabla
 */
```

**Decisiones importantes (ADR inline):**
```typescript
// ADR: ¿Por qué actualizar accountStatus automáticamente al registrar un pago?
// 
// Opción A: El superadmin cambia manualmente el estado después del pago
// Opción B: Se actualiza automáticamente a ACTIVO al registrar pago
//
// Decisión: Opción B
// Por qué: Si alguien paga, automáticamente está activo.
// El caso "pagó pero queremos mantenerlo desactivado" no existe en la práctica.
// Si surge, se agrega un flag "reactivar" en el formulario de pago.
```

**En el archivo de tests:**
```typescript
/**
 * Tests para registerPayment
 * 
 * Cobertura:
 * - Autenticación: sin sesión, rol incorrecto
 * - Inputs: monto negativo, método inválido, fecha futura
 * - DB: negocio no existe, transacción falla
 * - Happy path: pago registrado, lastPaymentDate actualizado, status → ACTIVO
 */

```

### 0.5 Archivos de Documentación

Se creará un archivo `docs/superadmin/` por fase cuando se implemente:

```
docs/superadmin/
├── OVERVIEW.md           # Visión general del módulo superadmin
├── clients.md            # Gestión de clientes (Fase 2)
├── business-management.md # Gestión de negocios (Fase 3)
├── feature-gates.md      # Feature flags enforcement (Fase 5)
└── arca-config.md        # Configuración ARCA (Fase 7)
```

---

## Fase 1 — Dashboard + Layout

*(Completada — ver documento anterior)*

---

## Fase 2 — Gestión de Clientes (Dueños de Negocios)

### 2.1 Arquitectura de Componentes

```
Router:
  /superadmin/clients
    └── page.tsx (Server Component — lista de clientes)

  /superadmin/clients/[id]
    └── page.tsx (Server Component — detalle del cliente)

Component Tree (lista):
  clients/page.tsx (RSC)
  ├── Header (gradient card with breadcrumbs)
  ├── SearchBar + Filters (Client Component)
  │   └── useDebounce para search input
  ├── ClientsTable (Server Component)
  │   └── paginación server-side
  └── PaginationControls (Client Component)

Component Tree (detalle):
  clients/[id]/page.tsx (RSC)
  ├── Header (gradient card with breadcrumbs)
  ├── ClientResumeCard (Server Component)
  ├── ClientActions (Client Component)
  │   ├── ChangePlanDialog (Client Component — modal)
  │   └── RegisterPaymentDialog (Client Component — modal)
  ├── PaymentHistoryTable (Server Component)
  │   └── paginación server-side
  └── BusinessInfoCard (Server Component)
```

### 2.2 Data Flow

#### Lista de clientes
```
Request → clients/page.tsx (RSC)
  → Lee searchParams: page, search, status, plan
  → getClientsPaginated(page, search, status, plan)
    → db.business.findMany({
        where: { 
          userId: { not: null },
          OR: search terms,
          accountStatus: status filter,
          features: { plan: plan filter }
        },
        include: { users, features },
        skip, take, orderBy
      })
    → db.business.count({ where: same filters })
  → Renderiza tabla + paginación
```

#### Detalle del cliente
```
Request → clients/[id]/page.tsx (RSC)
  → Lee params.id (businessId)
  → getClientDetail(businessId)
    → db.business.findUnique({
        where: { id: businessId },
        include: {
          users: { where: owner },  // el owner
          features: true,
          payments: {
            orderBy: { paidAt: "desc" },
            take: 10
          }
        }
      })
  → Renderiza resumen + historial + info negocio
```

#### Registrar pago (acción de cliente)
```
RegisterPaymentDialog (Client)
  → Formulario con amount, method, reference, notes, paidAt
  → Submit: registerPayment(businessId, data) (Server Action)
    → 1. Validar rol SUPER_ADMIN
    → 2. Validar input con Zod
    → 3. db.$transaction(async (tx) => {
          tx.subscriptionPayment.create({ data })
          tx.business.update({
            where: { id: businessId },
            data: { 
              lastPaymentDate: paidAt,
              accountStatus: "ACTIVO"  // auto-reactivar si estaba moroso
            }
          })
        })
    → 4. revalidatePath()
    → 5. Return { success }
  → Toast éxito → router.refresh()
```

#### Cambiar plan (acción de cliente)
```
ChangePlanDialog (Client)
  → Selección de plan con cards
  → Confirmación con impacto
  → Submit: changeClientPlan(businessId, newPlan) (Server Action)
    → db.businessFeatures.upsert({
        where: { businessId },
        update: { plan: newPlan },
        create: { businessId, plan: newPlan, ...defaults }
      })
    → revalidatePath()
    → Return { success }
```

### 2.3 Prisma: Nuevo Modelo

```prisma
// ADR: SubscriptionPayment como modelo separado
// 
// Por qué no un campo JSON en Business:
//   - Necesitamos queryar por fechas, montos, métodos
//   - JSON no permite índices ni joins eficientes
//   - Un modelo separado escala a miles de pagos
//
// Por qué onDelete: Cascade:
//   - Si se elimina un negocio, sus pagos no tienen sentido
//   - Consistente con el resto del schema
//
// recordedBy como String (no relación):
//   - El superadmin que registró puede eliminarse del sistema
//   - No queremos perder la trazabilidad por un DELETE CASCADE

model SubscriptionPayment {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  amount     Float
  method     String      // EFECTIVO | TRANSFERENCIA | MERCADOPAGO | OTRO
  reference  String?
  notes      String?
  
  paidAt     DateTime    @default(now())
  recordedAt DateTime    @default(now())
  recordedBy String      // userId del superadmin

  @@index([businessId, paidAt])
}

// Agregar a Business:
//   payments       SubscriptionPayment[]
```

### 2.4 Server Actions + TDD

---

#### Action: `getClientsPaginated`

```typescript
/**
 * Obtiene lista paginada de clientes (negocios con dueño).
 * 
 * @Auth Requiere: SUPER_ADMIN
 * @Cache React.cache() para dedup
 * @Params page, search?, status?, plan?
 * @Returns { clients[], total, page, totalPages }
 *
 * ¿Por qué userId NOT NULL?
 *   Un "cliente" es un negocio que TIENE dueño asignado.
 *   Negocios sin userId son huérfanos (creados desde superadmin sin asignar).
 *   Esos NO son clientes (no pagan).
 */
```

**Tests requeridos (`src/__tests__/actions/superadmin/getClientsPaginated.test.ts`):**

| # | Escenario | Setup | Assert |
|---|-----------|-------|--------|
| 1 | Sin sesión | `auth()` → null | `{ error: "No autorizado" }` |
| 2 | Rol USER | `auth()` → `{ role: "USER" }` | `{ error: "No autorizado" }` |
| 3 | Rol ADMIN | `auth()` → `{ role: "ADMIN" }` | `{ error: "No autorizado" }` |
| 4 | Happy path sin filtros | db.business.findMany → 3 results, count → 3 | clients.length === 3, total === 3 |
| 5 | Búsqueda por email | search = "test@test.com" | WHERE correcto con OR + contains |
| 6 | Búsqueda sin resultados | findMany → [], count → 0 | clients.length === 0, total === 0 |
| 7 | Filtro por status MOROSO | status = "MOROSO" | WHERE accountStatus === "MOROSO" |
| 8 | Filtro por plan PRO | plan = "PRO" | WHERE features.plan === "PRO" |
| 9 | Página 2 con datos | page = 2, findMany → 5 results, count → 25 | skip === 20, take === 20, page === 2, totalPages === 2 |
| 10 | Página más allá del total | page = 999, findMany → [], count → 5 | clients.length === 0, page === 999 |
| 11 | Search vacío ("") | search = "" | Mismo que sin filtro |
| 12 | Caracteres especiales en search | search = "ñoñería & <script>" | No debe crashear (sanitizado por Prisma) |

**Edge cases:** IDs inválidos, SQL injection (Prisma prepara queries), Unicode en búsqueda.

---

#### Action: `getClientDetail`

```typescript
/**
 * Obtiene detalle completo de un cliente (negocio + dueño + features + pagos).
 * 
 * @Auth Requiere: SUPER_ADMIN
 * @Params businessId (string)
 * @Returns ClientDetail | { error }
 * @Throws no — siempre devuelve response estructurado
 */
```

**Tests requeridos:**

| # | Escenario | Setup | Assert |
|---|-----------|-------|--------|
| 1 | Sin sesión | auth → null | `{ error: "No autorizado" }` |
| 2 | Negocio no existe | findUnique → null | `{ error: "Negocio no encontrado" }` |
| 3 | Negocio existe sin dueño | findUnique → business, userId = null | owner === null (no error) |
| 4 | Negocio existe sin features | findUnique → business, features = null | features === null (no error) |
| 5 | Negocio existe sin pagos | findUnique → business, payments = [] | recentPayments.length === 0 |
| 6 | Happy path completo | findUnique → full data | Todos los campos mapeados correctamente |
| 7 | ID mal formado | businessId = "invalid!" | Prisma no crashea (cuid es string, no valida formato) |

**Edge cases:** Negocio sin dueño (userId null), negocio sin features, businessId vacío.

---

#### Action: `registerPayment`

```typescript
/**
 * Registra un pago de suscripción manual para un cliente.
 * 
 * Crea SubscriptionPayment + actualiza Business.lastPaymentDate + reactiva accountStatus.
 * Todo en una transacción.
 * 
 * ADR: ¿Por qué reactivar automáticamente?
 *   Si un cliente moroso paga, debe volver a ACTIVO automáticamente.
 *   No hay caso de uso para "pagó pero sigue desactivado".
 *   Si surge, agregamos checkbox "reactivar" en el formulario.
 *
 * @Auth Requiere: SUPER_ADMIN
 * @Params businessId, { amount, method, reference?, notes?, paidAt? }
 * @Transaction Crea pago + actualiza negocio
 */
```

**Tests requeridos:**

| # | Escenario | Setup | Assert |
|---|-----------|-------|--------|
| 1 | Sin sesión | auth → null | `{ error: "No autorizado" }` |
| 2 | Rol USER | auth → `{ role: "USER" }` | `{ error: "No autorizado" }` |
| 3 | Monto negativo | amount = -100 | Zod validation error |
| 4 | Monto = 0 | amount = 0 | Zod validation error |
| 5 | Método inválido | method = "CREDIT_CARD" | Zod validation error |
| 6 | Fecha futura | paidAt = tomorrow | Zod validation error (max: new Date()) |
| 7 | Negocio no existe | update crashea (Prisma P2025) | `{ error: "Error al registrar el pago" }` |
| 8 | Happy path (moroso → activo) | accountStatus = "MOROSO", paid | newStatus = "ACTIVO", lastPaymentDate updated |
| 9 | Happy path (ya activo) | accountStatus = "ACTIVO", paid | Sigue ACTIVO, lastPaymentDate updated |
| 10 | Transacción falla (DB error) | subscriptionPayment.create lanza error | Rollback, no se actualiza business |
| 11 | Sin notas ni referencia | notes = undefined, reference = undefined | Crea pago sin esos campos |
| 12 | paidAt por defecto | paidAt = undefined | Usa new Date() (fecha actual) |

**Edge cases:** Monto con decimales (Float), reference muy larga (>500 chars), transacción concurrente.

---

#### Action: `changeClientPlan`

```typescript
/**
 * Cambia el plan de un cliente (BusinessFeatures.plan).
 * 
 * Usa upsert para crear BusinessFeatures si no existe (ej: plan nunca configurado).
 * Actualiza SOLO el plan — los toggles individuales se mantienen.
 * 
 * ADR: ¿Por qué upsert y no update?
 *   Un negocio puede no tener BusinessFeatures si nunca se configuró.
 *   upsert crea el registro con defaults si no existe.
 *
 * @Auth Requiere: SUPER_ADMIN
 * @Transaction upsert en BusinessFeatures
 */
```

**Tests requeridos:**

| # | Escenario | Setup | Assert |
|---|-----------|-------|--------|
| 1 | Sin sesión | auth → null | `{ error: "No autorizado" }` |
| 2 | Rol ADMIN | auth → `{ role: "ADMIN" }` | `{ error: "No autorizado" }` |
| 3 | Plan inválido | newPlan = "ULTRA" | TypeScript catch (Plan enum) |
| 4 | BusinessFeatures existe (update) | findUnique → features exists | upsert con update |
| 5 | BusinessFeatures NO existe (create) | findUnique → null | upsert con create + defaults |
| 6 | Plan cambia de BASIC a PRO | plan change | upsert llamado con plan = PRO |
| 7 | Mismo plan (sin cambios) | plan = mismo | upsert igual funciona (sin error) |
| 8 | Negocio no existe | upsert con businessId inválido | Prisma FK error → catch → `{ error }` |

**Edge cases:** Mismo plan (idempotente), businessId inexistente (FK violation).

---

### 2.5 Estados de Componentes

#### SearchBar + Filters

```typescript
/**
 * SearchFilters
 * 
 * Client Component — maneja estado de búsqueda y filtros.
 * Los filtros se sincronizan con URL searchParams para:
 *   1. URLs compartibles
 *   2. Server-side rendering con filtros aplicados
 *   3. Botón "atrás" del navegador funcional
 *
 * Estados:
 * - idle: search vacío, filtros por defecto (TODOS)
 * - searching: usuario escribe (debounce 300ms)
 * - filtered: filtros activos, pills visibles
 * - empty: sin resultados
 *
 * Por qué debounce 300ms:
 *   - Suficiente para evitar llamadas innecesarias
 *   - No tan largo que se sienta lento
 */
```

#### RegisterPaymentDialog

```typescript
/**
 * RegisterPaymentDialog
 * 
 * Client Component — Dialog de ShadCN para registrar pago manual.
 * Validación con Zod en cliente ANTES de enviar al server.
 * 
 * Estados:
 * - closed: oculto
 * - open: formulario visible
 * - submitting: botón disabled + spinner
 * - success: toast + cierra + refresh
 * - error: mensaje en el dialog
 *
 * Validación Zod:
 *   amount: z.number().positive()
 *   method: z.enum(["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO", "OTRO"])
 *   paidAt: z.date().max(new Date()) — no futuros
 */
```

#### ChangePlanDialog

```typescript
/**
 * ChangePlanDialog
 * 
 * Client Component — selección de plan con cards (mismo estilo que FeaturesForm).
 * Confirmación obligatoria antes de aplicar.
 * 
 * ADR: ¿Por qué dos pasos (seleccionar + confirmar)?
 *   Cambiar un plan afecta los límites del negocio (maxUsers, maxProducts).
 *   El superadmin debe confirmar que entiende el impacto.
 *   Evita cambios accidentales.
 */
```

### 2.6 Migración de Base de Datos

```bash
# Agregar modelo SubscriptionPayment
# No modifica tablas existentes — riesgo CERO de romper datos actuales

npx prisma migrate dev --name add_subscription_payments

# Verificar SQL generado:
#   CREATE TABLE "SubscriptionPayment" (
#     "id" TEXT NOT NULL,
#     "businessId" TEXT NOT NULL,
#     ...
#     CONSTRAINT "SubscriptionPayment_businessId_fkey" FOREIGN KEY ...
#   );
#   
#   CREATE INDEX "SubscriptionPayment_businessId_paidAt_idx" ...

# Rollback:
# npx prisma migrate reset  # solo en dev
```

### 2.7 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | ➕ `SubscriptionPayment` + payments relation en Business |
| `src/app/superadmin/clients/page.tsx` | ➕ Nueva página |
| `src/app/superadmin/clients/[id]/page.tsx` | ➕ Nueva página |
| `src/components/Superadmin/ClientsTable.tsx` | ➕ Nuevo |
| `src/components/Superadmin/ClientResumeCard.tsx` | ➕ Nuevo |
| `src/components/Superadmin/PaymentHistoryTable.tsx` | ➕ Nuevo |
| `src/components/Superadmin/RegisterPaymentDialog.tsx` | ➕ Nuevo |
| `src/components/Superadmin/ChangePlanDialog.tsx` | ➕ Nuevo |
| `src/components/Superadmin/SearchFilters.tsx` | ➕ Nuevo (reutilizable) |
| `src/components/Superadmin/PaginationControls.tsx` | ➕ Nuevo (reutilizable) |
| `src/actions/superadmin.ts` | ➕ 4 new actions |
| `src/__tests__/actions/superadmin/getClientsPaginated.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/getClientDetail.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/registerPayment.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/changeClientPlan.test.ts` | ➕ Tests |

---

## Fase 3 — Gestión Avanzada de Negocios

### 3.1 Arquitectura

Reutiliza componentes de Fase 2: `SearchFilters`, `PaginationControls`.

### 3.2 Server Actions + TDD

#### Action: `getBusinessesPaginated`

```typescript
/**
 * Obtiene lista paginada de negocios con métricas y filtros.
 * 
 * A diferencia de getClientsPaginated, este NO filtra por userId != null.
 * Muestra TODOS los negocios (incluso huérfanos sin dueño).
 * 
 * @Auth Requiere: SUPER_ADMIN
 * @Includes _count.products, _count.orders, owner (users where role=ADMIN), features.plan
 */
```

**Tests requeridos (`src/__tests__/actions/superadmin/getBusinessesPaginated.test.ts`):**

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | Sin sesión → error | `{ error: "No autorizado" }` |
| 2 | Rol incorrecto → error | `{ error: "No autorizado" }` |
| 3 | Happy path con datos | businesses.length > 0, includes _count |
| 4 | Búsqueda por nombre | WHERE correcto con contains |
| 5 | Búsqueda por slug | WHERE correcto con contains |
| 6 | Sin resultados | businesses.length === 0 |
| 7 | Filtro por status DESACTIVADO | WHERE accountStatus === "DESACTIVADO" |
| 8 | Paginación normal | skip, take correctos |
| 9 | Negocio sin dueño (userId null) | ownerEmail = null (no error) |
| 10 | Negocio sin features | plan default "BASIC" (no error) |

#### Action: `deleteBusinessSafe`

```typescript
/**
 * Elimina un negocio con verificación previa de datos asociados.
 * 
 * A diferencia de deleteBusiness actual:
 *   1. Primero obtiene counts de datos a eliminar
 *   2. Devuelve counts para mostrar advertencia
 *   3. Solo elimina si se llama con confirm: true
 * 
 * ADR: ¿Por qué dos pasos y no un modal en cliente?
 *   Los counts pueden cambiar entre la advertencia y la confirmación.
 *   Pero es un riesgo aceptable (milisegundos de diferencia).
 *   Si queremos exactos, deberíamos hacer delete con returning.
 *
 * @Auth Requiere: SUPER_ADMIN
 * @Risk Elimina en CASCADE: productos, órdenes, clientes, etc.
 */
```

**Tests requeridos (`src/__tests__/actions/superadmin/deleteBusinessSafe.test.ts`):**

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | Sin sesión → error | `{ error: "No autorizado" }` |
| 2 | Sin confirm → devuelve counts | `{ warning: { products, orders, clients } }` |
| 3 | Con confirm + business existe → success | `{ success: "Negocio eliminado" }` |
| 4 | Business no existe → error | `{ error: "Negocio no encontrado" }` |
| 5 | Confirm true pero businessId inválido | Prisma error → catch → `{ error }` |

### 3.3 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/app/superadmin/businesses/page.tsx` | 🔄 Rediseño con search/filtros/paginación |
| `src/actions/superadmin.ts` | ➕ `getBusinessesPaginated()` + `deleteBusinessSafe()` |
| `src/components/Superadmin/DeleteBusinessButton.tsx` | 🔄 Mejorado con warning detallado |
| `src/__tests__/actions/superadmin/getBusinessesPaginated.test.ts` | ➕ Tests |
| `src/__tests__/actions/superadmin/deleteBusinessSafe.test.ts` | ➕ Tests |

---

## Fase 4 — Visualización de Usuarios Internos

### 4.1 Arquitectura

Server Component puro. Sin estado cliente. Una sola action de solo lectura.

### 4.2 Server Action + TDD

#### Action: `getBusinessUsers`

```typescript
/**
 * Obtiene usuarios internos de un negocio (empleados/cajeros).
 * SOLO LECTURA — no hay acciones de modificación.
 * 
 * ¿Por qué solo lectura?
 *   El superadmin no debe gestionar el personal de cada negocio.
 *   Esa es responsabilidad del ADMIN del negocio.
 *   El superadmin solo necesita visibilidad para soporte/auditoría.
 * 
 * @Auth Requiere: SUPER_ADMIN
 * @Includes cashbox.name, role
 */
```

**Tests requeridos (`src/__tests__/actions/superadmin/getBusinessUsers.test.ts`):**

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | Sin sesión → error | `{ error: "No autorizado" }` |
| 2 | Rol incorrecto → error | `{ error: "No autorizado" }` |
| 3 | Negocio con usuarios | users.length > 0, includes cashbox info |
| 4 | Negocio sin usuarios | users.length === 0 |
| 5 | Negocio no existe | findMany → [] (no error, vacío) |
| 6 | Usuario sin caja asignada | cashbox = null (no error) |

### 4.3 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/app/superadmin/businesses/[id]/users/page.tsx` | ➕ Nueva página |
| `src/actions/superadmin.ts` | ➕ `getBusinessUsers()` |
| `src/components/Superadmin/UsersTable.tsx` | ➕ Nuevo |
| `src/__tests__/actions/superadmin/getBusinessUsers.test.ts` | ➕ Tests |

---

## Fase 5 — Feature Flag Enforcement

### 5.1 `src/lib/feature-gates.ts`

```typescript
/**
 * Feature Gates — Enforcement de BusinessFeatures en backend.
 * 
 * ¿Por qué existe este archivo?
 *   Los feature flags actuales solo ocultan UI.
 *   Un usuario con plan BASIC puede llamar cualquier action directamente.
 *   Este helper valida en backend que el feature esté habilitado.
 * 
 * Uso:
 *   await requireFeature(businessId, "afip-billing");
 *   // Si el feature no está habilitado → lanza FeatureNotEnabledError
 *   // Si está habilitado → continúa normalmente
 * 
 * ADR: ¿Error o response estructurado?
 *   Elegimos error (throw) porque:
 *   1. El caller (action) atrapa y devuelve { error }
 *   2. Si olvidamos el try/catch, Next.js devuelve 500 → nos damos cuenta
 *   3. No podemos "olvidar" manejar el error porque TypeScript no nos deja ignorar un throw
 *   
 *   Alternativa descartada: return boolean
 *   - Fácil de ignorar (nadie checkea el return)
 *   - Más boilerplate en cada action
 */
```

### 5.2 Estado real de implementation

| Feature | Estado | Archivos |
|---------|--------|----------|
| `afip-billing` | ✅ Ya implementado | `afip.ts` — `requireFeature(businessId, "afip-billing")` |
| `public-catalog` | ✅ Ya implementado | `catalog.ts` — `requireFeature(businessId, "public-catalog")` (x2) |
| `multi-cashbox` | ✅ Ya implementado | `cashbox.ts` — `requireFeature(businessId, "multi-cashbox")` (x2) |
| `client-ledger` | ✅ Ya implementado | `orders.ts`, `unpaid-orders.ts`, `ledger/index.ts` (x5) |
| `supplier-filter` | ❌ Pendiente | `stock.ts` — ver abajo |

### 5.3 Supplier-filter — Implementación detallada

**Archivo**: `src/actions/stock.ts`

**Actions a modificar:**

#### `getProductByCode(code, supplierId?)`

```typescript
export const getProductByCode = async (code: string, supplierId?: string) => {
  const session = await auth();
  if (!session?.user?.businessId) return null;

  // Feature gate: supplier-filter
  if (supplierId) {
    try {
      await requireFeature(session.user.businessId, "supplier-filter");
    } catch (e) {
      if (e instanceof FeatureNotEnabledError) {
        supplierId = undefined; // silent fallback
      }
    }
  }

  try {
    const product = await db.product.findFirst({
      where: {
        businessId: session.user.businessId,
        OR: [
          { code: code },
          { codebar: code },
        ],
        ...(supplierId ? { supplierId } : {}),
      },
      include: { supplier: true, brand: true, category: true, subCategory: true },
    });
    return product;
  } catch (error) {
    console.error(error);
    return null;
  }
};
```

#### `getProductsBySearch(query, supplierId?)`

Misma lógica: si `supplierId` está presente, verificar feature gate. Si no está habilitado, usar `supplierId = undefined`.

**Tests (`src/__tests__/actions/stock/supplier-filter.test.ts`):**

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | `getProductByCode` con `supplierId` + feature habilitado | Filtra por proveedor normalmente |
| 2 | `getProductByCode` con `supplierId` + feature deshabilitado | Ignora `supplierId` (sin filtro) |
| 3 | `getProductsBySearch` con `supplierId` + feature habilitado | Filtra por proveedor |
| 4 | `getProductsBySearch` con `supplierId` + feature deshabilitado | Ignora `supplierId` |
| 5 | `getProductByCode` sin `supplierId` (siempre funciona) | Sin cambios |
| 6 | `getProductsBySearch` sin `supplierId` (siempre funciona) | Sin cambios |

**Estrategia: silent fallback**

A diferencia de otros feature gates que lanzan error, `supplier-filter` usa **silent fallback**:
- No bloquea la operación
- Simplemente ignora el filtro de proveedor
- El usuario ve todos los productos (sin filtrar), como si no hubiera seleccionado proveedor

**¿Por qué?** El filtro por proveedor es una comodidad en la UI de facturación, no una funcionalidad crítica. Si el plan no lo incluye, degradar silenciosamente es mejor UX que mostrar un error.

### 5.4 Tests existentes para `requireFeature` (`src/__tests__/lib/feature-gates.test.ts`)

✅ 5 tests ya implementados y pasando:

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | Feature existe y habilitado | No lanza error |
| 2 | Feature existe pero deshabilitado | Lanza FeatureNotEnabledError |
| 3 | BusinessFeatures no existe (null) | Lanza FeatureNotEnabledError |
| 4 | Feature string inválido | Lanza Error("Feature desconocido") |
| 5 | BusinessId inválido (no existe en DB) | findUnique → null, FeatureNotEnabledError |

### 5.5 Archivos afectados (solo supplier-filter)

| Archivo | Acción |
|---------|--------|
| `src/actions/stock.ts` | 🔄 Agregar `requireFeature` + `FeatureNotEnabledError` import, checks en `getProductByCode` y `getProductsBySearch` |
| `src/__tests__/actions/stock/supplier-filter.test.ts` | ➕ Tests nuevos |

---

## Fase 6 — Sidebar Responsive

*(Ya diseñado en Fase 1. Aquí se detalla implementación compartida)*

### 6.1 SuperadminSidebar

```typescript
/**
 * SuperadminSidebar
 * 
 * Client Component: necesita usePathname(), useTheme(), useState (hover/mobile).
 * 
 * Comportamiento:
 * - Desktop: colapsada (64px), expande en hover (240px)
 * - Tablet: colapsada (64px), tooltips en hover
 * - Mobile: oculta, hamburger toggle con overlay
 * 
 * Links dinámicos desde array:
 *   Agregar nuevo item al array = aparece en sidebar.
 *   No requiere tocar el componente.
 * 
 * Badges dinámicos:
 *   clientCount, businessCount se pasan como props desde layout.tsx (RSC).
 *   Se obtienen con queries ligeras (count) en el layout.
 * 
 * ADR: ¿Por qué pasar counts como props y no fetch directo en sidebar?
 *   layout.tsx es Server Component → puede hacer queries a DB.
 *   SuperadminSidebar es Client Component → no puede hacer queries directas.
 *   Pasamos datos resueltos como props.
 */
```

**Tests requeridos (si aplica — componente visual, test de render):**

| Escenario | Assert |
|-----------|--------|
| Renderiza todos los nav items | 3 links visibles |
| Active link highlight según pathname | El link correcto marcado |
| Badge de conteo visible | Números renderizados |
| Tema toggle funciona | Tema cambia al clickear |

### 6.2 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/components/Superadmin/SuperadminSidebar.tsx` | ➕ Nuevo (o actualizar si ya existe de Fase 1) |
| `src/app/superadmin/layout.tsx` | 🔄 Pasar counts como props |

---

## Fase 7 — Validaciones ARCA

### 7.1 `src/lib/validators.ts`

```typescript
/**
 * Validadores específicos para ARCA (AFIP).
 * 
 * validateCuit():
 *   Algoritmo módulo 11 usado por AFIP para validar CUIT/CUIL.
 *   Fuente: RG AFIP 3928
 *   
 *   Formato aceptado: XX-XXXXXXXX-X o XXXXXXXXXXX (11 dígitos)
 *   Ej: 20-12345678-9
 *   
 *   ¿Por qué no validar formato con guiones?
 *     El usuario puede ingresar 20123456789 (sin guiones).
 *     Limpiamos internamente ambos formatos.
 * 
 * validateCertPEM():
 *   Valida que el certificado comience con -----BEGIN CERTIFICATE-----
 *   Es un check básico de formato, NO valida el contenido criptográfico.
 *   La validación real la hace AFIP al intentar facturar.
 *   
 *   ¿Por qué aceptar vacío?
 *     El campo es opcional en el formulario (solo se llena para actualizar).
 *     Si está vacío, no se actualiza el certificado existente.
 */
```

**Tests requeridos (`src/__tests__/lib/validators.test.ts`):**

| # | Escenario | Assert |
|---|-----------|--------|
| 1 | CUIT válido 20-12345678-9 | `validateCuit("20-12345678-9")` → true |
| 2 | CUIT válido sin guiones 20123456789 | `validateCuit("20123456789")` → true |
| 3 | CUIT inválido (dígito mal) | `validateCuit("20-12345678-8")` → false |
| 4 | CUIT muy corto | `validateCuit("12345")` → false |
| 5 | CUIT con letras | `validateCuit("20-ABCD5678-9")` → false |
| 6 | CUIT vacío | `validateCuit("")` → false |
| 7 | Cert PEM válido | `validateCertPEM("-----BEGIN CERTIFICATE-----\n...")` → true |
| 8 | Cert sin formato PEM | `validateCertPEM("solo texto")` → false |
| 9 | Cert vacío (opcional) | `validateCertPEM("")` → true |
| 10 | Key PEM válida (PKCS8) | `validateKeyPEM("-----BEGIN PRIVATE KEY-----\n...")` → true |
| 11 | Key PEM válida (RSA) | `validateKeyPEM("-----BEGIN RSA PRIVATE KEY-----\n...")` → true |
| 12 | Key sin formato PEM | `validateKeyPEM("clave")` → false |

### 7.2 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/lib/validators.ts` | ➕ Nuevo |
| `src/schemas/index.ts` | 🔄 Validaciones en ArcaFieldsSchema |
| `src/__tests__/lib/validators.test.ts` | ➕ Tests |

---

## Fase 8 — Consistencia de UX

### 8.1 Migración de `alert()` a `sonner` toasts

```typescript
/**
 * PromoteUserButton — migración de alert() a sonner toast.
 * 
 * Por qué:
 *   alert() bloquea el navegador y se ve mal.
 *   sonner toast es no-bloqueante y consistente con el resto de la app.
 * 
 * Cambio:
 *   - alert(data.error) → toast.error(data.error)
 *   - Sin feedback en éxito → toast.success("Usuario promovido correctamente")
 */
```

**Tests:** No aplica (cambio puramente visual).

### 8.2 Estandarización de imports

```typescript
/**
 * Estandarizar imports de auth.
 * 
 * Problema: Algunos archivos importan con ruta relativa (../../auth),
 * otros con alias (@/lib/auth).
 * 
 * Solución: Usar @/lib/auth en TODOS los archivos del superadmin.
 * 
 * Archivos a modificar:
 *   - layout.tsx: "../../../auth" → "@/lib/auth"
 *   - dashboard/page.tsx: "../../../../auth" → "@/lib/auth"  
 *   - businesses/page.tsx: "../../../../auth" → "@/lib/auth"
 *   - actions/arca.ts: "../../auth" → "@/lib/auth"
 */
```

### 8.3 Componente EmptyState (nuevo)

```typescript
/**
 * EmptyState — componente reutilizable para tablas vacías.
 * 
 * Uso: <EmptyState icon={<Users />} title="Sin clientes" description="..." />
 * 
 * Por qué: Consistencia visual en todos los estados vacíos del superadmin.
 * Cada tabla usa el mismo componente → misma apariencia → misma experiencia.
 */
```

### 8.4 Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/components/Superadmin/promote-button.tsx` | 🔄 alert() → toast |
| `src/components/Superadmin/delete-business-button.tsx` | 🔄 alert() → toast |
| `src/components/ui/empty-state.tsx` | ➕ Nuevo componente |
| `src/app/superadmin/layout.tsx` | 🔄 Import fix |
| `src/app/superadmin/dashboard/page.tsx` | 🔄 Import fix |
| `src/app/superadmin/businesses/page.tsx` | 🔄 Import fix + header style |
| `src/app/superadmin/businesses/[id]/arca/page.tsx` | 🔄 Header style |
| `src/actions/arca.ts` | 🔄 Import fix |
