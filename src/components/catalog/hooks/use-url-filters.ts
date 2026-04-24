"use client";

// =============================================================================
// USE URL FILTERS - URL-based filter persistence hook
// =============================================================================

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterState, SortOption } from "../types/catalog";

interface UseUrlFiltersReturn {
  filterState: FilterState;
  setSearch: (search: string) => void;
  toggleFilter: (groupId: string, value: string) => void;
  clearFilter: (groupId: string) => void;
  clearAll: () => void;
  setSort: (sort: SortOption) => void;
  getShareableUrl: () => string;
}

// Default filter state
const DEFAULT_STATE: FilterState = {
  search: "",
  category: [],
  brand: [],
  "price-min": null,
  "price-max": null,
  sort: "relevance",
};

export function useUrlFilters(): UseUrlFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse filter state from URL
  const filterState = useMemo((): FilterState => {
    const state: FilterState = { ...DEFAULT_STATE };

    // Search
    const search = searchParams.get("search");
    if (search) state.search = search;

    // Category
    const category = searchParams.get("category");
    if (category) state.category = category.split(",").filter(Boolean);

    // Brand
    const brand = searchParams.get("brand");
    if (brand) state.brand = brand.split(",").filter(Boolean);

    // Price range
    const priceMin = searchParams.get("price-min");
    const priceMax = searchParams.get("price-max");
    if (priceMin) state["price-min"] = parseInt(priceMin, 10) || null;
    if (priceMax) state["price-max"] = parseInt(priceMax, 10) || null;

    // Sort
    const sort = searchParams.get("sort") as SortOption;
    if (sort && ["relevance", "price-asc", "price-desc", "name-asc", "name-desc", "newest"].includes(sort)) {
      state.sort = sort;
    }

    return state;
  }, [searchParams]);

  // Build URL from filter state
  const buildUrl = useCallback((state: FilterState): string => {
    const params = new URLSearchParams();

    if (state.search) params.set("search", state.search);
    if (state.category.length > 0) params.set("category", state.category.join(","));
    if (state.brand.length > 0) params.set("brand", state.brand.join(","));
    if (state["price-min"] !== null) params.set("price-min", String(state["price-min"]));
    if (state["price-max"] !== null) params.set("price-max", String(state["price-max"]));
    if (state.sort !== "relevance") params.set("sort", state.sort);

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname]);

  // Update URL
  const updateUrl = useCallback((newState: FilterState) => {
    const url = buildUrl(newState);
    router.push(url, { scroll: false });
  }, [buildUrl, router]);

  // Actions
  const setSearch = useCallback((search: string) => {
    updateUrl({ ...filterState, search });
  }, [filterState, updateUrl]);

  const toggleFilter = useCallback((groupId: string, value: string) => {
    const current = Array.isArray(filterState[groupId])
      ? (filterState[groupId] as string[])
      : [];
    const isSelected = current.includes(value);
    updateUrl({
      ...filterState,
      [groupId]: isSelected
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  }, [filterState, updateUrl]);

  const clearFilter = useCallback((groupId: string) => {
    updateUrl({ ...filterState, [groupId]: [] });
  }, [filterState, updateUrl]);

  const clearAll = useCallback(() => {
    updateUrl(DEFAULT_STATE);
  }, [updateUrl]);

  const setSort = useCallback((sort: SortOption) => {
    updateUrl({ ...filterState, sort });
  }, [filterState, updateUrl]);

  const getShareableUrl = useCallback(() => {
    return buildUrl(filterState);
  }, [buildUrl, filterState]);

  return {
    filterState,
    setSearch,
    toggleFilter,
    clearFilter,
    clearAll,
    setSort,
    getShareableUrl,
  };
}

export default useUrlFilters;