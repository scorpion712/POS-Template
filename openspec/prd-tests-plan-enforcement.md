# PRD: Tests — Plan Enforcement Coverage

> **Source:** `Untitled2.md` (Test section)
> **Propósito:** Garantizar que el sistema de planes (features + límites) esté correctamente testeado en frontend y backend
> **Entry point:** `/sdd-new <nombre-del-cambio>` sobre cada FR

---

## 1. Resumen Ejecutivo

El sistema de planes (BASIC, PRO, ENTERPRISE, DEMO) tiene enforcement en backend vía `requireFeature()` y `checkLimit()`, y componentes UI que responden a estos gates. Pero no hay tests que validen que cada feature gate y cada límite funcione correctamente para cada plan.

| FR | Nombre | Impacto | Dependencias |
|----|--------|---------|-------------|
| FR-201 | Test: Feature Gates por plan | Data integrity | Schema refactor (ya completado) |
| FR-202 | Test: Límites (productos/usuarios/clientes) | Data integrity | Schema refactor (ya completado) |
| FR-203 | Test: UI responde a feature gates | UX consistency | FR-201 |
| FR-204 | Test: Plan DEMO — límites diarios | Revenue protection | FR-022 (ya implementado) |

---

## 2. Línea Base

### Stack de testing
- **Framework:** Vitest
- **Ubicación:** `src/__tests__/`
- **Tests existentes:** 22 tests (principalmente de actions de ventas)

### Sistema de Planes (post-FR-100)
- `getCachedPlan()` en `src/lib/plan-resolver.ts` — resuelve plan + features + límites
- `requireFeature(feature)` — lanza `FeatureNotEnabledError`
- `checkLimit(resource, count)` — lanza `PlanLimitError`
- `useFeatures()` hook — resolución client-side
- `FeatureBlockedModal` — componente UI para errores de plan

---

## 3. FR-201: Test — Feature Gates por plan 🔴

> **Entry point:** `/sdd-new test-feature-gates`

**Problema:** No hay tests que verifiquen que cada feature gate funcione correctamente para cada plan.

**Cobertura requerida:**

| Feature | BASIC | PRO | ENTERPRISE | DEMO |
|---------|-------|-----|------------|------|
| `afip-billing` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |
| `public-catalog` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |
| `client-ledger` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |
| `multi-cashbox` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |
| `supplier-filter` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |
| `budget` | ❌ debe fallar | ✅ debe pasar | ✅ debe pasar | ✅ debe pasar |

**Casos edge:**
- Business con overrides personalizados → debe respetar overrides, no defaults del plan
- Business sin `BusinessFeatures` registrado → debe lanzar error claro
- Feature gate con feature inexistente → debe lanzar error claro

**Criterios de aceptación:**
- [ ] Matriz completa de feature × plan testeada
- [ ] Overrides correctamente aplicados
- [ ] Edge cases cubiertos
- [ ] Tests corren en < 5s

---

## 4. FR-202: Test — Límites por plan 🔴

> **Entry point:** `/sdd-new test-plan-limits`

**Problema:** `checkLimit()` no tiene tests que verifiquen los límites correctos para cada plan.

**Cobertura requerida:**

| Límite | BASIC | PRO | ENTERPRISE | DEMO |
|--------|-------|-----|------------|------|
| `maxUsers` | 1 | 5 | ∞ (null) | 2 |
| `maxProducts` | 100 | ∞ (null) | ∞ (null) | 500 |
| `maxClients` | 50 | 500 | ∞ (null) | 100 |

**Casos edge:**
- `checkLimit()` con count en el límite exacto → debe fallar (count >= limit)
- `checkLimit()` con count justo debajo → debe pasar
- Límite `null` (sin límite) → siempre pasa
- Override que aumenta/disminuye un límite

**Criterios de aceptación:**
- [ ] Matriz completa de límite × plan testeada
- [ ] Edge cases: límite exacto, sin límite, overrides
- [ ] Tests unitarios de `checkLimit()` directamente

---

## 5. FR-203: Test — UI responde a feature gates 🟡

> **Entry point:** `/sdd-new test-ui-feature-gates`
> **Depende de:** FR-201 (o puede usar mocks)

**Problema:** Los componentes UI reaccionan a `useFeatures()` para mostrar/ocultar funcionalidad, pero no hay tests que verifiquen esta lógica.

**Cobertura requerida:**
- `BillButtons` — no muestra "Facturar" si no tiene `afip-billing`
- `PrintableTable` — oculta columnas según plan
- Sidebar — oculta secciones según plan
- Stock page — oculta switch de catálogo (FR-027)
- Páginas protegidas redirigen o muestran modal

**Criterios de aceptación:**
- [ ] Tests de componentes cliente con mocks de `useFeatures()`
- [ ] Verificar render condicional para cada gate
- [ ] Modal se muestra en lugar de contenido cuando feature no disponible

---

## 6. FR-204: Test — Plan DEMO límites diarios 🟡

> **Entry point:** `/sdd-new test-demo-daily-limits`
> **Depende de:** FR-022 (ya implementado)

**Problema:** El plan DEMO tiene límites diarios (3 ventas, 5 productos, 2 clientes) que deben resetearse a las 00:00 Argentina. No hay tests que validen este comportamiento.

**Cobertura requerida:**
- Límite diario de ventas (3/día) — se bloquea al alcanzarlo
- Límite diario de productos creados (5/día)
- Límite diario de clientes creados (2/día)
- Reseteo de contadores al cambiar de día
- Auto-downgrade a BASIC a los 30 días

**Criterios de aceptación:**
- [ ] Tests para cada límite diario
- [ ] Test de reseteo de contadores
- [ ] Test de expiración del trial

---

## 7. Plan de Ejecución SDD

### Dependencias

```
FR-201 (Feature gates unit tests)
  │
  ├──→ FR-202 (Limits unit tests) — paralelo
  │
  ├──→ FR-203 (UI tests) — requiere FR-201 como base O usar mocks
  │
  └──→ FR-204 (DEMO tests) — independiente
```

### Batches SDD sugeridos

| Batch | Nombre | FRs | Tipo | Depende de |
|-------|--------|-----|------|-----------|
| 1 | `test-feature-gates` | FR-201 | `/sdd-new` | — |
| 2 | `test-plan-limits` | FR-202 | `/sdd-new` | — |
| 3 | `test-ui-feature-gates` | FR-203 | `/sdd-new` | FR-201 (o mocks) |
| 4 | `test-demo-daily-limits` | FR-204 | `/sdd-new` | — |

---

## 8. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tests de UI requieren jsdom + mocks complejos | 🟡 MEDIUM | Usar mocks simples de `useFeatures()`, no integration tests |
| Límites diarios dependen de fecha/hora | 🟡 MEDIUM | Mockear `new Date()` o `dayjs` en tests |
| Tests lentos por queries a DB | 🟡 MEDIUM | Usar mocks de Prisma, no DB real |
