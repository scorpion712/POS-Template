# PRD: POS Stabilization V2 — Pagos Vencidos, Config, Reportes, Catálogo

> **Source:** `Untitled2.md` (Changes + Bugs sections)
> **Propósito:** Roadmap ejecutable para AI agents en flujo SDD
> **Entry point:** `/sdd-new <nombre-del-cambio>` sobre cada FR

---

## 1. Resumen Ejecutivo

Quedaron items del documento original que no se cubrieron en la primer ronda del PRD de estabilización, más bugs nuevos identificados. Este PRD organiza todo en **4 fases** priorizadas por impacto:

| Fase | Nombre | Impacto | Dependencias |
|------|--------|---------|-------------|
| 1 | 🔴 Pago Vencido — Modal Inbloqueable | UX rota, riesgo de流失 | Ninguna |
| 2 | 🔴 Bugs de Config + Reportes | Funcionalidad rota | Ninguna |
| 3 | 🟡 Catálogo — Feature gate en formulario | Inconsistencia plan | Ninguna |
| 4 | 🟡 Sidebar en Config | UX menor | Ninguna |

---

## 2. Línea Base

### Estado actual
- El PRD original (V1) cubrió FR-001 a FR-022, todas las fases de estabilización original
- `FeatureBlockedModal` existe como componente reutilizable con variantes `plan`, `overdue`, `feature`
- `requireFeature()`, `assertLimit()`, `checkLimit()` están implementados vía `getCachedPlan()`
- Schema refactor (FR-100) completado: `PlanDefinition` como fuente de verdad, `BusinessFeatures` con `overrides` JSON

### FeatureBlockedModal actual
```tsx
<FeatureBlockedModal
  reason="overdue" | "plan" | "feature" | "limit"
  feature="..."
  showAcknowledge={true}  // ← tiene botón "Entendido"
/>
```

**Problema:** El modal actual tiene botón "Entendido" que lo cierra. Para pago vencido necesitamos un modal que el usuario NO pueda cerrar.

---

## 3. Fase 1: Pago Vencido — Modal Inbloqueable 🔴

> **Entry point:** `/sdd-new overdue-payment-modal`

### FR-023: Modal de pago vencido sin escape

**Problema:** Cuando un cliente tiene el pago vencido, el sistema debe bloquear TODA la interacción con un modal que el usuario no pueda dismissar. El `FeatureBlockedModal` actual tiene botón "Entendido" que lo cierra — esto no sirve para pago vencido.

**Comportamiento esperado:**

El modal debe:
- **No tener cruz** (ni botón de cierre)
- **Botón de WhatsApp** visible pero NO cierra el modal — solo abre WhatsApp en otra pestaña
- **Recargar la página** lo vuelve a mostrar inmediatamente
- **Herramientas de dev** (inspeccionar, borrar elemento del DOM): si alguien logra quitarlo vía DevTools, un `useEffect` o `MutationObserver` lo vuelve a mostrar o redirige a una página de bloqueo
- **Única salida:** que el administrador del sistema resuelva el pago (cambiar status a `ACTIVO`)

**Validación en Server Actions:**
- Cada Server Action debe verificar `business.accountStatus !== "MOROSO"` ANTES de ejecutar cualquier operación
- Si está moroso: retornar error específico que el front detecte y muestre el modal

**Criterios de aceptación:**
- [ ] Modal sin botón de cierre (X), sin `showAcknowledge`
- [ ] WhatsApp abre en nueva pestaña y NO cierra el modal
- [ ] Recarga de página → modal reaparece
- [ ] DevTools bypass detectado → modal reaparece o redirect a `/payment-blocked`
- [ ] Server Actions verifican `accountStatus` antes de cualquier operación
- [ ] Front detecta error de pago vencido y muestra modal (no toast)
- [ ] Una vez que el admin cambia a `ACTIVO`, el modal desaparece en el próximo request

---

## 4. Fase 2: Bugs de Config + Reportes 🔴

> **Entry point:** `/sdd-new fix-config-reports`

### FR-024: Config page — Sin side nav

**Problema:** La página de Configuración no muestra el SideNav, lo que rompe la navegación y consistencia con el resto de la app.

**Comportamiento esperado:**
- Config page renderiza dentro del layout protegido con SideNav
- Misma estructura que el resto de páginas protegidas

**Criterios de aceptación:**
- [ ] SideNav visible en `/config`
- [ ] Navegación funciona correctamente
- [ ] Ruta consistente con el resto del layout protegido

### FR-025: Config page — Proteger por plan con facturación

**Problema:** Config es accesible aunque el plan no tenga habilitada la facturación electrónica (`hasAfipBilling`).

**Comportamiento esperado:**
- Ruta `/config` protegida por `requireFeature("afip-billing")`
- Si no tiene el feature: mostrar `FeatureBlockedModal` (estándar, con "Entendido")
- Server Action de config también debe validar

**Criterios de aceptación:**
- [ ] Ruta protegida en layout/page con feature gate
- [ ] Server Action validada
- [ ] Modal de feature no disponible si no tiene plan

### FR-026: Reportes — Validar actualizaciones de stock

**Problema:** No hay certeza de que los reportes de stock (entradas, salidas, ventas) se actualicen correctamente cuando hay movimientos.

**Comportamiento esperado:**
- Analizar todas las actions que modifican stock: ventas, compras, ajustes manuales, eliminaciones
- Verificar que los reportes reflejen los cambios correctamente
- Agregar test cases para:
  - Producto vendido → stock decrementa → reporte refleja
  - Producto devuelto → stock incrementa → reporte refleja
  - Mismo producto en múltiples operaciones → consistencia
  - Stock negativo (debería bloquearse)

**Criterios de aceptación:**
- [ ] Auditoría completa de todas las rutas de modificación de stock
- [ ] Test cases documentados para cada escenario
- [ ] Tests implementados y pasando

---

## 5. Fase 3: Catálogo — Feature Gate en Formulario 🟡

> **Entry point:** `/sdd-new catalog-plan-gate`

### FR-027: Nuevo/Editar producto — Ocultar switch de catálogo si no tiene plan

**Problema:** El switch "Catálogo activo" aparece en el formulario de producto aunque el usuario no tenga `hasPublicCatalog` en su plan. La Server Action tampoco valida este flag.

**Comportamiento esperado:**
- UI: el switch "Catálogo activo" (o similar) solo se renderiza si `hasPublicCatalog === true`
- Server Action `createProduct`/`updateProduct`: validar que `isActiveInCatalog` nunca sea `true` si `hasPublicCatalog` es `false`
- Si el plan no tiene catálogo: `isActiveInCatalog` se fuerza a `false`

**Criterios de aceptación:**
- [ ] Switch oculto cuando no tiene el feature
- [ ] Server Action rechaza `isActiveInCatalog: true` sin feature
- [ ] Productos existentes con `isActiveInCatalog: true` se mantienen (migración, no perder datos)
- [ ] Si se habilita el feature después, los switches aparecen con el valor actual de cada producto

---

## 6. Fase 4: Sidebar en Config 🟡

> **Entry point:** `/sdd-new fix-config-sidebar`

### FR-028: Config page — Sidebar consistente

Ya cubierto en FR-024 como parte del mismo cambio. Se separa aquí como FR independiente si se quiere abordar por separado.

---

## 7. Plan de Ejecución SDD

### Dependencias entre fases

```
Fase 1 (Pago vencido modal)
  │
  ├──→ Fase 2 (Config + Reportes) — paralelo
  │
  └──→ Fase 3 (Catálogo gate) — independiente
```

### Batches SDD sugeridos

| Batch | Nombre | FRs | Tipo | Depende de |
|-------|--------|-----|------|-----------|
| 1 | `overdue-payment-modal` | FR-023 | `/sdd-new` | — |
| 2 | `fix-config-reports` | FR-024, FR-025, FR-026 | `/sdd-new` | — |
| 3 | `catalog-plan-gate` | FR-027 | `/sdd-new` | — |

---

## 8. Risks and Mitigations

| Risk | Impact | Prob. | Mitigation |
|------|--------|-------|------------|
| Modal inbloqueable puede frustrar usuarios que quieren usar la app | 🟡 MEDIUM | Alta | Mensaje claro con instrucciones de pago + WhatsApp |
| MutationObserver para detectar DevTools puede tener falsos positivos | 🟡 MEDIUM | Baja | Usar enfoque simple: redirect a `/payment-blocked` como fallback |
| Cambiar configuración de stock reports puede requerir consultas pesadas | 🟡 MEDIUM | Media | Optimizar con queries agregadas, no sumar registros uno por uno |
| Side nav en Config puede necesitar refactor de layout | 🟡 MEDIUM | Baja | Verificar que la page está dentro del grupo `(protected)` |

---

## 9. Appendix: Mapeo Completo

| FR | Source en Untitled2.md | Original |
|----|----------------------|----------|
| FR-023 | Changes: Pago Vencido — Modal inbloqueable | Modal sin cruz, WhatsApp no cierra, recarga re-muestra, DevTools bypass detectado |
| FR-024 | Bugs: Config page no muestra side nav | SideNav ausente en /config |
| FR-025 | Bugs: Config accesible sin plan con facturación | Ruta no protegida por feature gate |
| FR-026 | Bugs: Analizar reportes de stock | Validar consistencia de stock updates |
| FR-027 | Bugs: Producto — switch catálogo sin plan | Switch visible + Server Action sin validación |
