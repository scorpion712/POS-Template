# PRD: Code Refactor — Clean Code, Patrones y Calidad

> **Source:** `Untitled2.md` (Code Refactor section)
> **Propósito:** Roadmap ejecutable para mejorar calidad de código siguiendo clean code, buenos patrones y preparando el sistema para futura migración
> **Entry point:** `/sdd-new <nombre-del-cambio>` sobre cada FR

---

## 1. Resumen Ejecutivo

El código tiene deuda técnica acumulada: magic strings/numbers, comparaciones de roles inline, patrones inconsistentes, useEffect mal utilizados, N+1 queries, y duplicación de lógica. Este PRD organiza el refactor en **6 fases** priorizadas por impacto mantenibilidad.

| Fase | Nombre | Impacto | Dependencias |
|------|--------|---------|-------------|
| 1 | 🔴 Role enum + constantes | Type safety, legibilidad | Ninguna |
| 2 | 🔴 Magic strings/numbers | Mantenibilidad | Ninguna |
| 3 | 🟡 N+1 queries + duplicación | Performance | Ninguna |
| 4 | 🟡 useEffect antipatterns | Bugs, re-renders | Ninguna |
| 5 | 🟡 Server Actions → API layer | Escalabilidad | Fases 1-4 |
| 6 | 🔍 Auditoría completa | Descubrimiento | Ninguna (exploración) |

---

## 2. Línea Base

### Stack
- Next.js 15 App Router, React 19, TypeScript strict
- Server Actions para mutaciones
- Zustand + Context para estado
- Prisma + PostgreSQL

### Patrón actual de roles
```typescript
// Ejemplo distribuido en el código:
if (user.role === "ADMIN") { ... }
// vs
const isAdmin = business.condicionIva === "MONOTRIBUTO";
```

### Estado del testing
- Vitest configurado, 22 tests existentes
- Sin tests de componentes ni integración

---

## 3. Fase 1: Role Enum + Constantes 🔴

> **Entry point:** `/sdd-new refactor-role-enum`

### FR-301: Reemplazar comparaciones de role inline

**Problema:** Las comparaciones `=== "ADMIN"` están esparcidas por todo el código sin un tipo centralizado.

**Comportamiento esperado:**

```typescript
// src/models/roles.ts
export const Role = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  // ...otros roles del sistema
} as const;

export type Role = (typeof Role)[keyof typeof Role];

// Uso:
if (user.role === Role.ADMIN) { ... }
```

**Mismo patrón para otros strings mapeables:**
```typescript
// src/models/business.ts
export const CondicionIva = {
  MONOTRIBUTO: "MONOTRIBUTO",
  RESPONSABLE_INSCRIPTO: "RESPONSABLE_INSCRIPTO",
} as const;

export const CertStatus = {
  CONFIGURADO: "CONFIGURADO",
  NO_CONFIGURADO: "",
} as const;
```

**Cobertura:** Buscar y reemplazar TODAS las ocurrencias de:
- `=== "ADMIN"` / `!== "ADMIN"`
- `=== "MONOTRIBUTO"` / `=== "RESPONSABLE_INSCRIPTO"`
- `=== "CONFIGURADO"` y similar
- Cualquier otro string mágico de comparación de estado/rol

**Criterios de aceptación:**
- [ ] `Role` enum definido con as const
- [ ] `CondicionIva` enum definido
- [ ] `CertStatus` enum definido
- [ ] Todas las ocurrencias reemplazadas
- [ ] `tsc --noEmit` pasa limpio
- [ ] Tests existentes siguen pasando

---

## 4. Fase 2: Magic Strings/Numbers 🔴

> **Entry point:** `/sdd-new refactor-magic-values`

### FR-302: Extraer magic strings y numbers a constantes

**Problema:** Hay valores hardcodeados (timeouts, límites, URLs, mensajes de error) que deberían ser constantes con nombre.

**Patrón esperado:**
```typescript
// src/lib/constants.ts
export const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires";
export const WHATSAPP_CONTACT = "+5492265418113";
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50],
} as const;
export const DEMO_DAILY_LIMITS = {
  SALES: 3,
  PRODUCTS: 5,
  CLIENTS: 2,
} as const;
```

**Áreas a auditar:**
- Timezone strings ("America/Argentina/Buenos_Aires", "-03:00")
- URLs de WhatsApp hardcodeadas
- Números de paginación (take: 20, take: 1100)
- Mensajes de error repetidos
- Timeouts y delays
- Status codes HTTP

**Criterios de aceptación:**
- [ ] Archivo `src/lib/constants.ts` creado
- [ ] Todas las ocurrencias extraídas
- [ ] Sin regresiones funcionales

---

## 5. Fase 3: N+1 Queries + Duplicación 🟡

> **Entry point:** `/sdd-new refactor-n-plus-one`

### FR-303: Eliminar N+1 queries y duplicación de llamadas

**Problema:** Patrones donde se hace un `findUnique`/`findFirst` dentro de un loop (N+1), o donde la misma query se ejecuta múltiples veces en el mismo request.

**Patrones a buscar y refactorizar:**

```typescript
// MAL: N+1
for (const id of ids) {
  const item = await db.product.findUnique({ where: { id } });
}

// BIEN: batch
const items = await db.product.findMany({ where: { id: { in: ids } } });
```

```typescript
// MAL: llamada duplicada
const business = await db.business.findUnique({ where: { id: session.user.businessId } });
// ... 20 líneas después ...
const businessAgain = await db.business.findUnique({ where: { id: session.user.businessId } });

// BIEN: React.cache() o variable compartida
```

**Áreas a auditar:**
- `bulkUpdatePrices` / `bulkUpdateAmounts` (ya identificado como N+1)
- Cualquier `for`/`forEach` con `findUnique`/`findFirst` adentro
- Múltiples `auth()` calls en el mismo request
- Múltiples `findUnique({ where: { businessId } })` en la misma Server Action

**Criterios de aceptación:**
- [ ] Auditoría documentada de todos los N+1
- [ ] Fixes implementados con batch queries
- [ ] `React.cache()` aplicado donde tenga sentido
- [ ] Sin cambios funcionales

---

## 6. Fase 4: useEffect Antipatterns 🟡

> **Entry point:** `/sdd-new refactor-useeffects`

### FR-304: Corregir useEffect mal utilizados

**Problema:** useEffects usados para sincronizar estado que podría derivarse durante el render, o con dependencias incorrectas que causan re-renders infinitos.

**Patrones a buscar:**

```typescript
// MAL: estado derivado
const [total, setTotal] = useState(0);
useEffect(() => {
  setTotal(items.reduce((sum, i) => sum + i.price * i.amount, 0));
}, [items]);

// BIEN: derivar durante el render
const total = items.reduce((sum, i) => sum + i.price * i.amount, 0);
```

```typescript
// MAL: fetch en useEffect sin cleanup
useEffect(() => {
  fetchData().then(setData);
}, []);

// BIEN: Server Component o React Query
```

**Criterios de aceptación:**
- [ ] Auditoría de todos los useEffect en la codebase
- [ ] Casos de estado derivado → refactor a variable de render
- [ ] Casos de fetch → migrar a donde corresponda
- [ ] Casos de suscripciones → cleanup añadido

---

## 7. Fase 5: Server Actions → API Layer 🟡

> **Entry point:** `/sdd-new refactor-api-layer`

### FR-305: Preparar arquitectura para futura migración a API

**Problema:** Actualmente toda la lógica de negocio está en Server Actions. Esto funciona para Next.js pero dificulta una futura migración a API standalone (Node, FastAPI, etc.).

**Comportamiento esperado:**
- Separar lógica de negocio de la capa de transporte (Server Action)
- Extraer servicios con funciones puras que reciben `db` como dependencia
- Las Server Actions quedan como thin wrappers que llaman a los servicios

```typescript
// src/services/products.ts — lógica pura
export async function createProductService(
  db: PrismaClient,
  businessId: string,
  data: CreateProductInput
) {
  // validaciones, límites, creación
}

// src/actions/stock/products.ts — thin wrapper
export const createProduct = async (data: CreateProductInput) => {
  const session = await auth();
  return createProductService(db, session.user.businessId, data);
};
```

**Criterios de aceptación:**
- [ ] Service layer creada para módulos core (products, sales, clients, users, cashboxes)
- [ ] Server Actions refactorizadas a thin wrappers
- [ ] Tests pueden llamar services directamente sin auth
- [ ] `tsc --noEmit` pasa limpio

---

## 8. Fase 6: Auditoría Completa 🔍

> **Entry point:** `/sdd-explore full-code-audit`

### FR-306: Auditoría general de calidad de código

**Problema:** No hay un inventario completo de problemas de código.

**Alcance de la auditoría:**
- **Magic numbers/strings** no cubiertos en FR-301/302
- **Algoritmos complejos** que pueden simplificarse
- **Duplicación de lógica** entre componentes
- **Tipados incorrectos** (`any`, `as any`, `@ts-expect-error`)
- **Importaciones no utilizadas**
- **Código muerto** (comentado, sin referencia)
- **Complejidad ciclomática** alta en funciones
- **Patrones inseguros** (mutación directa de estado, falta de validación)

**Output esperado:**
- Documento con todos los hallazgos categorizados por severidad
- Sugerencia de nuevos FRs para refactor si es necesario

**Criterios de aceptación:**
- [ ] Auditoría completa documentada en `openspec/audit-code-quality.md`
- [ ] Cada hallazgo con severidad (CRITICAL/MAJOR/MINOR/SUGGESTION)
- [ ] Recomendaciones priorizadas

---

## 9. Plan de Ejecución SDD

### Dependencias

```
Fase 6 (Auditoría) — puede ir primero para guiar el resto
  │
  ├──→ Fase 1 (Role enum) — independiente
  ├──→ Fase 2 (Magic values) — independiente
  ├──→ Fase 3 (N+1) — independiente
  ├──→ Fase 4 (useEffects) — independiente
  └──→ Fase 5 (API layer) — puede beneficiarse de Fases 1-4
```

### Batches SDD sugeridos

| Batch | Nombre | FRs | Tipo | Depende de |
|-------|--------|-----|------|-----------|
| 0 | `full-code-audit` | FR-306 | `/sdd-explore` | — |
| 1 | `refactor-role-enum` | FR-301 | `/sdd-new` | — |
| 2 | `refactor-magic-values` | FR-302 | `/sdd-new` | — |
| 3 | `refactor-n-plus-one` | FR-303 | `/sdd-new` | — |
| 4 | `refactor-useeffects` | FR-304 | `/sdd-new` | — |
| 5 | `refactor-api-layer` | FR-305 | `/sdd-new` | Opcional |

---

## 10. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Refactor de roles puede romper lógica de autorización | 🔴 CRITICAL | Tests exhaustivos + code review por cada cambio |
| Extraer magic strings a constantes requiere tocar muchos archivos | 🟡 MEDIUM | Hacer por módulo, no todo junto |
| N+1 fixes pueden cambiar orden de resultados | 🟡 MEDIUM | Usar `orderBy` explícito en batch queries |
| API layer puede ser over-engineering si no se migra nunca | 🟡 MEDIUM | Hacerlo gradual, solo donde aporta testabilidad |
| Auditoría puede generar lista enorme y abrumadora | 🟡 MEDIUM | Priorizar por severidad, no resolver todo |
