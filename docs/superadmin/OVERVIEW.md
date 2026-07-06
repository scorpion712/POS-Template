# Superadmin Dashboard — Documentación Integral

> **Versión:** 1.0  
> **Última actualización:** 2026-06-23  
> **Estado:** 6 de 8 fases completadas

---

## Índice

1. [Propósito y Alcance](#1-propósito-y-alcance)
2. [Arquitectura Multi-Tenant](#2-arquitectura-multi-tenant)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Sistema de Planes y Feature Flags](#4-sistema-de-planes-y-feature-flags)
5. [Rutas y Pages](#5-rutas-y-pages)
6. [Server Actions](#6-server-actions)
7. [Componentes Compartidos](#7-componentes-compartidos)
8. [Fases Completadas](#8-fases-completadas)
9. [Fases Planificadas](#9-fases-planificadas)
10. [Lo que Falta](#10-lo-que-falta)
11. [Decisiones de Arquitectura (ADRs)](#11-decisiones-de-arquitectura-adrs)

---

## 1. Propósito y Alcance

El **Superadmin Dashboard** es el panel de administración del SaaS. El superadmin **no** es un usuario del sistema POS — es el dueño de la plataforma que gestiona a los clientes que **pagan** por usar el software.

### ¿Qué puede hacer el superadmin?

| Acción | Estado |
|--------|--------|
| Ver dashboard con métricas globales | ✅ Completado |
| Listar clientes (dueños de negocio) con búsqueda y filtros | ✅ Completado |
| Ver detalle de cliente: datos, plan, pagos, estado | ✅ Completado |
| Registrar pagos de suscripción manuales | ✅ Completado |
| Cambiar plan de un cliente (BASIC/PRO/ENTERPRISE) | ✅ Completado |
| Listar negocios con búsqueda, filtros, paginación | ✅ Completado |
| Eliminar negocio con advertencia de datos asociados | ✅ Completado |
| Ver usuarios internos de cada negocio (solo lectura) | ✅ Completado |
| Configurar features y plan de un negocio | ✅ Completado |
| Enforcement de feature flags en backend | ✅ Completado |
| Configuración ARCA (AFIP) de cada negocio | ✅ Completado |
| Validar CUIT (módulo 11) y formato de certificados | 🔲 Planificado (Fase 7) |
| Toasts en vez de `alert()` | 🔲 Planificado (Fase 8) |

### ¿Qué NO puede hacer el superadmin?

- ✗ **Crear/editar/eliminar usuarios internos** de cada negocio (eso lo hace el ADMIN del negocio)
- ✗ **Gestionar productos, stock, órdenes** de los negocios
- ✗ **Ver métricas financieras detalladas** por negocio
- ✗ **Logs de actividad** del propio superadmin

---

## 2. Arquitectura Multi-Tenant

El sistema es **multi-tenant por negocio**. Cada `Business` es un tenant independiente con sus propios datos (productos, clientes, órdenes, etc.).

### 2.1 Jerarquía de entidades

```
SUPERADMIN (dueño de la plataforma)
│
├── CLIENTE (dueño de un negocio, USER.role = ADMIN)
│   └── BUSINESS (tenant)
│       ├── USUARIOS INTERNOS (empleados/cajeros, USER.role = USER | ADMIN)
│       ├── PRODUCTOS
│       ├── CLIENTES FINALES (del negocio)
│       ├── ÓRDENES
│       └── ... (stock, cajas, etc.)
│
├── CLIENTE 2
│   └── BUSINESS 2
│       └── ...
│
└── NEGOCIOS HUÉRFANOS (BUSINESS sin userId)
    └── Pueden existir pero NO son clientes (no pagan)
```

### 2.2 Clarificación de términos

| Término | Significado | Ejemplo |
|---------|-------------|---------|
| **Cliente** (dueño) | Persona que PAGA el SaaS. Tiene un `Business` asociado vía `userId`. | "Cliente registrado", "Pago de cliente" |
| **Usuario** (interno) | Empleado/cajero que cada negocio crea. `role: USER \| ADMIN`. | "Cajero del mostrador" |
| **Negocio** (business) | Entidad comercial que el cliente posee. Es el tenant. | "Restaurante X", "Almacén Y" |
| **Cliente final** | Cliente del negocio (comprador). Entidad `Client` en Prisma. | "Juan Pérez compró 10 unidades" |

### 2.3 Diagrama de contexto

```mermaid
graph TD
    subgraph "Plataforma SaaS"
        SA[SUPERADMIN<br/>dueño de la plataforma]
    end
    
    subgraph "Tenant: negocio A"
        OWNER_A[Cliente / Dueño<br/>role: ADMIN]
        OWNER_A --> BIZ_A[Business A]
        BIZ_A --> U1[Usuario interno<br/>role: USER]
        BIZ_A --> U2[Usuario interno<br/>role: ADMIN]
        BIZ_A --> CF1[Cliente final<br/>comprador]
        BIZ_A --> P1[Productos]
        BIZ_A --> O1[Órdenes]
    end
    
    subgraph "Tenant: negocio B"
        OWNER_B[Cliente / Dueño<br/>role: ADMIN]
        OWNER_B --> BIZ_B[Business B]
        BIZ_B --> U3[Usuario interno]
        BIZ_B --> CF2[Cliente final]
    end
    
    SA -.->|Gestiona| OWNER_A
    SA -.->|Gestiona| OWNER_B
    SA -.->|Ve (solo lectura)| U1
    SA -.->|Ve (solo lectura)| U2
    SA -.->|Ve (solo lectura)| U3
    
    style SA fill:#1e40af,color:#fff,stroke:#1e3a8a
    style OWNER_A fill:#059669,color:#fff
    style OWNER_B fill:#059669,color:#fff
    style BIZ_A fill:#0f766e,color:#fff
    style BIZ_B fill:#0f766e,color:#fff
```

---

## 3. Modelo de Datos

### 3.1 Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    User {
        string id PK
        string name "nullable"
        string email "unique, nullable"
        string password "nullable"
        enum role "SUPER_ADMIN | ADMIN | USER"
        string businessId FK
        string cashboxId FK "nullable"
    }
    
    Business {
        string id PK
        string name
        string slug UK
        string logo "nullable"
        string userId FK "nullable, dueño"
        enum accountStatus "ACTIVO | MOROSO | DESACTIVADO"
        datetime lastPaymentDate "nullable"
        string cuit "nullable"
        string condicionIva
    }
    
    BusinessFeatures {
        string id PK
        string businessId FK, UK
        enum plan "BASIC | PRO | ENTERPRISE"
        boolean hasAfipBilling
        boolean hasPublicCatalog
        boolean hasClientLedger
        boolean hasMultiCashbox
        boolean hasSupplierFilter
        boolean hasBudget
        int maxUsers
        int maxProducts
    }
    
    SubscriptionPayment {
        string id PK
        string businessId FK
        float amount
        string method
        string reference "nullable"
        string notes "nullable"
        datetime paidAt
        datetime recordedAt
        string recordedBy "userId del superadmin"
    }
    
    CashBox {
        string id PK
        string name
        float total
        string businessId FK
    }
    
    Product {
        string id PK
        string businessId FK
        string description "nullable"
        float price
        float salePrice
        float amount
    }
    
    Client {
        string id PK
        string name
        string businessId FK
        float balance
    }
    
    Order {
        string id PK
        string businessId FK
        string clientId FK "nullable"
        float total
        enum status
        enum paidStatus
    }
    
    Business ||--o{ User : "tiene empleados"
    Business ||--o| BusinessFeatures : "tiene features"
    Business ||--o{ SubscriptionPayment : "recibe pagos"
    Business ||--o{ CashBox : "tiene cajas"
    Business ||--o{ Product : "tiene productos"
    Business ||--o{ Client : "tiene clientes finales"
    Business ||--o{ Order : "tiene órdenes"
    User }|--|| Business : "pertenece a"
    User }o--|| CashBox : "asignado a caja"
    User |o--|| Business : "es dueño de (userId)"
```

### 3.2 Relaciones clave explicadas

#### Business ↔ User (dueño / cliente)

La relación más importante y confusa. Un `Business` tiene dos tipos de usuarios:

```
Business.userId ────────────► User (el DUEÑO, role = ADMIN)
                                    • Es el "cliente" del superadmin
                                    • Paga la suscripción
                                    • Gestiona su negocio
                                    • Solo UNO por negocio
                                    
Business ──── users[] ──────► User (EMPLEADOS, role = USER | ADMIN)
                                    • Son los que operan el POS
                                    • Cajeros, vendedores
                                    • El superadmin solo los VE
```

**En la práctica:**
```typescript
// Dueño (cliente)
const owner = await db.business.findUnique({
  where: { id },
  select: { userId: true }  // apunta al User que es dueño
});

// Empleados
const employees = await db.user.findMany({
  where: { businessId: id, id: { not: business.userId } }  // todos MENOS el dueño
});
```

**Regla de negocio:** Un "cliente" del superadmin es un `Business` que tiene `userId != null`. Si `userId` es null, el negocio existe pero no tiene dueño asignado — no paga, no es cliente.

#### BusinessFeatures ↔ Business

Es una relación **1:1**. No todos los negocios tienen `BusinessFeatures` (si nunca se configuró, es null). El código siempre usa `upsert` para crear si no existe.

```mermaid
graph LR
    B[Business] -->|userId| U[User<br/>role: ADMIN<br/>ES EL CLIENTE]
    B -->|businessId| BF[BusinessFeatures<br/>plan + features]
    B -->|businessId| SP[SubscriptionPayment<br/>historial de pagos]
    B -->|businessId| U2[User<br/>role: USER/ADMIN<br/>EMPLEADOS]
    B -->|businessId| CF[Client<br/>cliente final<br/>del negocio]
```

---

## 4. Sistema de Planes y Feature Flags

### 4.1 Planes disponibles

```mermaid
graph LR
    BASIC -->|upgrade| PRO
    PRO -->|upgrade| ENTERPRISE
    
    style BASIC fill:#6b7280,color:#fff
    style PRO fill:#7c3aed,color:#fff
    style ENTERPRISE fill:#d97706,color:#fff
```

| Plan | maxUsers | maxProducts | Features incluidos |
|------|----------|-------------|-------------------|
| **BASIC** (default) | 1 | 100 | Ninguno extra |
| **PRO** | 5 | 500 | `hasPublicCatalog`, `hasClientLedger` |
| **ENTERPRISE** | 999 | 99999 | Todos |

### 4.2 Feature Flags

Cada feature flag en `BusinessFeatures` controla una funcionalidad específica:

| Flag | Qué controla | Backend enforcement |
|------|-------------|-------------------|
| `hasAfipBilling` | Facturación electrónica ARCA/AFIP | ✅ `requireFeature("afip-billing")` |
| `hasPublicCatalog` | Catálogo público visible sin login | ✅ `requireFeature("public-catalog")` |
| `hasClientLedger` | Cuentas corrientes (deuda de clientes) | ✅ `requireFeature("client-ledger")` |
| `hasMultiCashbox` | Múltiples cajas simultáneas | ✅ `requireFeature("multi-cashbox")` |
| `hasSupplierFilter` | Filtro por proveedor en billing | ✅ `requireFeature("supplier-filter")` |
| `hasBudget` | Presupuestos | ❌ Sin enforcement |

### 4.3 Arquitectura del enforcement

```mermaid
sequenceDiagram
    participant UI as Frontend (React)
    participant SA as Server Action
    participant FG as feature-gates.ts
    participant DB as Database
    
    UI->>SA: Llama acción (ej: crearFactura)
    SA->>SA: Verifica auth + rol
    SA->>FG: requireFeature(businessId, "afip-billing")
    FG->>DB: db.businessFeatures.findUnique(businessId)
    DB-->>FG: { hasAfipBilling: true/false }
    
    alt Feature habilitado
        FG-->>SA: ✅ void (continúa)
        SA->>DB: Ejecuta operación normalmente
        DB-->>SA: Resultado
        SA-->>UI: { success: true }
    else Feature deshabilitado
        FG-->>SA: ❌ Lanza FeatureNotEnabledError
        SA-->>UI: { error: "Feature no habilitado: afip-billing" }
    end
```

### 4.4 Flujo de pago y reactivación

```mermaid
sequenceDiagram
    participant SA as Superadmin
    participant UI as ClientDetail Page
    participant Action as registerPayment
    participant DB as Database
    
    SA->>UI: Abre modal "Registrar Pago"
    SA->>UI: Ingresa monto + método
    SA->>Action: registerPayment(businessId, data)
    
    Action->>DB: BEGIN TRANSACTION
    Action->>DB: INSERT SubscriptionPayment
    Action->>DB: UPDATE Business SET lastPaymentDate = now()
    
    alt Estaba MOROSO
        Action->>DB: UPDATE Business SET accountStatus = ACTIVO
    end
    
    Action->>DB: COMMIT
    Action-->>UI: { success: true }
    UI->>UI: Toast + refresh + recarga detalle
```

---

## 5. Rutas y Pages

```
/superadmin/
├── layout.tsx              ← Server Component: auth + sidebar + counts
├── dashboard/
│   └── page.tsx            ← Dashboard con KPIs + tablas recientes
├── clients/
│   ├── page.tsx            ← Lista de clientes (búsqueda + filtros + paginación)
│   └── [id]/
│       └── page.tsx        ← Detalle cliente: estado, pagos, plan, acciones
└── businesses/
    ├── page.tsx            ← Lista de negocios (búsqueda + filtros + paginación)
    └── [id]/
        ├── features/
        │   └── page.tsx    ← Configuración de features y plan (RSC + FeaturesForm cliente)
        ├── users/
        │   └── page.tsx    ← Usuarios internos (solo lectura)
        └── arca/
            └── page.tsx    ← Configuración ARCA/AFIP
```

### 5.1 Tipos de component por ruta

| Ruta | Server Component | Client Component | ¿Por qué? |
|------|:---:|:---:|-----------|
| `/dashboard` | ✅ | — | Datos resueltos en server, sin interactividad |
| `/clients` | — | ✅ | Búsqueda + filtros + paginación en cliente |
| `/clients/[id]` | — | ✅ | Modales de pago y cambio de plan |
| `/businesses` | — | ✅ | Búsqueda + filtros + delete dialog |
| `/businesses/[id]/features` | ✅ | FeaturesForm | Server: datos. Client: formulario interactivo |
| `/businesses/[id]/users` | ✅ | UsersTable | Server: datos. Client: solo render visual |
| `/businesses/[id]/arca` | ✅ | ArcaForm | Server: datos. Client: formulario interactivo |

---

## 6. Server Actions

Todas en `src/actions/superadmin.ts` (623 líneas).

| Action | Tipo | TDD | Tests |
|--------|------|:---:|-------|
| `getSuperadminMetrics()` | Lectura | ✅ | 6 tests |
| `getClientsPaginated(page, search?, status?)` | Lectura | ✅ | 7 tests |
| `getClientDetail(businessId)` | Lectura | ✅ | 5 tests |
| `registerPayment(businessId, data)` | Escritura | ✅ | 7 tests |
| `changeClientPlan(businessId, plan)` | Escritura | ✅ | 6 tests |
| `promoteToAdmin(userId, name, slug)` | Escritura | ❌ | — |
| `getAllBusinesses()` | Lectura | ❌ | — |
| `deleteBusiness(businessId)` | Escritura | ❌ | — |
| `updateBusinessFeaturesAction(payload)` | Escritura | ❌ | — |
| `getBusinessesPaginated(page, search?, status?)` | Lectura | ✅ | 8 tests |
| `deleteBusinessSafe(businessId, confirm?)` | Escritura | ✅ | 6 tests |
| `getBusinessUsers(businessId)` | Lectura | ✅ | 6 tests |

Además en `src/lib/feature-gates.ts`:
- `requireFeature(businessId, feature)` — helper con 5 tests

**Total: 56 tests, todos pasando.**

### 6.1 Patrón común de Server Action

```typescript
"use server";

export const algunaAction = async (params) => {
  // 1. Auth
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return { error: "No autorizado" };
  }

  try {
    // 2. Operación
    const result = await db.something.findMany({ ... });
    return { success: result };
  } catch (error) {
    console.error("Error:", error);
    return { error: "Mensaje descriptivo" };
  }
};
```

---

## 7. Componentes Compartidos

```
src/components/Superadmin/
├── SuperadminSidebar.tsx      ← Sidebar responsive (Client Component)
├── SuperadminMetricCard.tsx   ← Card de métrica KPI (Server Component)
└── UsersTable.tsx             ← Tabla de usuarios interno (Server Component)
```

### 7.1 Sidebar

```mermaid
graph TD
    subgraph "Desktop (>1024px)"
        S1[Sidebar colapsada 64px] -->|hover| S2[Sidebar expandida 240px]
        S2 -->|mouse leave| S1
    end
    
    subgraph "Mobile (<768px)"
        M1[Hamburger icon<br/>top bar] -->|click| M2[Drawer 240px<br/>con overlay]
        M2 -->|click outside| M1
    end
    
    subgraph "Contenido"
        S1 --> N[Nav items]
        S2 --> N
        M2 --> N
        N --> D[Dashboard]
        N --> C[Clientes + badge]
        N --> B[Negocios + badge]
    end
```

Links dinámicos desde array. Solo se agrega un elemento al array para crear una nueva sección:

```typescript
const NAV_ITEMS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/clients",    label: "Clientes",  icon: Users },
  { href: "/superadmin/businesses", label: "Negocios",  icon: Building2 },
];
```

---

## 8. Fases Completadas

| Fase | Descripción | Archivos | Lo que incluye |
|:----:|-------------|----------|----------------|
| **1** | Dashboard + KPIs | 4 | `getSuperadminMetrics`, `SuperadminMetricCard`, dashboard rediseñado, layout con sidebar |
| **2** | Gestión de Clientes | 12 | 4 actions nuevas, 2 pages, 5 componentes, `SubscriptionPayment` model, modales de pago y plan |
| **3** | Gestión Avanzada de Negocios | 3 | `getBusinessesPaginated`, `deleteBusinessSafe`, búsqueda + filtros + paginación + delete con warning |
| **4** | Usuarios Internos | 4 | `getBusinessUsers`, `UsersTable`, página `/users` (solo lectura) |
| **5** | Feature Flag Enforcement | 8 | `feature-gates.ts`, migración de 6 archivos a backend enforcement |
| **6** | Sidebar Responsive | 2 | `SuperadminSidebar`, layout actualizado con hover-expand + mobile drawer |

### 8.1 Orden real de implementación

```
Fase 1 (Dashboard) → Fase 2 (Clientes) → Fase 3 (Negocios) → Fase 6 (Sidebar) → Fase 4 (Usuarios) → Fase 5 (Enforcement)
```

---

## 9. Fases Planificadas

### Fase 7 — Validaciones ARCA

**Archivos:** `src/lib/validators.ts` (nuevo), `src/schemas/index.ts` (modificado)

Validar antes de guardar:

| Validación | Algoritmo |
|-----------|-----------|
| CUIT | Módulo 11 (RG AFIP 3928) |
| Certificado | `startsWith("-----BEGIN CERTIFICATE-----")` |
| Clave privada | `startsWith("-----BEGIN PRIVATE KEY-----")` o RSA |

### Fase 8 — Consistencia de UX

| Cambio | Archivos |
|--------|----------|
| Migrar `alert()` → `sonner` toast | `promote-button.tsx`, `delete-business-button.tsx` |
| Unificar imports de `auth` | `layout.tsx`, `dashboard/page.tsx`, `businesses/page.tsx`, `actions/arca.ts` |
| Unificar estilo de headers | `businesses/page.tsx`, `arca/page.tsx` |
| Componente `EmptyState` reutilizable | Nuevo componente |

---

## 10. Lo que Falta

### 10.1 Funcionalidades planeadas pero no implementadas

| Funcionalidad | Prioridad | Dependencias |
|--------------|:---------:|--------------|
| Validación CUIT módulo 11 (Fase 7) | 🟡 Media | Ninguna |
| Validación formato PEM (Fase 7) | 🟢 Baja | Ninguna |
| Toasts en vez de `alert()` (Fase 8) | 🟢 Baja | Ninguna |
| Unificar imports de `auth` (Fase 8) | 🟢 Baja | Ninguna |
| Componente `EmptyState` (Fase 8) | 🟢 Baja | Ninguna |

### 10.2 Funcionalidades NO planeadas pero valiosas

| Funcionalidad | Por qué sería útil |
|--------------|-------------------|
| **Dashboard con ingresos reales** | Hoy las métricas no incluyen ingresos. Se podría calcular por plan × cantidad de clientes. |
| **MOROSO automático** | Si pasan 30+ días desde `lastPaymentDate`, cambiar `accountStatus` a MOROSO automáticamente (hoy es manual). |
| **Crear cliente + negocio en un paso** | Hoy `promoteToAdmin` existe pero no está integrado en la UI de clientes. |
| **Logs de actividad del superadmin** | Quién hizo qué y cuándo (auditoría). |
| **Notificaciones** | Alertar al superadmin cuando un cliente entra en mora. |
| **Exportar datos** | CSV de clientes, pagos, etc. |
| **Onboarding de primer SUPER_ADMIN** | Seed script o registro especial para el primer superadmin. |
| **Filtro por plan** en listas de clientes/negocios | Hoy filtra por status pero no por plan. |
| **Próximo vencimiento** | Calcular y mostrar "próximo pago" basado en `lastPaymentDate + 30 días`. |
| **Paginación en historial de pagos** | Hoy trae solo los últimos 10. Con clientes antiguos podría necesitar paginación. |
| **Badge en sidebar** de negocios sin dueño | Para identificar huérfanos rápidamente. |

### 10.3 Mejoras técnicas pendientes

| Mejora | Categoría |
|--------|-----------|
| Tests para `promoteToAdmin`, `getAllBusinesses`, `deleteBusiness` (original) | Testing |
| Tests para `updateBusinessFeaturesAction` | Testing |
| Extraer `PaginationControls` como componente reutilizable | Refactor |
| Extraer `SearchFilters` como componente reutilizable | Refactor |
| El `businessId null` check en `registerPayment` no usa Zod | Consistencia |
| Migrar a `@/lib/auth` en todas las páginas (Fase 8) | Consistencia |

---

## 11. Decisiones de Arquitectura (ADRs)

### ADR-1: ¿Cliente = Business con userId != null?

**Decisión:** Sí. Un "cliente" del superadmin es un `Business` que tiene un `userId` asignado (dueño).

**Contexto:** No todos los negocios tienen dueño. Los negocios se pueden crear desde el superadmin sin asignar un usuario. Esos no pagan, no son clientes.

### ADR-2: ¿SubscriptionPayment como modelo separado?

**Decisión:** Modelo Prisma independiente, no JSON en Business.

**Por qué:** Necesitamos queryar por fechas, montos, métodos. JSON no permite índices ni joins eficientes. Un modelo separado escala a miles de pagos.

### ADR-3: ¿Reactivar automáticamente al pagar?

**Decisión:** Sí. Al registrar un pago, si el negocio estaba MOROSO → pasa a ACTIVO automáticamente.

**Por qué:** Si alguien paga, automáticamente está activo. El caso "pagó pero queremos mantenerlo desactivado" no existe en la práctica.

### ADR-4: ¿Error (throw) o response estructurado en feature-gates?

**Decisión:** Elegimos `throw FeatureNotEnabledError`.

**Por qué:**
1. El caller (action) atrapa y devuelve `{ error }`
2. Si olvidamos el try/catch, Next.js devuelve 500 → nos damos cuenta
3. No podemos "olvidar" manejar el error porque TypeScript no deja ignorar un throw

### ADR-5: ¿Por qué dos pasos en deleteBusiness (warning + confirm)?

**Decisión:** Primero obtiene counts de datos a eliminar, muestra advertencia, solo elimina con `confirm: true`.

**Por qué:** `deleteBusiness` hace CASCADE y elimina productos, órdenes, clientes, etc. El superadmin debe ver lo que va a perder antes de confirmar.

### ADR-6: ¿Sidebar colapsada vs. siempre visible?

**Decisión:** Colapsada por defecto (64px), expande en hover (240px) desktop. Drawer con overlay en mobile.

**Por qué:** El contenido del dashboard es la prioridad. La sidebar no debe robar espacio. En mobile, un drawer evita problemas de layout con pantallas chicas.

### ADR-7: ¿User.businessId (FK) o tabla intermedia UserBusiness?

**Decisión:** `User.businessId` como FK directa. Cada usuario pertenece a EXACTAMENTE UN negocio.

**Por qué:** Un empleado no trabaja en múltiples negocios. Simplifica queries y evita joins innecesarios.

---

## Archivos del Superadmin (mapa completo)

```
src/
├── actions/
│   └── superadmin.ts              ← 12 Server Actions (623 líneas)
├── app/superadmin/
│   ├── layout.tsx                 ← Layout con sidebar + auth guard
│   ├── dashboard/
│   │   └── page.tsx               ← Dashboard con KPIs (417 líneas)
│   ├── clients/
│   │   ├── page.tsx               ← Lista clientes (365 líneas)
│   │   └── [id]/
│   │       └── page.tsx           ← Detalle cliente (673 líneas)
│   └── businesses/
│       ├── page.tsx               ← Lista negocios (548 líneas)
│       └── [id]/
│           ├── features/
│           │   ├── page.tsx       ← Features (RSC)
│           │   └── FeaturesForm.tsx  ← Formulario (Client)
│           ├── users/
│           │   └── page.tsx       ← Usuarios internos (111 líneas)
│           └── arca/
│               └── page.tsx       ← Config ARCA
├── components/Superadmin/
│   ├── SuperadminSidebar.tsx      ← Sidebar responsive (204 líneas)
│   ├── SuperadminMetricCard.tsx   ← Card de KPI (56 líneas)
│   └── UsersTable.tsx             ← Tabla usuarios (116 líneas)
├── lib/
│   └── feature-gates.ts           ← Backend enforcement (63 líneas)
└── __tests__/
    ├── lib/
    │   └── feature-gates.test.ts  ← 5 tests
    └── actions/superadmin/
        ├── getSuperadminMetrics.test.ts    ← 6 tests
        ├── getClientsPaginated.test.ts     ← 7 tests
        ├── getClientDetail.test.ts         ← 5 tests
        ├── registerPayment.test.ts         ← 7 tests
        ├── changeClientPlan.test.ts        ← 6 tests
        ├── getBusinessesPaginated.test.ts  ← 8 tests
        ├── deleteBusinessSafe.test.ts      ← 6 tests
        └── getBusinessUsers.test.ts        ← 6 tests
```
