# Plan de Tests — Superadmin v2 + Planes

## Objetivo

Validar que todas las funcionalidades nuevas del módulo Superadmin funcionan correctamente y que los planes (BASIC / PRO / ENTERPRISE) se aplican efectivamente desde el lado del usuario SaaS.

---

## 📋 Escenarios de prueba disponibles

El dataset generado (`prisma/_dataset.ts`) creó estos negocios con distintos perfiles para testear:

| Negocio | Plan | Dueño (ADMIN) | User (no-admin) | Edge case |
|---|---|---|---|---|
| Panadería El Trigal | **BASIC** | roberto@eltrigal.com | lucia@eltrigal.com | Pago atrasado (35d) |
| Librería Progreso | **BASIC** | sofia@libreriaprogreso.com | tomas@libreriaprogreso.com | Sin pago |
| Carnicería Don Pedro | **BASIC** | pedro@donpedro.com | micaela@donpedro.com | Recién creado (2d) |
| Los Pibes | **BASIC** | martin@lospibes.com | Marina (USER) | Sin pago |
| Ferretería El Tornillo Feliz | **PRO** | marcela@tornillofeliz.com | carlos@tornillofeliz.com | **MOROSO** (75d) |
| Distribuidora del Sur | **PRO** | laura@distribuidorasur.com | jorge@distribuidorasur.com | Cerca de vencer (28d) |
| GM | **PRO** | gaston@gm.com | lautaro@gm.com | Sin pago |
| Autopartes Martínez | **ENTERPRISE** | diego@autopartesmartinez.com | ana@autopartesmartinez.com | Al día (5d) |
| Tienda Libre | **ENTERPRISE** | test@test.com | — | Sin pago |
| Jimenez Sanitarios | **PRO** | jimenezirazabal.s.a@gmail.com | Lucas Sosa (USER) | Sin pago |
| EB Accesorios | **BASIC** | admin@ebaccesorios.com | sofia@ebaccesorios.com | Sin pago |
| Ortopedia Paula Fernandez | **Sin plan** | paula@ortopedia.com | Susana Terren (USER) | Sin pago |

### Credenciales de acceso

| Negocio | Rol | Nombre | Email | Contraseña |
|---------|-----|--------|-------|------------|
| Panadería El Trigal | **ADMIN** | Roberto Giménez | roberto@eltrigal.com | `roberto123` |
| Panadería El Trigal | **USER** | Lucía Giménez | lucia@eltrigal.com | `lucia123` |
| Librería Progreso | **ADMIN** | Sofía Vega | sofia@libreriaprogreso.com | `sofia123` |
| Librería Progreso | **USER** | Tomás Vega | tomas@libreriaprogreso.com | `tomas123` |
| Carnicería Don Pedro | **ADMIN** | Pedro Quiroga | pedro@donpedro.com | `pedro123` |
| Carnicería Don Pedro | **USER** | Micaela Quiroga | micaela@donpedro.com | `mica123` |
| Los Pibes | **ADMIN** | Martín | martin@lospibes.com | *ver dataset* |
| Los Pibes | **USER** | Marina | — | *ver dataset* |
| Ferretería El Tornillo Feliz | **ADMIN** | Marcela Roldán | marcela@tornillofeliz.com | `marcela123` |
| Ferretería El Tornillo Feliz | **USER** | Carlos Roldán | carlos@tornillofeliz.com | `carlos123` |
| Distribuidora del Sur | **ADMIN** | Laura Méndez | laura@distribuidorasur.com | `laura123` |
| Distribuidora del Sur | **USER** | Jorge Méndez | jorge@distribuidorasur.com | `jorge123` |
| GM | **ADMIN** | Gastón Mariani | gaston@gm.com | `gaston123` |
| GM | **USER** | Lautaro Mariani | lautaro@gm.com | `lautaro123` |
| Autopartes Martínez | **ADMIN** | Diego Martínez | diego@autopartesmartinez.com | `diego123` |
| Autopartes Martínez | **USER** | Ana Martínez | ana@autopartesmartinez.com | `ana123` |
| Tienda Libre | **ADMIN** | — | test@test.com | *ver dataset* |
| Jimenez Sanitarios | **ADMIN** | Jimenez Irazabal S.A. | jimenezirazabal.s.a@gmail.com | *ver dataset* |
| Jimenez Sanitarios | **USER** | Lucas Sosa | — | *ver dataset* |
| EB Accesorios | **ADMIN** | — | admin@ebaccesorios.com | *ver dataset* |
| EB Accesorios | **USER** | Sofía Bustamante | sofia@ebaccesorios.com | `sofia123` |
| Ortopedia Paula Fernandez | **ADMIN** | Paula Fernández | paula@ortopedia.com | *ver dataset* |
| Ortopedia Paula Fernandez | **USER** | Susana Terren | — | *ver dataset* |

> **Nota**: Las credenciales marcadas como "*ver dataset*" se generan con el patrón `{local-part}@host.com` → password: `{local-part}123` (ej: `martin@lospibes.com` → `martin123`).

---

# Parte 1: Superadmin

## 1.1 Dashboard

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.1.1 | Ver dashboard | Ir a `/superadmin/dashboard` | Ver stats: cantidad de clientes, negocios, planes activos |
| 1.1.2 | Navegación sidebar | Click en cada link del sidebar | Cada link lleva a su sección correcta (Clientes, Negocios, Planes, Logs) |
| 1.1.3 | Sidebar colapsable | Hover sobre sidebar en desktop | Sidebar se expande mostrando labels |
| 1.1.4 | Sidebar mobile | Abrir menú hamburguesa en mobile | Drawer se abre con todos los links |
| 1.1.5 | Theme toggle | Click en theme toggle | Cambia entre dark/light mode persistentemente |

## 1.2 ABM Clientes

### 1.2.1 Listar Clientes

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.2.1 | Ver lista de clientes | Ir a `/superadmin/clients` | Tabla con todos los clientes, columnas: Nombre, Slug, Plan, Estado, Productos, Creado |
| 1.2.2 | Paginación | Click en "Siguiente" / "Anterior" | Cambia de página, URL se actualiza con `?page=N` |
| 1.2.3 | Buscar cliente | Escribir en el buscador | Filtra clientes por nombre, slug o email del dueño |
| 1.2.4 | Filtrar por estado | Seleccionar "Activo" / "Moroso" en el filtro | Solo muestra clientes con ese estado |
| 1.2.5 | Contador | Verificar badge en sidebar | Badge de Clientes muestra el total correcto |

### 1.2.2 Crear Cliente

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.2.6 | Crear cliente OK | Click "+ Nuevo Cliente", completar datos, submit | Cliente creado, toast éxito, tabla actualizada |
| 1.2.7 | Auto-generación de slug | Escribir nombre de negocio | Slug se genera automáticamente después de 500ms |
| 1.2.8 | Slug manual | Editar el slug manualmente | Se desactiva auto-generación, respeta slug manual |
| 1.2.9 | Plan default seleccionado | Abrir modal sin seleccionar plan | Se auto-selecciona el plan con `isDefault: true` (BASIC) |
| 1.2.10 | Validación nombre vacío | Submit con nombre vacío | Error: "El nombre debe tener al menos 2 caracteres" |
| 1.2.11 | Validación email inválido | Submit con email mal formado | Error: "Email inválido" |
| 1.2.12 | Validación password corto | Submit con password < 6 caracteres | Error correspondiente |
| 1.2.13 | Validación slug inválido | Slug con mayúsculas o caracteres especiales | Error: "El slug solo puede contener letras minúsculas, números y guiones" |
| 1.2.14 | Slug duplicado | Intentar crear con slug existente | Error del servidor mostrado en el modal |
| 1.2.15 | Cancelar creación | Click en "Cancelar" o fuera del modal | Modal se cierra, formulario se resetea |
| 1.2.16 | Loading state | Submit y esperar | Botón se deshabilita con spinner |

### 1.2.3 Ver Detalle de Cliente

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.2.17 | Ver detalle | Click en un cliente de la lista | Muestra: dueño, negocio, plan, payments, últ. pago |
| 1.2.18 | Breadcrumbs | Navegar desde dashboard → clientes → detalle | Breadcrumbs correctos, clickeables |
| 1.2.19 | Datos del dueño | Ver sección "Datos del dueño" | Nombre, email, rol mostrados |
| 1.2.20 | Datos del negocio | Ver sección "Datos del negocio" | Nombre, slug, plan, estado, fecha creación |

### 1.2.4 Editar Cliente

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.2.21 | Abrir edición | Click "Editar" en detalle | Modal pre-cargado con datos actuales |
| 1.2.22 | Editar nombre del dueño | Cambiar nombre, guardar | Dueño actualizado, toast éxito |
| 1.2.23 | Editar nombre del negocio | Cambiar nombre de negocio, guardar | Negocio actualizado |
| 1.2.24 | Editar slug | Cambiar slug manualmente, guardar | Slug actualizado |
| 1.2.25 | Auto-slug en edición | Cambiar nombre del negocio | Slug se auto-genera desde nuevo nombre (con debounce) |
| 1.2.26 | Cambiar plan | Seleccionar otro plan, guardar | Plan actualizado, features se ajustan al nuevo plan |
| 1.2.27 | Cancelar edición | Click "Cancelar" | Modal se cierra sin cambios |

### 1.2.5 Eliminar Cliente

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.2.28 | Abrir eliminación | Click "Eliminar" en detalle | Se muestra info de productos/órdenes a eliminar |
| 1.2.29 | Confirmar eliminación (saldo cero) | Confirmar eliminación | Cliente eliminado, toast éxito, redirige a lista |
| 1.2.30 | Eliminar con saldo > 0 | Intentar eliminar cliente con saldo | Error: "El cliente tiene saldo pendiente" |
| 1.2.31 | Cancelar eliminación | Click "Cancelar" en AlertDialog | Diálogo se cierra, nada cambia |

## 1.3 ABM Negocios

### 1.3.1 Listar Negocios

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.1 | Ver lista | Ir a `/superadmin/businesses` | Tabla con todos los negocios |
| 1.3.2 | Buscar | Escribir en buscador | Filtra por nombre, slug o email del dueño |
| 1.3.3 | Filtrar por estado | Seleccionar estado en el filtro | Filtra negocios por estado |
| 1.3.4 | Paginación | Navegar páginas | Paginación funciona, URL se actualiza |

### 1.3.2 Crear Negocio

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.5 | Crear negocio OK | Click "+ Nuevo Negocio", completar datos | Negocio + dueño creados, toast éxito |
| 1.3.6 | Plan auto-seleccionado | Abrir modal | Plan default seleccionado de la DB |
| 1.3.7 | Validaciones | Campos inválidos | Mismos errores que creación de cliente |
| 1.3.8 | Slug duplicado | Slug existente | Error en modal |

### 1.3.3 Editar Negocio

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.9 | Abrir edición | Click ícono lápiz en fila | Modal con datos pre-cargados |
| 1.3.10 | Editar nombre/slug | Cambiar, guardar | Negocio actualizado, toast |
| 1.3.11 | Cancelar | Click Cancelar | Sin cambios |

### 1.3.4 Eliminar Negocio

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.12 | Abrir eliminación | Click ícono papelera | Muestra advertencia con conteo de productos/órdenes |
| 1.3.13 | Confirmar eliminación | Confirmar | Negocio eliminado, toast |
| 1.3.14 | Cancelar | Cancelar | Nada cambia |

### 1.3.5 Configuración ARCA

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.15 | Ver configuración ARCA | Click ícono FileText en fila | Formulario ARCA del negocio |
| 1.3.16 | Editar datos ARCA | Modificar CUIT, condición IVA, etc. | Datos guardados |

### 1.3.6 Features

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.3.17 | Ver features | Click ícono Settings en fila | Sección de features del negocio |
| 1.3.18 | Presets dinámicos | Ver tarjetas de planes | Se cargan desde PlanDefinition en DB |
| 1.3.19 | Seleccionar preset | Click en tarjeta de plan | Features y límites se actualizan al preset |

(Ver sección **1.6 Features** para más casos)

## 1.4 Catálogo de Planes

### 1.4.1 Listar Planes

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.4.1 | Ver planes | Ir a `/superadmin/plans` | Tabla con todos los planes: nombre, descripción, precio, features, límites, estado |
| 1.4.2 | Buscar plan | Escribir en buscador | Filtra por nombre o descripción |
| 1.4.3 | Filtrar por estado | Seleccionar Activos/Inactivos/Todos | Filtra correctamente |
| 1.4.4 | Empty state (sin filtros) | Sin planes registrados y sin filtros | Mensaje "No hay planes registrados" + botón "Crear primer plan" |
| 1.4.5 | Empty state (con filtros) | Filtrar sin resultados | Mensaje "No se encontraron planes con esos filtros" (sin botón crear) |

### 1.4.2 Crear Plan

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.4.6 | Crear plan completo | Completar todos los campos | Plan creado, toast, tabla actualizada |
| 1.4.7 | Validación nombre vacío | Submit sin nombre | Error |
| 1.4.8 | Precio negativo | Submit con precio negativo | Error de validación |
| 1.4.9 | Nombre duplicado | Crear plan con nombre existente | Error del servidor |
| 1.4.10 | Feature toggles | Activar/desactivar cada feature | Se guardan correctamente |
| 1.4.11 | Plan default | Marcar como default | Se guarda, se auto-selecciona en UIs de creación |

### 1.4.3 Editar Plan

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.4.12 | Editar plan | Click lápiz, modificar datos | Plan actualizado, toast |
| 1.4.13 | Cambiar precio | Modificar precio | Se refleja en selects de creación |
| 1.4.14 | Desactivar plan | Setear isActive = false | Plan desaparece de selects (a menos que se pida getPlans(true)) |
| 1.4.15 | Cancelar edición | Cancelar | Sin cambios |

### 1.4.4 Eliminar Plan

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.4.16 | Eliminar plan sin asignaciones | Click papelera, confirmar | Plan eliminado, toast |
| 1.4.17 | Eliminar plan asignado | Intentar eliminar plan que usan negocios | Error: no se puede eliminar, plan en uso |
| 1.4.18 | Cancelar eliminación | Cancelar | Nada cambia |

## 1.5 Logs de Superadmin

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.5.1 | Ver logs | Ir a `/superadmin/logs` | Tabla con logs paginados (50 por página) |
| 1.5.2 | Columnas | Ver tabla | Fecha/Hora, Admin ID, Acción (badge color), Target, Detalles |
| 1.5.3 | Badge por tipo de acción | Ver diferentes acciones | create_* / register_* → verde; update_* / change_* → azul; delete_* → rojo |
| 1.5.4 | Filtrar por acción | Seleccionar acción en el select | Solo logs de esa acción |
| 1.5.5 | Filtrar por fecha desde | Seleccionar fecha "Desde" | Logs desde esa fecha |
| 1.5.6 | Filtrar por fecha hasta | Seleccionar fecha "Hasta" | Logs hasta esa fecha |
| 1.5.7 | Filtros combinados | Acción + rango de fechas | Filtros funcionan en conjunto |
| 1.5.8 | Limpiar filtros | Click "Limpiar filtros" | Todos los filtros se resetean |
| 1.5.9 | Ver detalles | Click "Ver detalles" | Modal con JSON formateado del detalle |
| 1.5.10 | Paginación | Navegar páginas | Paginación funciona |
| 1.5.11 | Empty state | Filtrar sin resultados | Mensaje acorde |
| 1.5.12 | Verificar logging | Realizar acción (crear cliente, etc.) | Aparece en logs automáticamente |

### Acciones logueadas

| # | Acción | Gatillo |
|---|---|---|
| 1.5.13 | `create_client` | Crear cliente |
| 1.5.14 | `update_client` | Editar cliente |
| 1.5.15 | `delete_client` | Eliminar cliente |
| 1.5.16 | `create_business` | Crear negocio |
| 1.5.17 | `update_business` | Editar negocio |
| 1.5.18 | `delete_business` | Eliminar negocio |
| 1.5.19 | `register_payment` | Registrar pago |
| 1.5.20 | `change_client_plan` | Cambiar plan de un cliente |
| 1.5.21 | `create_plan` | Crear plan en catálogo |
| 1.5.22 | `update_plan` | Editar plan |
| 1.5.23 | `delete_plan` | Eliminar plan |
| 1.5.24 | `update_features` | Actualizar features de un negocio |

## 1.6 Features por Negocio

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.6.1 | Ver features actuales | Ir a features de un negocio | Formulario con valores actuales del plan |
| 1.6.2 | Presets cargados desde DB | Ver tarjetas de planes | Coinciden con PlanDefinition (nombres, precios, features) |
| 1.6.3 | Seleccionar preset BASIC | Click en BASIC | Formulario se llena con valores BASIC |
| 1.6.4 | Seleccionar preset PRO | Click en PRO | Formulario se llena con valores PRO (facturación, catálogo) |
| 1.6.5 | Seleccionar preset ENTERPRISE | Click en ENTERPRISE | Formulario se llena con todas las features activas |
| 1.6.6 | Custom override | Modificar un feature manualmente | Se marca como "Custom", se habilita guardar |
| 1.6.7 | Guardar cambios | Click guardar con cambios | Features actualizadas, toast éxito, log creado |
| 1.6.8 | Guardar sin cambios | Click guardar sin modificar | No hay cambios que guardar o toast "sin cambios" |
| 1.6.9 | Loading state mientras carga | Pagina con datos reales | Spinner mientras se cargan planes desde DB |

## 1.7 Pagos

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 1.7.1 | Registrar pago al día | En detalle de cliente, registrar pago | Pago registrado, balance actualizado, log creado |
| 1.7.2 | Diferentes métodos de pago | EFECTIVO / TRANSFERENCIA / MERCADOPAGO / OTRO | Se guarda correctamente |
| 1.7.3 | Ver historial de pagos | En detalle de cliente | Tabla de pagos registrados |

---

# Parte 2: Usuario SaaS — Validación de Planes

> **Importante**: Para cada caso, loguearse como el ADMIN o USER del negocio correspondiente.

## 2.1 Plan BASIC

Usar: **Panadería El Trigal** (roberto@eltrigal.com / roberto123) o **Librería Progreso** (sofia@libreriaprogreso.com / sofia123)

### 2.1.1 Límite de Usuarios

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.1.1 | Ver usuarios actuales | Ir a configuración de usuarios | Debe mostrar 1 usuario ADMIN + 1 USER = dentro del límite (maxUsers: 1, pero existe 2) |
| 2.1.2 | Agregar usuario extra | Intentar crear un 3er usuario | Debería estar bloqueado o mostrar error de límite |
| 2.1.3 | Verificar maxUsers en UI | Ver sección de usuarios | Debe mostrar el límite (1) |
| 2.1.4 | Agregar usuario por superadmin | Desde superadmin agregar usuario a negocio BASIC | Validar si superadmin puede exceder el límite |

### 2.1.2 Límite de Productos

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.1.5 | Ver productos actuales | Ir a productos | Panadería: 8 productos (dentro del límite de 100) |
| 2.1.6 | Agregar producto hasta límite | Agregar productos hasta llegar a 100 | OK hasta 100, error al intentar el 101 |
| 2.1.7 | Ver indicador de uso | UI de productos | Barra o indicador mostrando uso vs límite |

### 2.1.3 Features Bloqueadas (BASIC)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.1.8 | Facturación ARCA | Ir a facturación electrónica | Bloqueado / oculto / mensaje "requiere plan PRO" |
| 2.1.9 | Catálogo público web | Ir a configuración de catálogo | Bloqueado |
| 2.1.10 | Cuentas corrientes (Ledger) | Ir a ledger/cuentas corrientes | Bloqueado |
| 2.1.11 | Múltiples cajas | Ir a configuración de cajas | Bloqueado, solo permite 1 caja |
| 2.1.12 | Filtro por proveedor | Ir a sección de proveedores | Característica no disponible |
| 2.1.13 | Presupuestos (Budget) | Ir a sección de presupuestos | Característica no disponible |

### 2.1.4 Features Disponibles (BASIC)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.1.14 | POS / Ventas | Ir al punto de venta | Funciona normalmente |
| 2.1.15 | Gestión de stock | Ir a stock | Funciona normalmente |
| 2.1.16 | Clientes | Ir a clientes | Funciona normalmente |
| 2.1.17 | Proveedores básico | Gestión de proveedores | Funciona (sin filtro avanzado) |

## 2.2 Plan PRO

Usar: **Distribuidora del Sur** (laura@distribuidorasur.com / laura123) o **GM** (gaston@gm.com / gaston123)

### 2.2.1 Límites

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.2.1 | Usuarios (max 5) | Ver/agregar usuarios | Puede tener hasta 5 usuarios |
| 2.2.2 | Productos (max 1000) | Ver productos | Puede tener hasta 1000 productos |
| 2.2.3 | Exceder límite usuarios | Intentar crear 6to usuario | Bloqueado |
| 2.2.4 | Exceder límite productos | Intentar crear producto 1001 | Bloqueado |

### 2.2.2 Features Habilitadas (PRO)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.2.5 | Facturación ARCA | Ir a facturación electrónica | **Habilitado** — puede configurar CUIT, certificados, etc. |
| 2.2.6 | Catálogo público web | Ir a configuración de catálogo | **Habilitado** — puede publicar catálogo |
| 2.2.7 | Emitir factura electrónica | Realizar una venta con factura | Factura electrónica emitida correctamente |

### 2.2.3 Features Bloqueadas (PRO)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.2.8 | Cuentas corrientes (Ledger) | Ir a ledger | Bloqueado (solo ENTERPRISE) |
| 2.2.9 | Múltiples cajas | Configuración de cajas | Bloqueado, solo 1 caja |
| 2.2.10 | Filtro por proveedor | Sección proveedores | Bloqueado |
| 2.2.11 | Presupuestos | Sección presupuestos | Bloqueado |

## 2.3 Plan ENTERPRISE

Usar: **Autopartes Martínez** (diego@autopartesmartinez.com / diego123) o **Tienda Libre** (test@test.com)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.3.1 | Usuarios ilimitados (999) | Ver/agregar usuarios | Puede tener hasta 999 usuarios |
| 2.3.2 | Productos ilimitados (99999) | Ver productos | Puede tener hasta 99999 productos |
| 2.3.3 | Facturación ARCA | Ir a facturación | ✅ Habilitado |
| 2.3.4 | Catálogo público | Ir a catálogo | ✅ Habilitado |
| 2.3.5 | Cuentas corrientes | Ir a ledger | ✅ **Habilitado** (único plan que lo tiene) |
| 2.3.6 | Múltiples cajas | Configuración de cajas | ✅ **Habilitado** — puede crear múltiples cajas |
| 2.3.7 | Filtro por proveedor | Sección proveedores | ✅ **Habilitado** |
| 2.3.8 | Presupuestos | Sección presupuestos | ✅ **Habilitado** |
| 2.3.9 | Todas las features | Verificar cada una | Todas las funcionalidades disponibles |

## 2.4 Edge Cases — Estado de Cuenta

### 2.4.1 Cliente MOROSO

Usar: **Ferretería El Tornillo Feliz** (marcela@tornillofeliz.com / marcela123) — accountStatus: MOROSO, 75d sin pagar

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.4.1 | Login como cliente moroso | Iniciar sesión | Debería mostrar advertencia de cuenta morosa |
| 2.4.2 | Intentar vender | Realizar una venta | Podría estar bloqueado o permitido con advertencia |
| 2.4.3 | Dashboard | Ver dashboard | Indicador de estado moroso visible |
| 2.4.4 | Registrar pago (superadmin) | Superadmin registra pago | Estado cambia a ACTIVO, todas las funciones se restauran |

### 2.4.2 Pago Atrasado (no moroso todavía)

Usar: **Panadería El Trigal** (roberto@eltrigal.com / roberto123) — 35d sin pagar

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.4.5 | Login | Iniciar sesión | Podría mostrar advertencia de pago próximo a vencer |
| 2.4.6 | Operaciones | Realizar ventas | Funciona normalmente (aún no es MOROSO) |

### 2.4.3 Pago Cerca de Vencer

Usar: **Distribuidora del Sur** (laura@distribuidorasur.com / laura123) — 28d sin pagar

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.4.7 | Indicador visual | Dashboard | Debe mostrar que el pago está próximo a vencer |
| 2.4.8 | Renovación | Pagar antes del vencimiento | Último pago se actualiza, indicador desaparece |

### 2.4.4 Sin Pago Registrado

Usar: **Librería Progreso** (sofia@libreriaprogreso.com / sofia123) — sin lastPaymentDate

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.4.9 | Login | Iniciar sesión | Funciona (nunca pagó pero está ACTIVO) |
| 2.4.10 | Funcionalidades | Usar el sistema | Funciona normalmente mientras ACTIVE |

## 2.5 Cambio de Plan (Superadmin)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.5.1 | Upgrade BASIC → PRO | Cambiar Panadería a PRO | Usuario ve nuevas features (facturación, catálogo) |
| 2.5.2 | Upgrade PRO → ENTERPRISE | Cambiar Distribuidora a ENTERPRISE | Usuario gana ledger, multi-caja, presupuestos |
| 2.5.3 | Downgrade PRO → BASIC | Cambiar GM a BASIC | Usuario pierde facturación y catálogo (pero datos persisten) |
| 2.5.4 | Datos persisten tras downgrade | Ver productos, clientes tras downgrade | Datos no se eliminan, solo se ocultan/bloquean funcionalidades |
| 2.5.5 | Custom override | Superadmin activa feature específica fuera del plan | Usuario puede usar esa feature aunque no esté en su plan |

## 2.6 Multi-tenancy

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.6.1 | Aislamiento de datos | Loguearse como negocio A | Solo ve datos de su negocio |
| 2.6.2 | No ver otros negocios | Intentar acceder a URL de otro negocio | Redirige o error 404/403 |
| 2.6.3 | Usuario no-admin | Loguearse como USER | Puede operar caja, ventas, pero no configuraciones administrativas |
| 2.6.4 | Admin ve todo | Loguearse como ADMIN | Ve y administra todas las secciones del negocio |

## 2.7 Usuario no-admin (USER)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 2.7.1 | Login como USER | Loguearse como lucia@eltrigal.com / lucia123 | Acceso al sistema |
| 2.7.2 | Realizar venta | Ir a POS, hacer una venta | Puede vender |
| 2.7.3 | Ver catálogo | Navegar productos | Puede ver productos |
| 2.7.4 | Acceso a configuración | Intentar acceder a config | Bloqueado (solo ADMIN) |
| 2.7.5 | Caja | Abrir/cerrar caja | Puede operar caja |

---

# Parte 3: Pruebas de Integración y Regresión

## 3.1 Servidor (API)

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 3.1.1 | Tests existentes | `npm run test` | 91+ tests pasando |
| 3.1.2 | Lint | `npm run lint` | 0 errores |

## 3.2 Build

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 3.2.1 | Build producción | `npm run build` | Build exitoso sin errores |

## 3.3 Prisma

| # | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| 3.3.1 | Schema válido | `npx prisma validate` | Schema válido |
| 3.3.2 | Cliente generado | `npx prisma generate` | Cliente generado sin errores |

---

# Resumen de Cobertura

| Área | Cantidad casos |
|---|---|
| Superadmin Dashboard | 5 |
| ABM Clientes (crear, listar, detalle, editar, eliminar) | 31 |
| ABM Negocios (crear, listar, editar, eliminar, ARCA) | 19 |
| Catálogo Planes | 18 |
| Logs | 24 |
| Features | 9 |
| Pagos | 3 |
| **Total Superadmin** | **109** |
| Plan BASIC (límites + features) | 17 |
| Plan PRO (límites + features) | 11 |
| Plan ENTERPRISE | 9 |
| Edge cases (moroso, atrasado, etc.) | 10 |
| Cambio de plan | 5 |
| Multi-tenancy | 4 |
| Usuario no-admin | 5 |
| **Total SaaS** | **61** |
| **Total general** | **170** |
