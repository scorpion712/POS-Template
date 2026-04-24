// =============================================================================
// FILTER CONFIG - Filter configuration per business type
// =============================================================================

import { BusinessType, FilterConfig } from "../types/catalog";

export type BusinessFilterConfig = Record<BusinessType, FilterConfig[]>;

export const BUSINESS_FILTER_CONFIG: BusinessFilterConfig = {
  [BusinessType.CLOTHING]: [
    {
      id: "category",
      label: "Categoría",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "brand",
      label: "Marca",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "size",
      label: "Talle",
      type: "checkbox",
      multiSelect: true,
      options: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"],
    },
    {
      id: "color",
      label: "Color",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "price",
      label: "Precio",
      type: "range",
    },
  ],

  [BusinessType.FERRETERIA]: [
    {
      id: "category",
      label: "Categoría",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "brand",
      label: "Marca",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "voltage",
      label: "Voltaje",
      type: "checkbox",
      multiSelect: true,
      options: ["12V", "24V", "110V", "220V", "380V"],
    },
    {
      id: "power",
      label: "Potencia",
      type: "search",
      multiSelect: false,
    },
    {
      id: "price",
      label: "Precio",
      type: "range",
    },
  ],

  [BusinessType.TECH]: [
    {
      id: "category",
      label: "Categoría",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "brand",
      label: "Marca",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "warranty",
      label: "Garantía",
      type: "checkbox",
      multiSelect: true,
      options: ["3 meses", "6 meses", "1 año", "2 años", "3 años"],
    },
    {
      id: "price",
      label: "Precio",
      type: "range",
    },
  ],

  [BusinessType.GENERAL]: [
    {
      id: "category",
      label: "Categoría",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "brand",
      label: "Marca",
      type: "checkbox-list",
      multiSelect: true,
    },
    {
      id: "price",
      label: "Precio",
      type: "range",
    },
  ],
};

// Helper function to get filter config for a business type
export function getFilterConfig(businessType: BusinessType): FilterConfig[] {
  return BUSINESS_FILTER_CONFIG[businessType] ?? BUSINESS_FILTER_CONFIG[BusinessType.GENERAL];
}

// Helper function to get filter config by ID
export function getFilterById(
  businessType: BusinessType,
  filterId: string
): FilterConfig | undefined {
  const config = getFilterConfig(businessType);
  return config.find((f) => f.id === filterId);
}

// Get all custom filter IDs (excluding standard ones)
export function getCustomFilterIds(businessType: BusinessType): string[] {
  const config = getFilterConfig(businessType);
  return config
    .filter((f) => !["category", "brand", "price"].includes(f.id))
    .map((f) => f.id);
}

// Get default filter state
export function getDefaultFilterState() {
  return {
    search: "",
    category: [] as string[],
    brand: [] as string[],
    "price-min": null as number | null,
    "price-max": null as number | null,
    sort: "relevance" as const,
  };
}