"use client";

// =============================================================================
// CATALOG CONTEXT - Main context for catalog state management
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  PublicProduct,
  CatalogBusiness,
  FilterState,
  FilterGroup,
  SortOption,
  BusinessType,
} from "../types/catalog";
import { getFilterConfig } from "../utils/filter-config";

interface CatalogContextValue {
  // Products
  products: PublicProduct[];
  filteredProducts: PublicProduct[];
  isLoading: boolean;
  
  // Business
  business: CatalogBusiness | null;
  
  // Filter state
  filterState: FilterState;
  filterGroups: FilterGroup[];
  activeFilterCount: number;
  sortOption: SortOption;
  
  // Actions
  setSearch: (search: string) => void;
  toggleFilter: (groupId: string, value: string) => void;
  setRangeFilter: (groupId: string, min: number | null, max: number | null) => void;
  clearFilters: () => void;
  clearFilterGroup: (groupId: string) => void;
  setSort: (sort: SortOption) => void;
  
  // Product counts
  productCounts: Record<string, Record<string, number>>;
  
  // Get shareable URL
  getShareableUrl: () => string;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

interface CatalogProviderProps {
  children: ReactNode;
  products: PublicProduct[];
  business: CatalogBusiness | null;
  initialFilters?: Partial<FilterState>;
}

export function CatalogProvider({
  children,
  products,
  business,
  initialFilters,
}: CatalogProviderProps) {
  const [isLoading] = useState(false);
  
  // Determine business type
  const businessType = business?.businessType ?? BusinessType.GENERAL;
  
  // Get filter configuration
  const filterConfig = useMemo(
    () => getFilterConfig(businessType),
    [businessType]
  );
  
  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    search: initialFilters?.search ?? "",
    category: initialFilters?.category ?? [],
    brand: initialFilters?.brand ?? [],
    "price-min": initialFilters?.["price-min"] ?? null,
    "price-max": initialFilters?.["price-max"] ?? null,
    sort: initialFilters?.sort ?? "relevance",
  });
  
  // Sort option
  const sortOption = filterState.sort;
  
  // Extract unique values from products for filter groups
  const filterGroups = useMemo((): FilterGroup[] => {
    // Group products by unique category values
    const categoryCounts: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    
    products.forEach((product) => {
      if (product.category) {
        categoryCounts[product.category] = (categoryCounts[product.category] ?? 0) + 1;
      }
      if (product.brand) {
        brandCounts[product.brand] = (brandCounts[product.brand] ?? 0) + 1;
      }
    });
    
    // Build filter groups based on config
    return filterConfig.map((config) => {
      const values = [];
      
      if (config.id === "category") {
        for (const [value, count] of Object.entries(categoryCounts)) {
          values.push({
            value,
            label: value,
            count,
            checked: filterState.category.includes(value),
          });
        }
      } else if (config.id === "brand") {
        for (const [value, count] of Object.entries(brandCounts)) {
          values.push({
            value,
            label: value,
            count,
            checked: filterState.brand.includes(value),
          });
        }
      } else if (config.options) {
        // Custom options (sizes, colors, voltages, etc.)
        for (const value of config.options) {
          values.push({
            value,
            label: value,
            // Count would need actual product data
            count: 0,
            checked: Array.isArray(filterState[config.id])
              ? (filterState[config.id] as string[]).includes(value)
              : false,
          });
        }
      }
      
      return {
        id: config.id,
        label: config.label,
        type: config.type,
        multiSelect: config.multiSelect ?? true,
        values: values.sort((a, b) => b.count - a.count),
        isOpen: true,
      };
    });
  }, [filterConfig, products, filterState]);
  
  // Product counts per filter group
  const productCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {
      category: {},
      brand: {},
    };
    
    products.forEach((product) => {
      if (product.category) {
        counts.category[product.category] = (counts.category[product.category] ?? 0) + 1;
      }
      if (product.brand) {
        counts.brand[product.brand] = (counts.brand[product.brand] ?? 0) + 1;
      }
    });
    
    return counts;
  }, [products]);
  
  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.search) count++;
    if (filterState.category.length > 0) count++;
    if (filterState.brand.length > 0) count++;
    if (filterState["price-min"] !== null || filterState["price-max"] !== null) {
      count++;
    }
    // Custom filters
    for (const key of Object.keys(filterState)) {
      if (["search", "category", "brand", "price-min", "price-max", "sort"].includes(key)) {
        continue;
      }
      const value = filterState[key];
      if (Array.isArray(value) && value.length > 0) {
        count++;
      }
    }
    return count;
  }, [filterState]);
  
  // Filter products based on current state
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Search filter
    if (filterState.search) {
      const search = filterState.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.description?.toLowerCase().includes(search) ||
          p.code?.toLowerCase().includes(search) ||
          p.brand?.toLowerCase().includes(search) ||
          p.category?.toLowerCase().includes(search)
      );
    }
    
    // Category filter (OR logic within group)
    if (filterState.category.length > 0) {
      result = result.filter(
        (p) => p.category && filterState.category.includes(p.category)
      );
    }
    
    // Brand filter (OR logic within group)
    if (filterState.brand.length > 0) {
      result = result.filter(
        (p) => p.brand && filterState.brand.includes(p.brand)
      );
    }
    
    // Price range filter
    if (filterState["price-min"] !== null) {
      result = result.filter(
        (p) => p.salePrice >= (filterState["price-min"] ?? 0)
      );
    }
    if (filterState["price-max"] !== null) {
      result = result.filter(
        (p) => p.salePrice <= (filterState["price-max"] ?? Infinity)
      );
    }
    
    // Sorting (AND logic between groups - applied last)
    if (filterState.sort && filterState.sort !== "relevance") {
      const sortKey = filterState.sort;
      result.sort((a, b) => {
        switch (sortKey) {
          case "price-asc":
            return a.salePrice - b.salePrice;
          case "price-desc":
            return b.salePrice - a.salePrice;
          case "name-asc":
            return (a.description ?? "").localeCompare(b.description ?? "");
          case "name-desc":
            return (b.description ?? "").localeCompare(a.description ?? "");
          case "newest":
            // For now, just use salePrice as proxy
            return b.salePrice - a.salePrice;
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [products, filterState]);
  
  // Actions
  const setSearch = useCallback((search: string) => {
    setFilterState((prev) => ({ ...prev, search }));
  }, []);
  
  const toggleFilter = useCallback((groupId: string, value: string) => {
    setFilterState((prev) => {
      const current = Array.isArray(prev[groupId]) ? prev[groupId] as string[] : [];
      const isSelected = current.includes(value);
      
      return {
        ...prev,
        [groupId]: isSelected
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }, []);
  
  const setRangeFilter = useCallback(
    (groupId: string, min: number | null, max: number | null) => {
      setFilterState((prev) => ({
        ...prev,
        [`${groupId}-min`]: min,
        [`${groupId}-max`]: max,
      }));
    },
    []
  );
  
  const clearFilters = useCallback(() => {
    setFilterState({
      search: "",
      category: [],
      brand: [],
      "price-min": null,
      "price-max": null,
      sort: "relevance",
    });
  }, []);
  
  const clearFilterGroup = useCallback((groupId: string) => {
    setFilterState((prev) => ({
      ...prev,
      [groupId]: [],
    }));
  }, []);
  
  const setSort = useCallback((sort: SortOption) => {
    setFilterState((prev) => ({ ...prev, sort }));
  }, []);
  
  // Get shareable URL
  const getShareableUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filterState.search) params.set("search", filterState.search);
    if (filterState.category.length > 0) {
      params.set("category", filterState.category.join(","));
    }
    if (filterState.brand.length > 0) {
      params.set("brand", filterState.brand.join(","));
    }
    if (filterState["price-min"] !== null) {
      params.set("price-min", String(filterState["price-min"]));
    }
    if (filterState["price-max"] !== null) {
      params.set("price-max", String(filterState["price-max"]));
    }
    if (filterState.sort !== "relevance") {
      params.set("sort", filterState.sort);
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  }, [filterState]);
  
  const value: CatalogContextValue = {
    products,
    filteredProducts,
    isLoading,
    business,
    filterState,
    filterGroups,
    activeFilterCount,
    sortOption,
    setSearch,
    toggleFilter,
    setRangeFilter,
    clearFilters,
    clearFilterGroup,
    setSort,
    productCounts,
    getShareableUrl,
  };
  
  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within a CatalogProvider");
  }
  return context;
}

export default CatalogProvider;