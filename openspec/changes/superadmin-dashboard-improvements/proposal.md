# Superadmin Dashboard — Plan de Mejora Integral

**Change**: `superadmin-dashboard-improvements`  
**Fecha**: 2026-06-23  
**Estado**: Proposed  
**Inspiración UI/UX**: `/superadmin/businesses/[id]/features` — cards oscuras con gradient, breadcrumbs, badges, responsive grid, animaciones sutiles.

---

## Clarificación de Términos

Para evitar confusiones durante todo el plan:

| Término | Significa | Ejemplo |
|---------|-----------|---------|
| **Cliente** | Dueño del negocio — QUIEN PAGA el SaaS | "Cliente registrado", "Pago de cliente" |
| **Usuario** | Empleado/cajero que cada negocio crea internamente | "Usuario de mostrador", "Cajero" |
| **Negocio** | La entidad comercial que el cliente posee | "Restaurante X", "Almacén Y" |

**Rol del superadmin:**
- Gestiona **CLIENTES** (dueños de negocios) → sus pagos, planes, estado de cuenta
- Visualiza **USUARIOS** internos de cada negocio como dato informativo
- NO gestiona usuarios internos (eso lo hace cada ADMIN de negocio)

---

## Resumen Ejecutivo

El superadmin actual es funcional pero inmaduro. Tiene un dashboard que es una tabla glorificada, operaciones CRUD incompletas, feature flags sin enforcement en backend, y detalles de UX inconsistentes.

Este plan propone **8 fases** priorizadas por **impacto vs. esfuerzo**. Cada fase es independiente y puede aprobarse/rechazarse por separado.

---

## Fase 1 — Dashboard con Métricas y KPIs

### 🎯 Objetivo
Convertir la tabla actual en un dashboard real con cards de métricas y visibilidad rápida de la salud del sistema.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `/superadmin/dashboard/page.tsx` | Rediseño completo tipo "Features" — header con gradient, KPIs en cards |
| Nuevo: `SuperadminMetricCard` | Componente reutilizable (clientes activos, morosos, total negocios, ingresos del mes) |
| Nuevo: `RecentClientsTable` | Tabla compacta de últimos clientes (dueños de negocio) con status badge |
| Nuevo: `RecentBusinessesTable` | Tabla compacta de últimos negocios creados |
| `src/actions/superadmin.ts` | Nueva action `getSuperadminMetrics()` — agregaciones de DB |

**Métricas a mostrar:**
- Clientes totales (dueños de negocio)
- Clientes morosos (accountStatus = MOROSO)
- Negocios activos / desactivados
- Ingresos estimados del mes (basado en plan de cada business)
- Últimos pagos registrados

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🟢 BAJO (2-3 archivos) | ⬜ Pendiente |

### ✅ Beneficio
El superadmin ve de un vistazo el estado de salud de todos sus clientes. Deja de tener que scrollear tablas para entender el negocio.

### 📱 Mobile
Cards adaptables a 1/2/4 columnas según viewport. Tablas con scroll horizontal controlado.

---

## Fase 2 — Gestión de Clientes (Business Owners)

### 🎯 Objetivo
Sección dedicada a los **CLIENTES** (dueños de negocios): listado, búsqueda, estado de cuenta, historial de pagos, y gestión de suscripción.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| Nuevo: `/superadmin/clients/page.tsx` | Nueva página tipo "Features style" — tabla de clientes con search + filtros + paginación |
| Nuevo: `/superadmin/clients/[id]/page.tsx` | Detalle del cliente: datos, negocio asociado, plan, historial de pagos, estado de cuenta |
| Nuevo: `ClientCard` | Componente de resumen del cliente (plan, status, último pago, próximos vencimientos) |
| Nuevo: `PaymentHistoryTable` | Historial de pagos del cliente |
| Nuevo: `RegisterPaymentDialog` | Modal para registrar un pago manual (efectivo, transferencia) |
| Nuevo: `ChangePlanDialog` | Modal para cambiar plan con confirmación y efecto inmediato |
| Sidebar | Agregar link a "Clientes" |
| `src/actions/superadmin.ts` | Nuevas actions: `getClientsPaginated()`, `getClientDetail()`, `registerPayment()`, `changeClientPlan()` |
| `prisma/schema.prisma` | Posible nuevo modelo `ClientPayment` si no existe para tracking de pagos |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🔴 ALTO (6-8 archivos) | ⬜ Pendiente |

### ✅ Beneficio
El superadmin puede ver quiénes son sus clientes, si están al día, registrar pagos manuales, cambiar planes. **Cierra el ciclo de gestión comercial del SaaS.**

### ⚠️ Consideraciones
- Actualmente `business.lastPaymentDate` existe pero no hay historial de pagos. Habría que crear modelo `SubscriptionPayment` o similar.
- `business.accountStatus` (ACTIVO/MOROSO/DESACTIVADO) existe pero no se actualiza automáticamente al registrar un pago.

### 📱 Mobile
Detalle del cliente en una sola columna. Tabla de pagos con scroll horizontal.

---

## Fase 3 — Gestión Avanzada de Negocios

### 🎯 Objetivo
Paginación, búsqueda, filtros, y acciones completas sobre negocios.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `/superadmin/businesses/page.tsx` | Agregar search bar, filtros por status, paginación server-side |
| Incluir `DeleteBusinessButton` | Conectar el componente existente que hoy está huérfano (con advertencia de datos asociados) |
| `BusinessTableRow` | Mejorar con status badge, dueño (cliente), plan, última actividad |
| `src/actions/superadmin.ts` | Nueva action `getBusinessesPaginated(page, search, status)` |
| Sidebar | Badge de cantidad de negocios |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🟡 MEDIO (3-4 archivos) | ⬜ Pendiente |

### ✅ Beneficio
Con +50 negocios es imposible usar la tabla actual. Search + filtros + paginación hacen escalar.

### ⚠️ Riesgo
`deleteBusiness` necesita advertencia: "Esto eliminará N productos, N órdenes, N clientes finales".

---

## Fase 4 — Visualización de Usuarios Internos

### 🎯 Objetivo
El superadmin puede **ver** los usuarios de cada negocio (empleados/cajeros), pero NO gestionarlos (eso lo hace el ADMIN del negocio).

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| Nuevo: `/superadmin/businesses/[id]/users/page.tsx` | Página de solo lectura con tabla de usuarios del negocio |
| `UserBadge` | Componente de badge visual (rol+color) |
| `/superadmin/dashboard/page.tsx` | Tabla de resumen compacta con usuarios del sistema (solo lectura, informativa) |
| `src/actions/superadmin.ts` | Nueva action `getBusinessUsers(businessId)` — solo lectura |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🟡 MEDIO | 🟢 BAJO (2-3 archivos) | ⬜ Pendiente |

### ✅ Beneficio
El superadmin puede ver cuántos empleados tiene cada negocio, si están activos, a qué caja están asignados. Dato útil para soporte y auditoría.

### ⚠️ Límite
Solo lectura. Sin opciones de editar, crear, o eliminar usuarios internos. Sin botones de acción en la tabla.

---

## Fase 5 — Feature Flag Enforcement en Backend

### 🎯 Objetivo
Que los toggles de `BusinessFeatures` realmente **impidan** operaciones en backend, no solo oculten botones en UI.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `src/lib/feature-gates.ts` | **Nuevo**: Helper `requireFeature(businessId, feature)` que lanza error si no está habilitado |
| Actions de facturación | Verificar `hasAfipBilling` antes de emitir comprobante |
| Actions de catálogo público | Verificar `hasPublicCatalog` antes de servir productos |
| Actions de multiple cashbox | Verificar `hasMultiCashbox` antes de abrir segunda caja |
| Actions de cuentas corrientes | Verificar `hasClientLedger` antes de operar |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🔴 ALTO | 🟡 MEDIO (5-8 archivos) | ⬜ Pendiente |

### ✅ Beneficio
**Seguridad del modelo de negocio.** Sin esto, un cliente con plan BASIC puede usar cualquier feature por su cuenta. Los feature flags son decorativos.

---

## Fase 6 — Sidebar y Navegación Responsive

### 🎯 Objetivo
Sidebar dinámica con indicación de ruta activa, colapso en mobile, y links a todas las secciones.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `/superadmin/layout.tsx` | Sidebar extraída a componente `SuperadminSidebar` |
| Nuevo: `SuperadminSidebar` | Nav dinámico con `usePathname()`, highlight activo, collapsible en mobile |
| Nuevo: `MobileSidebarToggle` | Botón hamburger para mostrar/ocultar sidebar en < md |
| Links dinámicos | Dashboard, Clientes, Negocios, (cada uno con badge de conteo) |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🟡 MEDIO | 🟢 BAJO (1-2 archivos) | ⬜ Pendiente |

### ✅ Beneficio
Navegación usable en mobile. Consistente con el diseño del resto de la app.

---

## Fase 7 — Validaciones ARCA

### 🎯 Objetivo
Validar CUIT (módulo 11) y formato de certificado (PEM) antes de guardar.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `src/schemas/index.ts` | Validación de CUIT (algoritmo módulo 11) en `ArcaFieldsSchema` |
| `src/schemas/index.ts` | Validar que cert comience con `-----BEGIN CERTIFICATE-----` |
| `src/lib/validators.ts` | **Nuevo**: `validateCuit(cuit: string): boolean` |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🟡 MEDIO | 🟢 BAJO (2 archivos) | ⬜ Pendiente |

### ✅ Beneficio
Evita guardar datos inválidos que después fallan en facturación.

---

## Fase 8 — Consistencia de UX

### 🎯 Objetivo
Pulir detalles: migrar `alert()` a toasts, unificar imports y patrones de diseño.

### 🛠 Cambios propuestos

| Componente | Cambio |
|------------|--------|
| `PromoteUserButton` | Migrar `alert()` a `sonner` toast |
| Layouts | Cambiar import de `../../auth` a `@/lib/auth` |
| Todas las pages | Unificar header style (mismo patrón que features page) |
| Tablas vacías | Estado "Sin datos" con ilustración simple |

### 📊 Impacto vs. Esfuerzo

| Impacto | Esfuerzo | Decisión |
|---------|----------|----------|
| 🟢 BAJO | 🟢 BAJO (2-3 archivos) | ⬜ Pendiente |

### ✅ Beneficio
Experiencia pulida y consistente. Sin `alert()` feos.

---

## Mapa de Fases vs. Problemas Identificados

| Problema | Fase |
|----------|------|
| Sin métricas ni KPIs | Fase 1 |
| Sin visibilidad de clientes (dueños) | Fase 2 |
| Sin gestión de pagos de clientes | Fase 2 |
| Sin historial de pagos | Fase 2 |
| No se puede cambiar plan de un cliente desde UI | Fase 2 |
| Sin paginación en tablas | Fase 1 + Fase 3 |
| Sin buscador/filtros | Fase 2 + Fase 3 |
| accountStatus / lastPaymentDate invisibles | Fase 2 + Fase 3 |
| DeleteBusinessButton no conectado | Fase 3 |
| No se pueden ver usuarios internos de un negocio | Fase 4 |
| Feature flags sin enforcement en backend | Fase 5 |
| Sidebar hardcodeada, no responsive | Fase 6 |
| CUIT sin validar, cert sin formato | Fase 7 |
| `alert()` en vez de toast | Fase 8 |
| Import inconsistente de `auth` | Fase 8 |

---

## Decisiones sobre funcionalidades específicas

| Funcionalidad | Postura | En qué fase |
|---------------|---------|-------------|
| **Registrar pagos de un cliente (dueño)** | 🟢 **Sí, es función del superadmin.** Registrar pagos de suscripción manuales (efectivo, transferencia) y actualizar estado de cuenta. | Fase 2 |
| **Registrar un cliente y su negocio** | 🟢 **Ya existe parcialmente** (promoteToAdmin). Mejorar: permitir crear cliente+negocio en un paso, cambiar dueño de negocio. | Fase 2 |
| **Administrar features (planes)** | 🟢 **Está bien.** Solo falta enforcement backend (Fase 5) y revisar escalonamiento de planes. | Fase 5 |
| **Visualizar usuarios internos** | 🟢 **Solo lectura.** El superadmin ve pero no edita empleados de cada negocio. | Fase 4 |
| **Logs de actividad de superadmin** | 🟡 Futuro. No incluido por esfuerzo vs. beneficio. | Fuera de scope |
| **Onboarding de primer SUPER_ADMIN** | 🟡 Futuro. Seed script o registro especial. | Fuera de scope |

---

## Orden de implementación recomendado

```
Fase 1 → Fase 2 → Fase 3 → Fase 6 → Fase 4 → Fase 8 → Fase 7 → Fase 5
```

**Justificación**:
1. **Fase 1** (Dashboard) → valor inmediato, poco esfuerzo, da contexto
2. **Fase 2** (Clientes) → lo más valioso: gestión de dueños de negocios + pagos
3. **Fase 3** (Negocios) → search/paginate en la tabla existente
4. **Fase 6** (Sidebar) → navegación para todas las secciones nuevas
5. **Fase 4** (Usuarios internos) → vista rápida, bajo esfuerzo
6. **Fase 8** (UX) → toques finales
7. **Fase 7** (ARCA) → rápida, la dejamos para después del core
8. **Fase 5** (Enforcement) → crítica pero requiere tocar muchas actions; se hace al final cuando el resto está estable

---

## Modelo de datos necesario

Para Fase 2 (pagos de clientes) se requiere un nuevo modelo en Prisma:

```prisma
model SubscriptionPayment {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  amount     Float
  currency   String   @default("ARS")
  method     String   // "EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO", etc.
  reference  String?  // número de comprobante, transferencia ID, etc.
  notes      String?  // observaciones del superadmin
  paidAt     DateTime @default(now())
  recordedBy String   // userId del superadmin que lo registró

  @@index([businessId, paidAt])
}
```

Además, el `accountStatus` de `Business` debería actualizarse automáticamente según fechas de pago (ej: si pasaron 30 días desde `lastPaymentDate` → MOROSO).
