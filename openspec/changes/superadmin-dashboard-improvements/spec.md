# Spec — Superadmin Dashboard: Plan de Mejora Integral

**Change**: `superadmin-dashboard-improvements`  
**Estado**: Draft  
**Inspiración UI/UX**: `/superadmin/businesses/[id]/features`

---

## Fase 1 — Dashboard con Métricas y Layout Superadmin

*(Completada — ver diseño previo)*

---

## Fase 2 — Gestión de Clientes (Dueños de Negocios)

### 2.1 Concepto

Un **Cliente** en el contexto del superadmin es un usuario que **posee un negocio** (`User.role === ADMIN` y `Business.userId === User.id`). Son las personas que **pagan** por el servicio SaaS.

El superadmin debe poder:
- Listar todos los clientes con métricas clave
- Ver detalle de un cliente: su negocio, plan, estado de cuenta
- Registrar pagos de suscripción manuales
- Cambiar el plan de un cliente
- Visualizar historial de pagos

### 2.2 Ruta: `/superadmin/clients/page.tsx`

**Header**
- Breadcrumbs: `Superadmin > Clientes`
- Título + subtítulo estilo features page
- Badge con total de clientes

**Búsqueda y Filtros**
- Search bar: busca por email, nombre del dueño, o nombre del negocio
- Filtro por estado: `ACTIVO | MOROSO | DESACTIVADO | TODOS`
- Filtro por plan: `BASIC | PRO | ENTERPRISE | TODOS`
- Filtros como pills/badges seleccionables, no dropdowns complejos

**Tabla de Clientes**
Columnas:

| Columna | Dato | Notas |
|---------|------|-------|
| Cliente | Nombre + email del dueño | Mostrar ambos, email secundario |
| Negocio | Nombre del negocio | Link a `/superadmin/businesses/[id]` |
| Plan | BASIC/PRO/ENTERPRISE | Badge con color por plan |
| Estado | ACTIVO/MOROSO/DESACTIVADO | Badge con color (verde/rojo/gris) |
| Último Pago | Fecha | `lastPaymentDate` formateada |
| Próximo Venc. | Fecha estimada | lastPaymentDate + 30 días |
| Acciones | Botones | Detalle, Registrar Pago, Cambiar Plan |

**Paginación**
- Server-side, 20 items por página
- Controles: Anterior, página actual/total, Siguiente
- Mostrar "Mostrando X-Y de Z clientes"

**Empty State**
- "No hay clientes registrados" con ilustración simple
- CTA: "Crear un nuevo cliente" → link a promote flow (existente)

### 2.3 Ruta: `/superadmin/clients/[id]/page.tsx`

**Header**
- Breadcrumbs: `Superadmin > Clientes > {Nombre del cliente}`
- Card con gradient + datos del cliente (mismo estilo features page)
- Metadata: email, negocio, plan, estado, desde cuándo es cliente

**Secciones del detalle:**

#### 2.3.1 Resumen del Cliente (ClientCard)

| Info | Fuente |
|------|--------|
| Nombre + Email | `User.name`, `User.email` |
| Negocio | `Business.name` (link a detalle) |
| Plan actual | `BusinessFeatures.plan` |
| Estado | `Business.accountStatus` con badge |
| Cliente desde | `Business.createdAt` |
| Último pago | `Business.lastPaymentDate` |
| Próximo vencimiento | lastPaymentDate + 30 días (o "Sin datos") |

#### 2.3.2 Cambio de Plan

- Mostrar plan actual destacado
- Los 3 planes (BASIC/PRO/ENTERPRISE) como cards seleccionables
- Mismo estilo que FeaturesForm pero más compacto
- Confirmación: "¿Cambiar de {planActual} a {nuevoPlan}? Esto afectará los límites del negocio."
- Al confirmar: update en `BusinessFeatures.plan`

#### 2.3.3 Registrar Pago Manual

**Modal:** "Registrar Pago"

| Campo | Tipo | Validación |
|-------|------|------------|
| Monto | Input number | > 0, requerido |
| Método de pago | Select | EFECTIVO, TRANSFERENCIA, MERCADOPAGO, OTRO |
| Referencia | Input text | Opcional (n° transferencia, comprobante) |
| Fecha de pago | Date picker | Default: hoy, no futuro |
| Notas | Textarea | Opcional |

**Al guardar:**
1. Crear registro en `SubscriptionPayment`
2. Actualizar `Business.lastPaymentDate` a la fecha del pago
3. Si el negocio estaba MOROSO → cambiar a ACTIVO automáticamente
4. Mostrar toast de éxito y refrescar página

#### 2.3.4 Historial de Pagos

- Tabla con todos los pagos del cliente ordenados por fecha DESC
- Columnas: Fecha, Monto, Método, Referencia, Registrado por, Notas
- Si no hay pagos: "Sin pagos registrados"
- Paginación server-side (10 por página)
- El último pago debe coincidir con `lastPaymentDate` del negocio

#### 2.3.5 Información del Negocio Asociado

- Card compacta con datos del negocio:
  - Nombre (link a `/superadmin/businesses/[id]`)
  - Slug
  - Productos totales
  - Órdenes totales
  - Configuración ARCA (CUIT, condición IVA)
- Botón "Ver negocio" → link a detalle

### 2.4 Nuevo Modelo: `SubscriptionPayment`

```prisma
model SubscriptionPayment {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  amount     Float    // monto del pago
  method     String   // EFECTIVO | TRANSFERENCIA | MERCADOPAGO | OTRO
  reference  String?  // n° de transferencia, comprobante, etc.
  notes      String?  // observaciones del superadmin
  
  paidAt     DateTime @default(now())     // fecha del pago
  recordedAt DateTime @default(now())     // fecha del registro
  recordedBy String   // userId del superadmin que registró

  @@index([businessId, paidAt])
  @@index([businessId, recordedAt])
}
```

### 2.5 Server Actions Nuevas

| Action | Input | Output | Notas |
|--------|-------|--------|-------|
| `getClientsPaginated(page, search, status, plan)` | page, search?, status?, plan? | `{ clients[], total, page, totalPages }` | Busca businesses con userId != null. Filtra por status del business y plan de features. |
| `getClientDetail(businessId)` | businessId | `ClientDetail` object | Business + owner user + features + últimos pagos |
| `registerPayment(businessId, amount, method, reference?, notes?, paidAt?)` | payment data | `{ success }` | Crea SubscriptionPayment + actualiza lastPaymentDate + accountStatus |
| `changeClientPlan(businessId, newPlan)` | businessId, newPlan | `{ success }` | Update BusinessFeatures.plan + revalidate |

### 2.6 Criterios de Aceptación

- [ ] Lista de clientes con search y filtros funcionales
- [ ] Paginación server-side en lista de clientes
- [ ] Detalle de cliente con resumen completo
- [ ] Cambio de plan con confirmación
- [ ] Registro de pago manual con actualización de estado
- [ ] Historial de pagos visible
- [ ] Todo responsivo (mobile first)
- [ ] Empty states controlados
- [ ] Datos del negocio asociado visibles desde el detalle

---

## Fase 3 — Gestión Avanzada de Negocios

### 3.1 Objetivo

La página actual de negocios (`/superadmin/businesses`) tiene una tabla plana sin búsqueda, filtros ni paginación. Mejorarla con las mismas capacidades que la lista de clientes.

### 3.2 Cambios en `/superadmin/businesses/page.tsx`

**Header**
- Breadcrumbs: `Superadmin > Negocios`
- Título + subtítulo + total de negocios en badge

**Búsqueda y Filtros**
- Search bar: busca por nombre del negocio, slug, o email del dueño
- Filtro por estado: `ACTIVO | MOROSO | DESACTIVADO | TODOS`
- Filtro por plan: `BASIC | PRO | ENTERPRISE | TODOS`

**Tabla de Negocios (mejorada)**

| Columna | Dato | Notas |
|---------|------|-------|
| Negocio | Nombre | Con slug abajo en gris |
| Dueño | Email del owner | Con nombre si existe |
| Plan | BASIC/PRO/ENTERPRISE | Badge por color |
| Estado | ACTIVO/MOROSO/DESACTIVADO | Badge |
| Productos | Count | Del `_count` |
| Órdenes | Count | Del `_count` |
| Último Pago | Fecha | `lastPaymentDate` |
| Creado | Fecha | `createdAt` |
| Acciones | ARCA, Features, Eliminar | Group de botones |

**Paginación**
- Server-side, 20 items por página
- Mismo diseño que clients

**Eliminar Negocio**
- Conectar `DeleteBusinessButton` existente
- En el modal de confirmación mostrar advertencia:
  "Esto eliminará N productos, N órdenes, N clientes finales. Esta acción no se puede deshacer."
- Obtener los counts antes de mostrar el modal

### 3.3 Server Actions

| Action | Notas |
|--------|-------|
| `getBusinessesPaginated(page, search, status, plan)` | Similar a getClientsPaginated pero con includes de producto/orden counts |
| `deleteBusinessSafe(businessId)` | Versión mejorada de deleteBusiness que primero obtiene counts para mostrar advertencia |

### 3.4 Criterios de Aceptación

- [ ] Búsqueda funcional por nombre, slug y email de dueño
- [ ] Filtros por estado y plan
- [ ] Paginación server-side
- [ ] Delete con advertencia de datos asociados
- [ ] Badges de estado y plan visibles
- [ ] Responsive

---

## Fase 4 — Visualización de Usuarios Internos

### 4.1 Objetivo

El superadmin puede **ver** los empleados/cajeros de cada negocio, pero NO crearlos, editarlos ni eliminarlos. Es solo lectura informativa.

### 4.2 Ruta: `/superadmin/businesses/[id]/users/page.tsx`

**Acceso**
- Link desde el detalle del negocio (en Fase 3)
- Link desde el detalle del cliente (en Fase 2)

**Header**
- Breadcrumbs: `Superadmin > Negocios > {Negocio} > Usuarios`
- Título + badge con total de usuarios del negocio

**Tabla de Usuarios (solo lectura)**

| Columna | Dato |
|---------|------|
| Nombre | `User.name` |
| Email | `User.email` |
| Rol | ADMIN/USER con badge de color |
| Caja asignada | `User.cashbox.name` o "Sin caja" |
| Fecha registro | `User.emailVerified` o aproximado |

**Sin acciones**
- No hay botones de editar, eliminar, crear
- No hay checkboxes de selección
- Es una tabla puramente informativa

**Empty State**
- "Este negocio no tiene usuarios registrados"

**Sin paginación**
- Los negocios tienen pocos usuarios (max 999 según plan), se muestran todos

### 4.3 Server Actions

| Action | Notas |
|--------|-------|
| `getBusinessUsers(businessId)` | Solo lectura, incluye `cashbox` relation |

### 4.4 Criterios de Aceptación

- [ ] Tabla de solo lectura con usuarios del negocio
- [ ] Sin botones de acción (editar/eliminar/crear)
- [ ] Badge de rol con color
- [ ] Información de caja asignada visible
- [ ] Responsive

---

## Fase 5 — Feature Flag Enforcement en Backend

### 5.1 Objetivo

Actualmente los feature flags (`hasAfipBilling`, `hasPublicCatalog`, etc.) solo ocultan/muestran elementos en UI. Un cliente con plan BASIC puede llamar cualquier API action directamente. Hay que validar en **backend** que el negocio tenga el feature habilitado.

### 5.2 `src/lib/feature-gates.ts` — Nuevo helper

```typescript
type Feature = 
  | "afip-billing"
  | "public-catalog" 
  | "client-ledger"
  | "multi-cashbox"
  | "supplier-filter";

async function requireFeature(businessId: string, feature: Feature): Promise<void>
  // Busca BusinessFeatures del negocio
  // Si no existe o el feature está en false → lanza FeatureNotEnabledError
  // Si existe y está en true → no hace nada (success)
```

**Comportamiento:**
- Si el feature no está habilitado → lanza `FeatureNotEnabledError` con mensaje descriptivo
- El error debe ser capturado por la action y devuelto como `{ error: "Feature no habilitado: ..." }`
- Si el `BusinessFeatures` no existe → trata como si todos los features estuvieran en false (a menos que tenga plan BASIC que es default)

### 5.3 Estado actual de enforcement

| Feature | Library | Estado |
|---------|---------|--------|
| `afip-billing` | `src/actions/afip.ts` | ✅ Implementado (`requireFeature(businessId, "afip-billing")`) |
| `public-catalog` | `src/actions/catalog.ts` | ✅ Implementado (2 ocurrencias) |
| `multi-cashbox` | `src/actions/cashbox.ts` | ✅ Implementado (2 ocurrencias) |
| `client-ledger` | `src/actions/orders.ts`, `unpaid-orders.ts`, `ledger/index.ts` | ✅ Implementado (5 ocurrencias) |
| `supplier-filter` | `src/actions/stock.ts` | ❌ **Pendiente** — ver detalle abajo |

### 5.4 Supplier-filter — Implementación pendiente

**Ubicación**: `src/actions/stock.ts`

**Actions afectadas**:

| Action | Línea | Comportamiento |
|--------|-------|----------------|
| `getProductByCode(code, supplierId?)` | ~778 | Cuando `supplierId` está presente, verificar `requireFeature(businessId, "supplier-filter")`. Si no habilitado → ignorar silenciosamente el `supplierId`. |
| `getProductsBySearch(query, supplierId?)` | ~825 | Misma lógica: si `supplierId` presente y feature no habilitado → ignorar filtro. |

**Estrategia** (silent fallback, no error):
```typescript
export const getProductByCode = async (code: string, supplierId?: string) => {
  const session = await auth();
  if (!session?.user?.businessId) return null;

  // Si hay supplierId, verificar feature gate
  if (supplierId) {
    try {
      await requireFeature(session.user.businessId, "supplier-filter");
    } catch (e) {
      if (e instanceof FeatureNotEnabledError) {
        supplierId = undefined; // ignorar silenciosamente
      }
    }
  }

  // ... resto igual
```

**¿Por qué silent fallback y no error?**
- El filtro por proveedor es una comodidad, no una funcionalidad crítica
- Si el plan no lo incluye, simplemente se muestran todos los productos sin filtrar
- No hay razón para mostrar un error al usuario

### 5.5 Criterios de Aceptación

- [x] `requireFeature()` funciona correctamente para los 5 features
- [x] `afip-billing` — validado en `afip.ts`
- [x] `public-catalog` — validado en `catalog.ts`
- [x] `multi-cashbox` — validado en `cashbox.ts`
- [x] `client-ledger` — validado en `orders.ts`, `unpaid-orders.ts`, `ledger/index.ts`
- [ ] `supplier-filter` — implementar en `stock.ts`
- [ ] Tests para `supplier-filter` en `stock.ts`
- [ ] Sin regresión: si feature=true, la action funciona exactamente como antes

---

## Fase 6 — Sidebar y Navegación Responsive

### 6.1 Objetivo

La sidebar del superadmin actual está hardcodeada en el layout con links fijos. Extraerla a un componente dedicado con navegación dinámica, indicación de ruta activa, y colapso en mobile.

*Nota: Ya está incluido en Fase 1 spec. Aquí se detallan los aspectos adicionales que aplican a todas las fases.*

### 6.2 Links dinámicos

La sidebar debe actualizarse automáticamente cuando se agreguen nuevas secciones:

```typescript
const NAV_ITEMS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/clients", label: "Clientes", icon: Users },
  { href: "/superadmin/businesses", label: "Negocios", icon: Building2 },
];
```

Futuras fases solo agregan items a este array.

### 6.3 Indicación de ruta activa

- Usar `usePathname()` para detectar la ruta actual
- Match por prefijo: `/superadmin/clients/123` → "Clientes" activo
- Highlight: background color + left border + icon color

### 6.4 Badges en links

- Dashboard: sin badge
- Clientes: total de clientes (count)
- Negocios: total de negocios (count)
- Los counts se obtienen con una query ligera en el layout (o se pasan como prop)

### 6.5 Responsive

- Desktop (> 1024px): sidebar colapsada (64px), expande en hover (240px)
- Tablet (768-1024px): sidebar colapsada (64px), sin auto-expand en hover (solo tooltips)
- Mobile (< 768px): sidebar oculta, hamburger toggle con overlay

### 6.6 Criterios de Aceptación

- [ ] Links dinámicos desde array configurable
- [ ] Ruta activa detectada correctamente (incluyendo sub-rutas)
- [ ] Badges de conteo visibles
- [ ] Comportamiento responsive correcto en 3 breakpoints
- [ ] Transiciones suaves

---

## Fase 7 — Validaciones ARCA

### 7.1 Objetivo

Actualmente `ArcaFieldsSchema` solo valida que los campos no estén vacíos. Mejorar con validaciones específicas para evitar datos inválidos.

### 7.2 Validación de CUIT (Módulo 11)

```typescript
// Algoritmo de validación de CUIT Argentina (módulo 11)
function validateCuit(cuit: string): boolean {
  // Formato: XX-XXXXXXXX-X o XXXXXXXXXXX (sin guiones)
  // 1. Limpiar guiones y espacios
  // 2. Verificar longitud = 11 dígitos
  // 3. Calcular dígito verificador con módulo 11
  // 4. Comparar con el último dígito
}
```

**En el schema:**
```typescript
export const ArcaFieldsSchema = z.object({
  cuit: z.string()
    .min(1, "CUIT es obligatorio")
    .refine(validateCuit, "CUIT inválido"),
  // ...
});
```

**Feedback visual:**
- El formulario debe mostrar el error "CUIT inválido" inmediatamente después de escribir
- Usar `FormMessage` de ShadCN (ya implementado)

### 7.3 Validación de Certificado (PEM)

```typescript
// Validar que el certificado tenga formato PEM válido
function validateCertPEM(cert: string): boolean {
  if (!cert || cert.length === 0) return true; // opcional
  return cert.trim().startsWith("-----BEGIN CERTIFICATE-----");
}
```

**En el schema:**
```typescript
cert: z.string()
  .optional()
  .refine(cert => !cert || validateCertPEM(cert), "Formato de certificado inválido. Debe comenzar con -----BEGIN CERTIFICATE-----"),
```

### 7.4 Validación de Clave Privada (PEM)

```typescript
function validateKeyPEM(key: string): boolean {
  if (!key || key.length === 0) return true; // opcional
  return key.trim().startsWith("-----BEGIN PRIVATE KEY-----") || 
         key.trim().startsWith("-----BEGIN RSA PRIVATE KEY-----");
}
```

### 7.5 `src/lib/validators.ts` — Nuevo archivo

```typescript
export function validateCuit(cuit: string): boolean;
export function validateCertPEM(cert: string): boolean;
export function validateKeyPEM(key: string): boolean;
```

### 7.6 Criterios de Aceptación

- [ ] CUIT inválido muestra error en el formulario
- [ ] CUIT válido pasa sin error
- [ ] Certificado sin formato PEM muestra error
- [ ] Clave privada sin formato PEM muestra error
- [ ] Todos los tests de validación pasan
- [ ] Sin regresión: formulario ARCA sigue funcionando

---

## Fase 8 — Consistencia de UX

### 8.1 Objetivo

Pulir detalles menores que quedaron inconsistentes durante el desarrollo.

### 8.2 Migrar `alert()` a `sonner` toasts

**Archivos a modificar:**
- `src/components/Superadmin/promote-button.tsx` — cambiar `alert()` por `toast.error()` / `toast.success()`
- `src/components/Superadmin/delete-business-button.tsx` — cambiar `alert()` por `toast`

### 8.3 Estandarizar imports de `auth`

Actualmente algunas páginas importan `auth` desde `../../auth` (ruta relativa) y otras desde `@/lib/auth`.

| Archivo | Import actual | Import nuevo |
|---------|--------------|--------------|
| `src/app/superadmin/layout.tsx` | `from "../../../auth"` | `from "@/lib/auth"` |
| `src/app/superadmin/dashboard/page.tsx` | `from "../../../../auth"` | `from "@/lib/auth"` |
| `src/app/superadmin/businesses/page.tsx` | `from "../../../../auth"` | `from "@/lib/auth"` |
| `src/actions/arca.ts` | `from "../../auth"` | `from "@/lib/auth"` |

### 8.4 Unificar estilo de headers

Todas las páginas del superadmin deben tener el mismo patrón de header:
- Breadcrumbs
- Card con gradient oscuro
- Título + subtítulo

Aplicar a:
- `/superadmin/businesses/page.tsx` (header actual es simple)
- `/superadmin/businesses/[id]/arca/page.tsx` (header actual es simple)

### 8.5 Tablas vacías — Estados "Sin datos"

Cuando una tabla no tiene resultados, mostrar un estado vacío consistente:
- Icono grande + "Sin datos" + mensaje descriptivo
- Mismo componente reutilizable en todas las tablas

### 8.6 Criterios de Aceptación

- [ ] Sin `alert()` en ningún componente del superadmin
- [ ] Todos los imports de `auth` usan `@/lib/auth`
- [ ] Todas las páginas tienen header consistente
- [ ] Tablas vacías muestran estado "Sin datos"
