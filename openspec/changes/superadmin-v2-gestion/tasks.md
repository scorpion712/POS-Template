# Tasks — Superadmin V2: Gestión Completa (ABM)

**Change**: `superadmin-v2-gestion`

---

## Fase 1 — ABM Clientes (8 tasks)

### 1.1 Server Actions — Tests primero

- [ ] **T1.1.1** — Test: `createClient` — auth (sin sesión, rol incorrecto), validación Zod (email inválido, password corta, slug inválido), email duplicado, slug duplicado, caso feliz (transacción completa)
- [ ] **T1.1.2** — Test: `updateClient` — auth, negocio no existe, caso feliz (solo nombre)
- [ ] **T1.1.3** — Test: `getClientDeleteInfo` — auth, negocio no existe, caso feliz (conteos correctos)
- [ ] **T1.1.4** — Test: `deleteClient` — auth, negocio no existe, caso feliz

### 1.2 Implementación

- [ ] **T1.2.1** — Implementar `createClient(name, email, password, businessName, slug, plan?)` en `src/actions/superadmin.ts`
  - Validar con Zod
  - Verificar email único en User
  - Verificar slug único en Business
  - Transacción: User (ADMIN, hashed password) + Business + BusinessFeatures
  - Hash de password con bcrypt
  - Log + revalidate
- [ ] **T1.2.2** — Implementar `updateClient(businessId, data)` y `getClientDeleteInfo(businessId)` y `deleteClient(businessId)` en `src/actions/superadmin.ts`
  - updateClient: solo nombre del dueño
  - getClientDeleteInfo: counts de productos, órdenes, pagos
  - deleteClient: eliminar Business (cascade) con safety check
- [ ] **T1.2.3** — Actualizar `clients/page.tsx`: agregar botón "+ Nuevo Cliente" + CreateClientDialog
  - Modal con 2 secciones (dueño + negocio)
  - Auto-generar slug desde nombre
  - Validación en cliente con Zod
  - Toast éxito/error
- [ ] **T1.2.4** — Actualizar `clients/[id]/page.tsx`: agregar botón "Editar" + "Eliminar"
  - EditClientDialog: solo editar nombre
  - DeleteClientButton: safety check → confirmación con "ELIMINAR" → delete

---

## Fase 2 — ABM Negocios (5 tasks)

### 2.1 Server Actions — Tests primero

- [ ] **T2.1.1** — Test: `createBusiness` — auth, slug duplicado, owner email no existe (crear sin dueño), owner email existe (asignar), caso feliz
- [ ] **T2.1.2** — Test: `updateBusiness` — auth, slug duplicado, datos parciales, caso feliz

### 2.2 Implementación

- [ ] **T2.2.1** — Implementar `createBusiness(name, slug, ownerEmail?, plan?)` en `src/actions/superadmin.ts`
  - Validar slug único
  - Lookup de owner por email (opcional)
  - Transacción: Business + BusinessFeatures
  - Log + revalidate
- [ ] **T2.2.2** — Implementar `updateBusiness(businessId, data)` en `src/actions/superadmin.ts`
  - Aceptar: name, slug, cuit, condicionIva, address, accountStatus, lastPaymentDate
  - Validar slug único si cambió
  - Log + revalidate
- [ ] **T2.2.3** — Actualizar `businesses/page.tsx`: botón "+ Nuevo Negocio" + CreateBusinessDialog + EditBusinessDialog
  - Create: nombre, slug (auto), owner lookup, plan
  - Edit: modal con todos los campos editables
  - Columna "Acciones" con botón Editar

---

## Fase 3 — Catálogo de Planes (7 tasks)

### 3.1 Migración + Tests primero

- [ ] **T3.1.1** — Agregar modelo `PlanDefinition` a `prisma/schema.prisma`
  - Ejecutar: `npx prisma migrate dev --name add_plan_definitions`
- [ ] **T3.1.2** — Agregar seed data en `prisma/seed.ts` para BASIC/PRO/ENTERPRISE
  - Ejecutar seed
- [ ] **T3.1.3** — Test: `getPlans`, `createPlan`, `updatePlan`, `deletePlan`

### 3.2 Implementación

- [ ] **T3.2.1** — Implementar `getPlans()`, `createPlan(data)`, `updatePlan(planId, data)`, `deletePlan(planId)` en `src/actions/superadmin.ts`
  - getPlans: listar todos (incluir inactivos) o solo activos
  - createPlan: validar nombre único
  - updatePlan: validar nombre único si cambió
  - deletePlan: verificar que ningún BusinessFeatures tenga este plan
- [ ] **T3.2.2** — Crear `/superadmin/plans/page.tsx` con tabla/cards + dialog create/edit
  - Mismo estilo visual (gradient header, cards)
  - Feature toggles como FeaturesForm
  - Badge "Default" en el plan default
- [ ] **T3.2.3** — Actualizar sidebar en `layout.tsx` con link a Planes

---

## Fase 4 — Logs de Superadmin (6 tasks)

### 4.1 Migración + Helper + Tests primero

- [ ] **T4.1.1** — Agregar modelo `SuperadminAuditLog` a `prisma/schema.prisma`
  - Ejecutar: `npx prisma migrate dev --name add_superadmin_audit_log`
- [ ] **T4.1.2** — Test: `logSuperadminAction` — crear log, fire & forget no lanza error
- [ ] **T4.1.3** — Test: `getAuditLogs` — auth, filtros, paginación, caso feliz

### 4.2 Implementación

- [ ] **T4.2.1** — Crear `src/lib/superadmin-log.ts` con helper `logSuperadminAction`
  - Fire & forget (try/catch, console.error, nunca throw)
- [ ] **T4.2.2** — Integrar logging en TODAS las actions del superadmin (existentes y nuevas)
  - Actions existentes: `createClient`, `updateClient`, `deleteClient`, `createBusiness`, `updateBusiness`, `deleteBusinessSafe`, `registerPayment`, `changeClientPlan`, `updateBusinessFeaturesAction`, `createPlan`, `updatePlan`, `deletePlan`
  - Llamar `logSuperadminAction` después del éxito, antes de revalidate
- [ ] **T4.2.3** — Implementar `getAuditLogs(page, filters)` + crear `/superadmin/logs/page.tsx`
  - Tabla paginada con filtros por acción y fecha
  - Detalles expandibles (JSON viewer simple)
  - Badge de color por tipo de acción
  - Mismo estilo visual

---

## Integración Final

- [ ] **TF.1** — Build: `npm run build` sin errores
- [ ] **TF.2** — Lint: `npm run lint` sin errores
- [ ] **TF.3** — Tests: `npx vitest run` todos pasando

---

## Resumen de Tasks

| Fase | Tasks | Tests | Archivos |
|------|-------|-------|----------|
| Fase 1 — ABM Clientes | 8 | 4 test files, ~30 escenarios | ~4 archivos |
| Fase 2 — ABM Negocios | 5 | 2 test files, ~15 escenarios | ~3 archivos |
| Fase 3 — Catálogo Planes | 7 | 4 test files, ~25 escenarios | ~5 archivos |
| Fase 4 — Logs | 6 | 2 test files, ~12 escenarios | ~5 archivos |
| Integración | 3 | — | — |
| **Total** | **29** | **12 test files** | **~17 archivos** |
