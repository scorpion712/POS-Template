// =============================================================================
// CATALOG TYPES - Shared types for the catalog system
// =============================================================================

// Business types for filter configuration
export enum BusinessType {
  CLOTHING = "clothing",
  FERRETERIA = "ferreteria",
  TECH = "tech",
  GENERAL = "general",
}

// Filter types supported
export type FilterType = "category" | "brand" | "checkbox" | "checkbox-list" | "range" | "search" | "custom";

export type SortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "newest";

export type SortLabel = {
  value: SortOption;
  label: string;
  orderBy?: "salePrice" | "description" | "createdAt";
  order?: "asc" | "desc";
};

export const SORT_OPTIONS: SortLabel[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "price-asc", label: "Precio: menor a mayor", orderBy: "salePrice", order: "asc" },
  { value: "price-desc", label: "Precio: mayor a menor", orderBy: "salePrice", order: "desc" },
  { value: "name-asc", label: "Nombre: A-Z", orderBy: "description", order: "asc" },
  { value: "name-desc", label: "Nombre: Z-A", orderBy: "description", order: "desc" },
  { value: "newest", label: "Más recientes", orderBy: "createdAt", order: "desc" },
];

// Filter configuration for a single filter group
export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  multiSelect?: boolean;
  options?: string[]; // For custom filters like sizes, colors, voltages
  min?: number; // For range filters
  max?: number; // For range filters
  step?: number; // For range filters
}

// Filter state for active filters
export interface FilterState {
  search: string;
  category: string[];
  brand: string[];
  "price-min": number | null;
  "price-max": number | null;
  sort: SortOption;
  [key: string]: string | string[] | number | null | SortOption; // Custom filters
}

// Filter value with count for display
export interface FilterValue {
  value: string;
  label: string;
  count: number;
  checked: boolean;
}

// Complete filter group for display
export interface FilterGroup {
  id: string;
  label: string;
  type: FilterType;
  multiSelect: boolean;
  values: FilterValue[];
  isOpen?: boolean;
}

// Public product type (from catalog actions)
export interface PublicProduct {
  id: string;
  code: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  subCategory?: string | null;
  salePrice: number;
  unit: string | null;
  image: string | null;
  amount: number;
}

// Product with variants for the card
export interface ProductWithVariants extends PublicProduct {
  colors?: string[];
  sizes?: string[];
  originalPrice?: number; // For showing sale discount
  isNew?: boolean;
  isOnSale?: boolean;
  discountPercentage?: number;
}

// Business info for the catalog
export interface CatalogBusiness {
  id: string;
  name: string;
  logo: string | null;
  businessType: BusinessType;
}

// Cart item
export interface CartItem {
  id: string;
  productId: string;
  description: string;
  brand: string;
  salePrice: number;
  unit: string;
  image: string | null;
  amount: number;
}

// Cart state
export interface CartState {
  products: CartItem[];
  total: number;
  itemCount: number;
}

// Catalog context type
export interface CatalogContextType {
  // Products
  products: PublicProduct[];
  filteredProducts: PublicProduct[];
  isLoading: boolean;
  
  // Filters
  filterState: FilterState;
  filterGroups: FilterGroup[];
  activeFilterCount: number;
  
  // Sorting
  sortOption: SortOption;
  
  // Business
  business: CatalogBusiness | null;
  
  // Actions
  setSearch: (search: string) => void;
  toggleFilter: (groupId: string, value: string) => void;
  setRangeFilter: (groupId: string, min: number | null, max: number | null) => void;
  clearFilters: () => void;
  clearFilter: (groupId: string) => void;
  setSort: (sort: SortOption) => void;
  
  // URL
  getShareableUrl: () => string;
}

// Breakpoint types
export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface ResponsiveConfig {
  breakpoint: Breakpoint;
  columns: number;
  sidebarWidth: number;
}

export const RESPONSIVE_CONFIGS: Record<Breakpoint, ResponsiveConfig> = {
  mobile: {
    breakpoint: "mobile",
    columns: 2,
    sidebarWidth: 0,
  },
  tablet: {
    breakpoint: "tablet",
    columns: 3,
    sidebarWidth: 200,
  },
  desktop: {
    breakpoint: "desktop",
    columns: 4,
    sidebarWidth: 240,
  },
};

// Product card variants
export interface ProductCardProps {
  product: PublicProduct;
  businessType?: BusinessType;
  onAddToCart: (product: PublicProduct, quantity: number) => void;
  onViewDetails?: (product: PublicProduct) => void;
}

export interface ProductCardSkeletonProps {
  variant?: "default" | "compact";
}

// Color options for clothing business type
export const CLOTHING_COLORS = [
  { value: "negro", label: "Negro", hex: "#000000" },
  { value: "blanco", label: "Blanco", hex: "#FFFFFF" },
  { value: "gris", label: "Gris", hex: "#9CA3AF" },
  { value: "azul", label: "Azul", hex: "#3B82F6" },
  { value: "rojo", label: "Rojo", hex: "#EF4444" },
  { value: "verde", label: "Verde", hex: "#22C55E" },
  { value: "amarillo", label: "Amarillo", hex: "#EAB308" },
  { value: "naranja", label: "Naranja", hex: "#F97316" },
  { value: "morado", label: "Morado", hex: "#A855F7" },
  { value: "rosa", label: "Rosa", hex: "#EC4899" },
  { value: "marron", label: "Marrón", hex: "#92400E" },
  { value: "beige", label: "Beige", hex: "#D4D4D8" },
] as const;

// Size options for clothing business type
export const CLOTHING_SIZES = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
] as const;

// Voltage options for ferreteria business type
export const FERRETERIA_VOLTAGES = [
  "12V",
  "24V",
  "110V",
  "220V",
  "380V",
] as const;

// Warranty options for tech business type
export const TECH_WARRANTIES = [
  "3 meses",
  "6 meses",
  "1 año",
  "2 años",
  "3 años",
] as const;