// =============================================================================
// URL SERIALIZER - URL serialization/deserialization for catalog filters
// =============================================================================

import { FilterState, SortOption } from "../types/catalog";

// Default filter state
export const DEFAULT_URL_PARAMS: FilterState = {
  search: "",
  category: [],
  brand: [],
  "price-min": null,
  "price-max": null,
  sort: "relevance",
};

// Serialize filter state to URLSearchParams
export function serializeFiltersToUrl(filterState: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  // Search
  if (filterState.search) {
    params.set("search", filterState.search);
  }

  // Category (comma-separated for multiple)
  if (filterState.category.length > 0) {
    params.set("category", filterState.category.join(","));
  }

  // Brand (comma-separated)
  if (filterState.brand.length > 0) {
    params.set("brand", filterState.brand.join(","));
  }

  // Price range
  if (filterState["price-min"] !== null) {
    params.set("price-min", String(filterState["price-min"]));
  }
  if (filterState["price-max"] !== null) {
    params.set("price-max", String(filterState["price-max"]));
  }

  // Sort (only if not default)
  if (filterState.sort !== "relevance") {
    params.set("sort", filterState.sort);
  }

  return params;
}

// Deserialize URLSearchParams to filter state
export function deserializeFiltersFromUrl(
  params: URLSearchParams,
  customFilters?: Record<string, string[]>
): FilterState {
  // Parse category
  const categoryParam = params.get("category");
  const category = categoryParam ? categoryParam.split(",").filter(Boolean) : [];

  // Parse brand
  const brandParam = params.get("brand");
  const brand = brandParam ? brandParam.split(",").filter(Boolean) : [];

  // Parse price range
  const priceMin = params.get("price-min");
  const priceMax = params.get("price-max");

  // Parse sort
  const sortParam = params.get("sort") as SortOption | null;
  const sort: SortOption =
    sortParam && isValidSortOption(sortParam) ? sortParam : "relevance";

  // Build base state
  const filterState: FilterState = {
    search: params.get("search") || "",
    category,
    brand,
    "price-min": priceMin ? Number(priceMin) : null,
    "price-max": priceMax ? Number(priceMax) : null,
    sort,
  };

  // Add custom filters
  if (customFilters) {
    for (const [key, values] of Object.entries(customFilters)) {
      if (Array.isArray(values)) {
        filterState[key] = values;
      } else {
        filterState[key] = [values];
      }
    }
  }

  return filterState;
}

// Validate sort option
function isValidSortOption(value: string): value is SortOption {
  return [
    "relevance",
    "price-asc",
    "price-desc",
    "name-asc",
    "name-desc",
    "newest",
  ].includes(value);
}

// Build shareable URL with current filters
export function buildShareableUrl(
  baseUrl: string,
  filterState: FilterState
): string {
  const params = serializeFiltersToUrl(filterState);
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// Get filter summary for display (e.g., "5 filtros activos")
export function getFilterSummary(filterState: FilterState): string {
  let count = 0;

  if (filterState.search) count++;
  if (filterState.category.length > 0) count++;
  if (filterState.brand.length > 0) count++;
  if (filterState["price-min"] !== null || filterState["price-max"] !== null) count++;

  // Count custom filters (excluding known keys)
  const knownKeys = ["search", "category", "brand", "price-min", "price-max", "sort", "sort"];
  for (const key of Object.keys(filterState)) {
    if (knownKeys.includes(key)) continue;
    const value = filterState[key];
    if (Array.isArray(value) && value.length > 0) {
      count++;
    }
  }

  return count > 0 ? `${count} filtro${count > 1 ? "s" : ""} activo${count > 1 ? "s" : ""}` : "Sin filtros";
}

// Get readable label for a filter value
export function getFilterLabel(filterId: string, value: string): string {
  // Capitalize first letter
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// Get active filter chips for display
export function getActiveFilterChips(
  filterState: FilterState,
  customFilterLabels?: Record<string, string>
): Array<{ id: string; value: string; label: string }> {
  const chips: Array<{ id: string; value: string; label: string }> = [];

  if (filterState.search) {
    chips.push({
      id: "search",
      value: filterState.search,
      label: `Búsqueda: "${filterState.search}"`,
    });
  }

  if (filterState.category.length > 0) {
    const label = customFilterLabels?.category ?? "Categoría";
    chips.push({
      id: "category",
      value: filterState.category.join(","),
      label: `${label}: ${filterState.category.join(", ")}`,
    });
  }

  if (filterState.brand.length > 0) {
    const label = customFilterLabels?.brand ?? "Marca";
    chips.push({
      id: "brand",
      value: filterState.brand.join(","),
      label: `${label}: ${filterState.brand.join(", ")}`,
    });
  }

  if (filterState["price-min"] !== null || filterState["price-max"] !== null) {
    const min = filterState["price-min"] ?? 0;
    const max = filterState["price-max"] ?? "∞";
    chips.push({
      id: "price",
      value: `${min}-${max}`,
      label: `Precio: $${min} - $${max}`,
    });
  }

  // Custom filters
  const knownKeys = ["search", "category", "brand", "price-min", "price-max", "sort"];
  for (const key of Object.keys(filterState)) {
    if (knownKeys.includes(key)) continue;
    const value = filterState[key];
    if (Array.isArray(value) && value.length > 0) {
      const filterLabel = customFilterLabels?.[key] ?? getFilterLabel(key, value[0]);
      chips.push({
        id: key,
        value: value.join(","),
        label: `${filterLabel}: ${value.join(", ")}`,
      });
    }
  }

  return chips;
}