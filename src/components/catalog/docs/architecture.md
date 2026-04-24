# Catálogo de Componentes - Documentación de Arquitectura

## Visión General

El módulo de catálogo es un sistema de comercio electrónico modular y configurable para visualizar y gestionar productos. Fue diseñado con principios de **componentización basada en características** (feature-based) para maximizar la mantenibilidad y escalabilidad.

## Estructura de Archivos

```
src/components/catalog/
├── CatalogPage/        # Página principal del catálogo
│   ├── index.tsx      # Componente orquestador
│   ├── Header.tsx     # Barra de búsqueda, orden y filtros
│   └── ProductGrid.tsx # Grilla de productos con scroll infinito
├── ProductCard/        # Tarjeta de producto individual
│   ├── index.tsx      # Componente principal
│   ├── image.tsx      # Imagen del producto
│   ├── price.tsx      # Display de precio
│   ├── badge.tsx      # Badges (novedad, oferta, etc)
│   └── info.tsx       # Información del producto
├── Filters/           # Sistema de filtros
│   ├── sidebar.tsx   # Filtros escritorio
│   ├── drawer.tsx   # Filtros móvil (bottom sheet)
│   ├── group.tsx     # Grupo de filtros
│   ├── checkbox.tsx # Checkbox de filtro
│   ├── chip.tsx     # Chip de filtro
│   └── active-bar.tsx # Filtros activos
├── Search/            # Búsqueda y orden
│   ├── input.tsx     # Input de búsqueda
│   └── sort-dropdown.tsx # Ordenamiento
├── Cart/              # Carrito de compras
│   ├── index.tsx     # Sheet del carrito
│   └── checkout-form.tsx # Formulario de checkout
├── context/           # React Contexts
│   ├── catalog-context.tsx  # Estado del catálogo
│   └── CartProvider.tsx      # Estado del carrito
├── types/             # Tipos TypeScript
└── utils/             # Utilidades
```

## Patrón de Diseño

### 1. Componentización por Característica

Cada carpeta representa una **característica** del dominio:
- `ProductCard` = cómo se muestra un producto
- `Filters` = cómo se filtran productos
- `Search` = cómo se busca y ordena
- `Cart` = cómo se gestiona el carrito

**Beneficio**: Acoplamiento bajo, coherencia alta. Cada característica es independiente.

### 2. Contratos de Componentes

Los componentes se comunican через **props** y **callbacks**:

```typescript
// Ejemplo: ProductCard
interface ProductCardProps {
  product: PublicProduct;
  onAddToCart: (product: PublicProduct, quantity: number) => void;
  onViewDetails?: (product: PublicProduct) => void;
}
```

### 3. Contextos para Estado Compartido

- `CatalogProvider`: Productos, filtros activos, búsqueda
- `CartProvider`: Carrito de compras

## Personalización

### Cómo Cambiar los Filtros

Los filtros se configuran en el `catalog-context.tsx`. Para modificar qué filtros aparecen:

```typescript
// En context/catalog-context.tsx

// 1. Definir grupos de filtros
const filterGroups: FilterGroup[] = [
  {
    id: "category",      // ID único
    label: "Categoría", // Nombre visible
    type: "checkbox",  // Tipo de filtro
    values: [...]      // Opciones disponibles
  },
  {
    id: "brand",
    label: "Marca",
    type: "checkbox",
    values: [...]
  },
  {
    id: "price-range",
    label: "Rango de Precio",
    type: "range",    // Filtro de rango
    min: 0,
    max: 10000
  }
];
```

**Agregar un nuevo filtro**:

1. Definir el tipo en `types/catalog.ts`:
```typescript
export type FilterType = "checkbox" | "range" | "color" | "size";
```

2. Agregar el grupo en la configuración:
```typescript
const FILTER_GROUPS: FilterGroup[] = [
  // ... filtros existentes
  {
    id: "talle",
    label: "Talle",
    type: "checkbox",
    values: [
      { value: "s", label: "S", count: 10 },
      { value: "m", label: "M", count: 25 },
      { value: "l", label: "L", count: 15 },
    ]
  }
];
```

### Cómo Cambiar la Visualización de Productos

#### Opción 1: Modificar ProductCard directamente

Editar `ProductCard/index.tsx` para cambiar:
- Layout de la tarjeta
- Información mostrada
- Comportamiento de agregar al carrito

```typescript
// ProductCard/index.tsx - Personalizaciones comunes:

// 1. Cambiar tamaño de imagen
<div className="aspect-square"> {/* aspect-portrait, aspect-[3/4], etc */}

// 2. Ocultar/Mostrar elementos
{showBadge && <ProductBadge ... />}  // Condicional
{product.description && <p>{product.description}</p>}

// 3. Cambiar comportamiento de agregar
const handleAddToCart = () => {
  // Lógica personalizada antes de agregar
  if (requiresSize && !selectedSize) {
    showError("Selecciona un talle");
    return;
  }
  onAddToCart(product, quantity);
};
```

#### Opcion 2: Crear variante de ProductCard

```typescript
// ProductCard/VariantCard.tsx
export function VariantProductCard({ product, ...props }) {
  // Variante con selector de tamaño integrado
  return (
    <Card>
      <ProductImage src={product.image} />
      <SizeSelector sizes={product.sizes} />
      <ProductInfo product={product} />
      <QuantitySelector />
    </Card>
  );
}
```

#### Opción 3: Modificar ProductGrid

Cambiar cómo se renderizan los productos en grid:

```typescript
// CatalogPage/ProductGrid.tsx

// 1. Cambiar número de columnas
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
//                                                ^^^ cambiar aquí

// 2. Usar VirtualGrid para mejor rendimiento
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualProductGrid({ products }) {
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(products.length / 4),
    getScrollElement: () => document.body,
    estimateSize: () => 400,
  });

  return (
    <div style={{ height: '100vh' }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => (
        <div className="grid grid-cols-4">
          {products.slice(virtualRow.index * 4, virtualRow.index * 4 + 4)}
        </div>
      ))}
    </div>
  );
}
```

### Cómo Agregar Nuevos Tipos de Badge

```typescript
// ProductCard/badge.tsx

const BADGE_CONFIG = {
  new: { label: "NUEVO", className: "bg-blue-500" },
  sale: { label: "OFERTA", className: "bg-red-500" },
  // Agregar nuevo:
  bestseller: { label: "BEST SELLER", className: "bg-yellow-500" },
  exclusive: { label: "EXCLUSIVO", className: "bg-purple-500" },
};
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                     Page.tsx                              │
│  (BusinessPage)                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  CatalogProvider   │
        │  (productos,       │
        │   filtros)         │
        └────────┬───────────┘
                 │
    ┌────────────┼────────────���
    │            │            │
┌───▼────┐  ┌──▼─────┐  ┌─▼──────┐
│Header  │  │Filter  │  │Product │
│        │  │Sidebar│  │Grid    │
└────────┘  └──┬─────┘  └────┬──┘
               │         │
          ┌────▼────┐  ┌──▼──────┐
          │Drawer  │  │Product  │
          │(móvil)│  │Card     │
          └───────┘  └─────────┘
                        │
                   ┌────▼────┐
                   │ Cart    │
                   │(sheet) │
                   └────────┘
```

## Configuración de Tipos

Los tipos principales están en `types/catalog.ts`:

```typescript
// Tipo de producto público (para el catálogo)
interface PublicProduct {
  id: string;
  code?: string;
  description?: string;
  brand?: string;
  category?: string;
  salePrice: number;
  price?: number;
  image?: string;
  amount: number;
  unit?: string;
  // ... campos adicionales
}

// Configuración de filtros
interface FilterGroup {
  id: string;
  label: string;
  type: FilterType;
  values: FilterValue[];
}

// Estado de filtros
interface FilterState {
  search: string;
  category?: string;
  brand?: string;
  "price-min"?: number;
  "price-max"?: number;
  sort: SortOption;
  [key: string]: any;
}
```

## Estilos

El proyecto usa **Tailwind CSS** con estas convenciones:

- **Mobile-first**: `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-4`
- **Nombres de clase**: camelCase para componentes, kebab para utilities
- **Colores**: Usa tokens de diseño (`primary`, `secondary`, `destructive`)

```typescript
// Ejemplo de clases responsive
<div className="
  grid grid-cols-1       // móvil: 1 columna
  sm:grid-cols-2        // tablet: 2 columnas
  lg:grid-cols-4        // desktop: 4 columnas
  gap-2                // gap móvil
  sm:gap-3              // gap tablet+
  lg:gap-4              // gap desktop
">
```

## Próximos Pasos Sugeridos

1. **Virtualización**: Implementar `react-virtual` para catálogos grandes (1000+ productos)
2. **Cacheo**: Agregar SWR/React Query para cacheo de productos
3. **Persistencia**: Guardar filtros en URL para compartir enlaces
4. **Analytics**: Trackear eventos de agregar al carrito
5. **Wishlist**: Agregar funcionalidad de favoritos