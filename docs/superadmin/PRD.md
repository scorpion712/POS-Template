# PRD: Superadmin Panel — Site Completo

## 1. Executive Summary

El panel Superadmin es la consola de administración del sistema POS multi-tenant. Permite gestionar planes, negocios, clientes, usuarios, pagos y configuración ARCA/AFIP desde un único lugar. La auditoría completa reveló **3 bugs críticos de pérdida de datos**, **4 acciones huérfanas** y **6 gaps funcionales** que este PRD aborda.

**Problema principal**: El sitio fue construido en fases sin un diseño cohesivo. Hay acciones Server que el frontend no usa, formularios que recolectan datos y los ignoran silenciosamente, y caminos duplicados para la misma operación.

**Solución**: Refactorizar el sitio en 4 sprints: (1) corregir bugs críticos, (2) eliminar código muerto y consolidar acciones, (3) agregar funcionalidad faltante, (4) tests y hardening.

## 2. Context

### Background
- El sitio superadmin se construyó sobre el refactor del sistema de planes (Simplify Plan System) que eliminó la tabla `BusinessFeatures` y migró todo a `PlanDefinition` como SSOT.
- Durante ese refactor, varias acciones quedaron en estado intermedio: algunas migradas, otras obsoletas pero no eliminadas.
- El merge de `feature/ui-changes` trajo cambios de schema y API que dejaron inconsistencias.

### Affected Users
- **Superadmins** (operadores del sistema): usan el panel a diario para gestionar clientes, ver métricas, y configurar planes.
- **Dueños de negocio**: impactados indirectamente si el superadmin comete errores por bugs en la UI.

### Current Technical Context
- Next.js 15 App Router + Server Actions
- PlanDefinition como SSOT con `features` y `limits` en JSON
- 26 Server Actions en `src/actions/superadmin.ts`
- 9 rutas en `src/app/superadmin/`
- PostgreSQL + Prisma 6

## 3. Objectives

- [ ] **P0 — Corregir bugs críticos** que causan pérdida silenciosa de datos
- [ ] **P0 — Eliminar acciones huérfanas** y consolidar la superficie de API
- [ ] **P1 — Agregar CRUD faltante** (cambio de plan desde businesses list, toggle de estado)
- [ ] **P1 — Hardening** (validaciones, tipos, checks de seguridad)
- [ ] **P2 — Tests** de integración para todas las acciones del superadmin
- [ ] **P2 — Documentación** de API sincronizada con el código

### Success KPIs
- Cero bugs de pérdida de datos en formularios superadmin
- 100% de acciones en `superadmin.ts` son usadas por al menos una UI
- Toda acción crítica tiene test de integración
- Todas las rutas pueden crear/leer/actualizar/eliminar su recurso principal

## 4. Scope

### In Scope
- Las 9 rutas del sitio superadmin y sus 26 Server Actions
- Feature gates actuales basados en `PlanDefinition.features`
- Roles y permisos (SUPER_ADMIN)
- Integración con ARCA (punto de venta, configuración)
- Dashboard con métricas agregadas

### Out of Scope
- Funcionalidad de negocio POS (facturación, stock, caja, etc.)
- Login/registro de usuarios no-superadmin
- Migraciones de base de datos (el schema actual es estable)
- UI/UX redesign completo (solo correcciones puntuales)
- Internacionalización

## 5. Functional Requirements

### FR-001: Editar Cliente — Todos los campos deben persistir

**As a** superadmin
**I want** que al editar un cliente en `/superadmin/clients/[id]`, los campos "Nombre del Negocio", "Slug" y "Plan" se guarden realmente
**So that** la información del cliente sea correcta y no pierda datos silenciosamente

**Acceptance Criteria**:
- El formulario de edición recolecta: owner name, business name, slug, plan
- `updateClient` action se expande para actualizar `business.name`, `business.slug` y `planDefinitionId`
- El schema `updateClientSchema` incluye `businessName`, `slug` como opcionales
- La UI valida y envía TODOS los campos, no solo el nombre del dueño
- Si se cambia el plan, se usa `changeClientPlan` internamente o se unifica en `updateClient`

**Current state**: ❌ El dialog recolecta `editBusinessName`, `editSlug`, `editPlan` pero `handleEditSubmit` solo envía `{ name }`. El resto se pierde.

---

### FR-002: Edit Business — Agregar cambio de plan

**As a** superadmin
**I want** poder cambiar el plan de un negocio desde el diálogo de editar en `/superadmin/businesses`
**So that** no tenga que navegar a una página separada para cambiar el plan

**Acceptance Criteria**:
- El dialog "Editar negocio" en `businesses/page.tsx` incluye un selector de plan
- Al guardar, se actualiza `planDefinitionId` en el business
- Se usa la action existente `changeClientPlan` o se consolida en `updateBusiness`

---

### FR-003: Toggle rápido de estado de negocio

**As a** superadmin
**I want** poder cambiar el estado (ACTIVO/MOROSO/DESACTIVADO) de un negocio desde la lista
**So that** pueda suspender o reactivar negocios rápidamente sin registrar pagos ficticios

**Acceptance Criteria**:
- Cada fila en la tabla de negocios tiene un badge de estado clickeable o un dropdown
- Al cambiar estado, se dispara una Server Action `updateBusinessStatus(businessId, status)`
- Se registra en audit log el cambio de estado
- La acción valida que el superadmin tiene permiso y que la transición de estado es válida

**Current state**: ❌ El único camino para cambiar a ACTIVO es registrar un pago. No hay forma de desactivar manualmente.

---

### FR-004: Limpiar acciones huérfanas

**As a** developer manteniendo el superadmin
**I want** que todas las Server Actions en `superadmin.ts` sean usadas por al menos una UI
**So that** no haya código muerto que genere confusión y riesgo de seguridad

**Acceptance Criteria**:

| Action | Status | Acción |
|--------|--------|--------|
| `promoteToAdmin` | Sin UI conocida | Eliminar o agregar UI |
| `getAllBusinesses` | Sin UI conocida (sin paginación) | Eliminar (reemplazado por getBusinessesPaginated) |
| `deleteBusiness` | Sin UI conocida (reemplazado por deleteBusinessSafe) | Eliminar |
| `updateBusinessPlanAction` | Sin UI conocida (versión anterior) | Eliminar (reemplazado por changeClientPlan) |

---

### FR-005: Mostrar adopción de planes en /superadmin/plans

**As a** superadmin
**I want** ver cuántos negocios usan cada plan en la lista de planes
**So that** pueda evaluar qué planes son populares y cuáles están infrautilizados

**Acceptance Criteria**:
- Cada fila de plan muestra: nombre, precio, cantidad de negocios activos usando ese plan
- El conteo se obtiene de `db.business.count({ where: { planDefinitionId } })`
- Los datos se integran en la action `getPlans()` existente

---

### FR-006: Auditoría de acciones del superadmin en /superadmin/logs

**As a** superadmin
**I want** ver un log detallado de todas las acciones realizadas por superadmins
**So that** pueda auditar cambios y detectar actividad sospechosa

**Acceptance Criteria**:
- La página `/superadmin/logs` muestra tabla paginada con: fecha, superadmin, acción, detalle, recurso afectado
- Filtros por tipo de acción, rango de fechas, superadmin
- La action `getAuditLogs` ya existe y funciona ✓
- La UI actual renderiza la tabla correctamente

**Current state**: ✅ Ya implementado y funcional. Solo verificar que el filtrado funcione con datos reales.

---

### FR-007: Sin duplicación de Server Actions

**As a** developer
**I want** que no haya dos Server Actions que hagan lo mismo
**So that** el mantenimiento sea predecible y no haya riesgos de seguridad por código muerto

**Acceptance Criteria**:
- `deleteBusiness` (sin checks) se elimina, solo queda `deleteBusinessSafe`
- `getAllBusinesses` (sin paginación) se elimina, solo queda `getBusinessesPaginated`
- `updateBusinessPlanAction` se elimina, solo queda `changeClientPlan`
- `promoteToAdmin` se elimina o se le agrega UI si la funcionalidad es necesaria

---

## 6. Non-Functional Requirements

| Requisito | Especificación |
|-----------|---------------|
| Performance | Listas paginadas < 1s con 100k businesses |
| Seguridad | Toda acción verifica `session.user.role === SUPER_ADMIN` |
| Consistencia | Operaciones multi-tabla usan `$transaction` |
| Tipado | Strict mode, sin `any`, schemas Zod compartidos |
| Logging | Toda acción mutante registra audit log |
| Cache | `updateTag(CACHE_TAGS.SUPERADMIN)` en mutaciones |

## 7. UX/UI Requirements

### Estados comunes para todas las páginas
- **Loading**: Skeleton o spinner mientras se cargan datos
- **Empty**: Mensaje claro cuando no hay resultados ("No hay negocios", "No se encontraron clientes")
- **Error**: Toast con mensaje de error + mantener UI anterior intacta
- **Success**: Toast de confirmación + refresh de datos

### Cambios específicos

| Página | Cambio |
|--------|--------|
| `/businesses` | Badge de estado clickeable con dropdown (ACTIVO/MOROSO/DESACTIVADO) |
| `/businesses` | Edit dialog incluye selector de plan |
| `/clients/[id]` | Edit dialog guarda TODOS los campos (name, businessName, slug, plan) |
| `/plans` | Columna "Negocios activos" con contador |

### Corregir Estados Vacíos
- `/superadmin/logs` cuando no hay logs
- `/superadmin/businesses/[id]/users` cuando el negocio no tiene usuarios
- `/superadmin/businesses/[id]/features` cuando no hay features cargadas

## 8. Dependencies

| Dependencia | Motivo |
|-------------|--------|
| `PlanDefinition` model | SSOT de features/limits |
| `auth()` de NextAuth | Validación de rol SUPER_ADMIN |
| `updateTag()` | Invalidación de caché |
| `logSuperadminAction()` | Auditoría |
| Zod schemas | Validación de inputs en Server Actions |
| ARCA configuration | Rutas de configuración AFIP/ARCA |

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Eliminar `promoteToAdmin` rompe flujo no documentado | Medium | Buscar referencias en todo el codebase antes de eliminar |
| Edit Client actualizado puede exponer campos que antes no se guardaban | Low | Validar con Zod, loggear cambios |
| Toggle de estado sin validación de transiciones válidas | Medium | Implementar máquina de estados: ACTIVO ↔ MOROSO, DESACTIVADO → ACTIVO (solo tras pago) |
| Datos existentes corruptos por bugs anteriores | High | Agregar verificación de consistencia (business.name vacío, slug mal formado) |

## 10. Timeline

### Sprint 1: Bug Fixes + Cleanup
- FR-001: Fix Edit Client — todos los campos persisten
- FR-004: Eliminar acciones huérfanas + consolidar
- FR-007: Sin duplicación de Server Actions

### Sprint 2: Missing CRUD
- FR-002: Edit Business con cambio de plan
- FR-003: Toggle de estado de negocio
- FR-005: Adopción de planes en /plans

### Sprint 3: Hardening + Tests
- Tests de integración para todas las Server Actions del superadmin
- Validación de estados vacíos y edge cases
- Revisión de seguridad (verificar que toda acción autentique)

### Sprint 4: Polish + Documentación
- Documentación de API actualizada (docs/superadmin/API.md)
- Estados empty/loading/error consistentes en todas las páginas
- Verificación final con datos de producción

---

## Appendix A: Current State Map

| Ruta | Page Type | Create | Read | Update | Delete | Notas |
|------|-----------|:------:|:----:|:------:|:------:|-------|
| `/dashboard` | Server | ❌ | ✅ | ❌ | ❌ | Read-only metrics |
| `/businesses` | Client | ✅ | ✅ | ✅ | ✅ | CRUD completo + search/pagination |
| `/businesses/[id]/features` | Client | ❌ | ✅ | ✅ | ❌ | Plan features display |
| `/businesses/[id]/users` | Client | ❌ | ✅ | ❌ | ❌ | Users list |
| `/businesses/[id]/arca` | Client | ❌ | ✅ | ✅ | ❌ | ARCA config |
| `/clients` | Client | ✅ | ✅ | ❌ | ❌ | Create + list |
| `/clients/[id]` | Client | ❌ | ✅ | 🔴 | ✅ | **Edit tiene bug de pérdida de datos** |
| `/plans` | Client | ✅ | ✅ | ✅ | ✅ | CRUD completo |
| `/logs` | Client | ❌ | ✅ | ❌ | ❌ | Read-only audit log |

## Appendix B: Action Inventory (26 total)

| # | Action | Status | UI Usage |
|---|--------|--------|----------|
| 1 | `getSuperadminMetrics` | ✅ Active | `/dashboard` |
| 2 | `getBusinessesPaginated` | ✅ Active | `/businesses` |
| 3 | `createBusiness` | ✅ Active | `/businesses` |
| 4 | `updateBusiness` | ✅ Active | `/businesses` |
| 5 | `deleteBusinessSafe` | ✅ Active | `/businesses` |
| 6 | `getBusinessUsers` | ✅ Active | `/businesses/[id]/users` |
| 7 | `getClientsPaginated` | ✅ Active | `/clients` |
| 8 | `createClient` | ✅ Active | `/clients` |
| 9 | `getClientDetail` | ✅ Active | `/clients/[id]` |
| 10 | `updateClient` | 🔴 Buggy | `/clients/[id]` — solo guarda name |
| 11 | `deleteClient` | ✅ Active | `/clients/[id]` |
| 12 | `getClientDeleteInfo` | ✅ Active | `/clients/[id]` |
| 13 | `registerPayment` | ✅ Active | `/clients/[id]` |
| 14 | `changeClientPlan` | ✅ Active | `/clients/[id]` |
| 15 | `getPlans` | ✅ Active | `/plans`, `/clients`, `/businesses` |
| 16 | `createPlan` | ✅ Active | `/plans` |
| 17 | `updatePlan` | ✅ Active | `/plans` |
| 18 | `deletePlan` | ✅ Active | `/plans` |
| 19 | `getAuditLogs` | ✅ Active | `/logs` |
| 20 | `promoteToAdmin` | ❌ Orphan | Sin UI visible |
| 21 | `getAllBusinesses` | ❌ Orphan | Sin UI (sin paginación) |
| 22 | `deleteBusiness` | ❌ Orphan | Sin UI (replaced by deleteBusinessSafe) |
| 23 | `updateBusinessPlanAction` | ❌ Orphan | Sin UI (old version) |
| 24 | ARCA actions (varias) | ✅ Active | `/businesses/[id]/arca` |
| 25 | `getBusinessById` | ✅ Active | `/businesses/[id]/*` pages |
| 26 | `getBusinessPlan` | ✅ Active | `/businesses/[id]/features` |
