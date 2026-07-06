# PRD: Mejoras UI — Paginación en Caja, Cajas y Usuarios

> **Source:** `Untitled2.md` (Mejoras section)
> **Propósito:** Roadmap ejecutable para AI agents en flujo SDD
> **Entry point:** `/sdd-new <nombre-del-cambio>` sobre cada FR

---

## 1. Resumen Ejecutivo

Tres pantallas del POS carecen de paginación: la sesión de caja activa (productos vendidos), el listado de cajas, y el listado de usuarios. A medida que crecen los datos, la performance y UX se degradan.

| FR | Nombre | Impacto | Dependencias |
|----|--------|---------|-------------|
| FR-101 | Caja activa — Paginado de productos | Performance UX | Ninguna |
| FR-102 | Listado de Cajas — Paginado | Performance UX | Ninguna |
| FR-103 | Listado de Usuarios — Paginado | Performance UX | Ninguna |

---

## 2. Línea Base

### Paginación existente en el sistema
- **Stock/Productos:** ya tiene `ProductDataTable` con paginación vía `DataTablePagination` (Shadcn)
- **Ventas:** `SalesTable` con paginación
- **Clientes:** paginación presente

### Stack de UI
- Shadcn `Table` + `DataTablePagination` component
- Server Actions con `skip`/`take` params
- Componentes cliente con `useState` para página actual

---

## 3. FR-101: Caja Activa — Paginado de productos vendidos 🟡

> **Entry point:** `/sdd-new paginate-cashbox-session`

**Problema:** La sesión de caja activa muestra todos los productos vendidos en una lista sin paginar. Con muchas ventas en un turno, la UI se vuelve lenta y difícil de navegar.

**Comportamiento esperado:**
- Tabla de productos en sesión de caja con paginación (10/20/50 por página)
- Mismo componente `DataTablePagination` que ya se usa en Stock
- Server Action existente debe soportar `skip`/`take`
- Total de resultados para calcular páginas

**Criterios de aceptación:**
- [ ] Paginación visible y funcional en sesión de caja
- [ ] Selector de items por página (10, 20, 50)
- [ ] Server Action soporta paginación
- [ ] Consistent styling con Stock pagination

---

## 4. FR-102: Listado de Cajas — Paginado 🟡

> **Entry point:** `/sdd-new paginate-cashboxes-list`

**Problema:** El listado de cajas (`/cashboxes`) no tiene paginación. Con muchas cajas (multi-cashbox), la lista crece indefinidamente.

**Comportamiento esperado:**
- Tabla de cajas con paginación
- Mismo patrón que FR-101
- Server Action con `skip`/`take`

**Criterios de aceptación:**
- [ ] Paginación en listado de cajas
- [ ] Selector de items por página
- [ ] Server Action paginada
- [ ] Consistente con resto del sistema

---

## 5. FR-103: Listado de Usuarios — Paginado 🟡

> **Entry point:** `/sdd-new paginate-users-list`

**Problema:** El listado de usuarios (`/users`) no tiene paginación.

**Comportamiento esperado:**
- Tabla de usuarios con paginación
- Server Action paginada
- Mismo patrón que FR-101/FR-102

**Criterios de aceptación:**
- [ ] Paginación en listado de usuarios
- [ ] Selector de items por página
- [ ] Server Action paginada

---

## 6. Plan de Ejecución SDD

### Dependencias

Las 3 son independientes entre sí.

### Batches SDD sugeridos

| Batch | Nombre | FRs | Tipo |
|-------|--------|-----|------|
| 1 | `paginate-cashbox-session` | FR-101 | `/sdd-new` |
| 2 | `paginate-cashboxes-list` | FR-102 | `/sdd-new` |
| 3 | `paginate-users-list` | FR-103 | `/sdd-new` |

Se pueden ejecutar en paralelo porque cada uno toca componentes distintos.

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cashbox session tiene datos en memoria + fetch | 🟡 MEDIUM | Asegurar que el paginado use la misma fuente de datos (fetched) |
| Cambiar Server Action existente puede romper consumo actual | 🔴 HIGH | Mantener compatibilidad: parámetros opcionales con defaults |
